"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/providers/email";
import { getCurrentTenant } from "@/lib/tenant";
import { canAssignRole, canInviteUsers, roleLabel } from "@/lib/permissions";
import { getPlanLimits } from "@/lib/billing/limits";
import { resolveEffectivePlan } from "@/lib/billing/entitlements";
import { resolveOrganizationAccess } from "@/lib/organization-access";
import { logger } from "@/lib/logger";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { isValidAccountPassword } from "@/lib/security/password-policy";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITATION_RESEND_DELAY_MS = 60 * 1000;
const INVITE_ROLES = new Set<Role>([Role.ADMIN, Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA]);

type InvitationAcceptanceErrorKey = "invite.invalid" | "invite.signInRequired" | "invite.wrongAccount";

class InvitationAcceptanceError extends Error {
  constructor(readonly translationKey: InvitationAcceptanceErrorKey) {
    super(translationKey);
    this.name = "InvitationAcceptanceError";
  }
}

class SafeInvitationActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeInvitationActionError";
  }
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function logInvitationFailure(operation: string, error: unknown) {
  logger.error("Invitation operation failed", {
    operation,
    errorKind: error instanceof Prisma.PrismaClientKnownRequestError
      ? "PRISMA_KNOWN_REQUEST"
      : error instanceof Error
        ? "UNEXPECTED_ERROR"
        : "UNKNOWN_ERROR",
    ...(error instanceof Prisma.PrismaClientKnownRequestError ? { prismaCode: error.code } : {}),
  });
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function invalidInvitationState(error: string) {
  return { error, success: "", emailSent: false, inviteUrl: "" };
}

function formatInviteEmail(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

export async function getOrganizationInvitationInfo(rawToken: string, languageValue: string) {
  const token = typeof rawToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(rawToken) ? rawToken : "";
  if (!token) return { status: "invalid" as const };

  try {
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      include: { organization: { select: { name: true, isActive: true } } },
    });
    if (
      !invitation || invitation.acceptedAt || invitation.revokedAt ||
      invitation.expiresAt <= new Date() || !invitation.organization.isActive
    ) {
      return { status: "invalid" as const };
    }

    const [existingUser, session] = await Promise.all([
      prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } }),
      auth(),
    ]);
    const signedInEmail = session?.user?.email?.trim().toLowerCase();

    return {
      status: "valid" as const,
      organizationName: invitation.organization.name,
      invitedName: invitation.name,
      email: invitation.email,
      role: roleLabel(invitation.role, normalizeLanguage(languageValue)),
      requiresNewAccount: !existingUser,
      viewer: !session
        ? "signed-out" as const
        : signedInEmail === invitation.email
          ? "matching" as const
          : "other" as const,
    };
  } catch (error) {
    logInvitationFailure("lookup", error);
    return { status: "error" as const };
  }
}

export async function inviteUserAction(
  _prevState: { error: string; success: string; emailSent: boolean; inviteUrl: string },
  formData: FormData
) {
  const interfaceLanguage = normalizeLanguage(formData.get("language"));
  let tenant: Awaited<ReturnType<typeof getCurrentTenant>>;
  try {
    tenant = await getCurrentTenant();
  } catch (error) {
    logInvitationFailure("tenant-preflight", error);
    return invalidInvitationState(t(interfaceLanguage, "invite.createFailed"));
  }
  if (!tenant) {
    return invalidInvitationState(t(interfaceLanguage, "invite.noPermission"));
  }

  if (!canInviteUsers(tenant.role)) {
    return invalidInvitationState(t(interfaceLanguage, "invite.noPermission"));
  }

  const name = normalizeName(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const emailLanguage = normalizeLanguage(formData.get("emailLanguage"));
  const rawRole = typeof formData.get("role") === "string"
    ? String(formData.get("role")).trim().toUpperCase()
    : "";
  const role = INVITE_ROLES.has(rawRole as Role) ? rawRole as Role : null;

  if (name.length < 2 || name.length > 100 || !validEmail(email) || !role) {
    return invalidInvitationState(t(interfaceLanguage, "invite.invalidInput"));
  }

  if (!canAssignRole(tenant.role, role)) {
    return invalidInvitationState(t(interfaceLanguage, "invite.roleForbidden"));
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        organizationId: true,
        isActive: true,
        isPlatformAdmin: true,
        memberships: { select: { organizationId: true } },
      },
    });
    if (
      existingUser &&
      ((existingUser.organizationId && existingUser.organizationId !== tenant.organizationId) ||
        existingUser.memberships.some((membership) => membership.organizationId !== tenant.organizationId))
    ) {
      return invalidInvitationState(t(interfaceLanguage, "invite.emailOtherOrganization"));
    }
    if (existingUser?.isPlatformAdmin) {
      return invalidInvitationState(t(interfaceLanguage, "invite.platformAdmin"));
    }
    if (existingUser && !existingUser.isActive) {
      return invalidInvitationState(t(interfaceLanguage, "invite.userInactive"));
    }
    if (existingUser) {
      const membership = existingUser.memberships.find((item) => item.organizationId === tenant.organizationId);
      if (membership) {
        const record = await prisma.membership.findUnique({
          where: { userId_organizationId: { userId: existingUser.id, organizationId: tenant.organizationId } },
          select: { isActive: true },
        });
        if (record?.isActive) return invalidInvitationState(t(interfaceLanguage, "invite.alreadyMember"));
      }
    }
  } catch (error) {
    logInvitationFailure("creation-preflight", error);
    return invalidInvitationState(t(interfaceLanguage, "invite.createFailed"));
  }

  const configuredAppUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  let appBaseUrl: URL;
  try {
    if (!configuredAppUrl && process.env.NODE_ENV === "production") {
      return invalidInvitationState(t(interfaceLanguage, "invite.authUrlMissing"));
    }
    appBaseUrl = new URL(configuredAppUrl || "http://localhost:3000");
    if (process.env.NODE_ENV === "production" && appBaseUrl.protocol !== "https:") {
      return invalidInvitationState(t(interfaceLanguage, "invite.authUrlHttps"));
    }
  } catch {
    return invalidInvitationState(t(interfaceLanguage, "invite.authUrlInvalid"));
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  let invitationResult: "created" | "cooldown";
  try {
    invitationResult = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: tenant.organizationId },
        select: {
          isActive: true,
          plan: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              provider: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
            },
          },
        },
      });
      if (!organization?.isActive) throw new SafeInvitationActionError(t(interfaceLanguage, "invite.organizationInactive"));

      const actor = await tx.user.findUnique({
        where: { id: tenant.userId },
        select: {
          organizationId: true,
          role: true,
          isActive: true,
          memberships: { select: { organizationId: true, role: true, isActive: true } },
        },
      });
      const access = actor?.isActive
        ? resolveOrganizationAccess({ organizationId: actor.organizationId, role: actor.role, memberships: actor.memberships })
        : null;
      if (
        !access || access.organizationId !== tenant.organizationId ||
        !canInviteUsers(access.role) || !canAssignRole(access.role, role)
      ) {
        throw new SafeInvitationActionError(t(interfaceLanguage, "invite.inviterAccessChanged"));
      }

      const currentUser = await tx.user.findUnique({
        where: { email },
        select: { id: true, organizationId: true, isActive: true, isPlatformAdmin: true, memberships: { select: { organizationId: true } } },
      });
      if (
        currentUser?.isPlatformAdmin || (currentUser && !currentUser.isActive) ||
        (currentUser && ((currentUser.organizationId && currentUser.organizationId !== tenant.organizationId) ||
          currentUser.memberships.some((membership) => membership.organizationId !== tenant.organizationId)))
      ) {
        throw new SafeInvitationActionError(t(interfaceLanguage, "invite.emailConflict"));
      }

      const existingMembership = currentUser
        ? await tx.membership.findUnique({
            where: { userId_organizationId: { userId: currentUser.id, organizationId: tenant.organizationId } },
            select: { isActive: true },
          })
        : null;
      if (existingMembership?.isActive) throw new SafeInvitationActionError(t(interfaceLanguage, "invite.alreadyMember"));

      const now = new Date();
      const currentInvitation = await tx.organizationInvitation.findUnique({
        where: { organizationId_email: { organizationId: tenant.organizationId, email } },
        select: { acceptedAt: true, revokedAt: true, expiresAt: true, updatedAt: true },
      });
      const currentInvitationIsPending = currentInvitation &&
        !currentInvitation.acceptedAt &&
        !currentInvitation.revokedAt &&
        currentInvitation.expiresAt > now;
      if (
        currentInvitationIsPending &&
        now.getTime() - currentInvitation.updatedAt.getTime() < INVITATION_RESEND_DELAY_MS
      ) {
        return "cooldown";
      }

      const [activeMemberships, pendingInvitations] = await Promise.all([
        tx.membership.count({ where: { organizationId: tenant.organizationId, isActive: true } }),
        tx.organizationInvitation.count({
          where: {
            organizationId: tenant.organizationId,
            email: { not: email },
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
        }),
      ]);
      const effectivePlan = resolveEffectivePlan(organization.plan, organization.subscription);
      const userLimit = getPlanLimits(effectivePlan).users;
      if (userLimit !== Infinity && activeMemberships + pendingInvitations >= userLimit) {
        throw new SafeInvitationActionError(
          t(interfaceLanguage, "invite.userLimit").replace("{limit}", String(userLimit))
        );
      }

      const invitation = await tx.organizationInvitation.upsert({
        where: { organizationId_email: { organizationId: tenant.organizationId, email } },
        create: {
          organizationId: tenant.organizationId,
          email,
          name,
          role,
          tokenHash,
          expiresAt,
          createdById: tenant.userId,
        },
        update: {
          name,
          role,
          tokenHash,
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          createdById: tenant.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: tenant.userId,
          organizationId: tenant.organizationId,
          action: "USER_INVITATION_CREATED",
          entityType: "OrganizationInvitation",
          entityId: invitation.id,
          details: { email, role, expiresAt: expiresAt.toISOString() },
        },
      });
      return "created";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof SafeInvitationActionError) {
      return invalidInvitationState(error.message);
    }
    logInvitationFailure("creation", error);
    return invalidInvitationState(t(interfaceLanguage, "invite.createFailed"));
  }

  if (invitationResult === "cooldown") {
    return {
      error: "",
      success: t(interfaceLanguage, "invite.resendCooldown"),
      emailSent: false,
      inviteUrl: "",
    };
  }

  const inviteUrl = new URL("/invitations/accept", appBaseUrl);
  inviteUrl.searchParams.set("lang", emailLanguage);
  inviteUrl.hash = new URLSearchParams({ token }).toString();
  const url = inviteUrl.toString();
  let emailSent = false;
  try {
    const emailValues = { name, role: roleLabel(role, emailLanguage), url };
    const emailText = (key: TranslationKey) =>
      formatInviteEmail(t(emailLanguage, key), emailValues);
    const emailResult = await sendTransactionalEmail({
      to: email,
      subject: t(emailLanguage, "invite.emailSubject"),
      body: [
        emailText("invite.emailGreeting"),
        "",
        emailText("invite.emailIntro"),
        emailText("invite.emailExpiry"),
        "",
        emailText("invite.emailAccept"),
        "",
        emailText("invite.emailIgnore"),
      ].join("\n"),
    });
    emailSent = emailResult.success;
  } catch {
    // The invitation is already stored; keep it usable through the manual delivery fallback.
  }
  if (!emailSent) {
    logger.warn("Invitation email delivery failed; manual delivery fallback is available.");
  }

  revalidatePath("/ajustes");
  if (emailSent) {
    return {
      error: "",
      success: formatInviteEmail(t(interfaceLanguage, "invite.sent"), { email }),
      emailSent: true,
      inviteUrl: "",
    };
  }

  return {
    error: "",
    success: formatInviteEmail(t(interfaceLanguage, "invite.manualDelivery"), { email }),
    emailSent: false,
    inviteUrl: url,
  };
}

export async function acceptInvitationAction(
  _prevState: { error: string; accepted?: boolean },
  formData: FormData
) {
  const token = typeof formData.get("token") === "string" ? String(formData.get("token")).trim() : "";
  const language = normalizeLanguage(String(formData.get("language") ?? "es"));
  const fullName = normalizeName(formData.get("fullName"));
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { error: t(language, "invite.invalid") };

  const tokenHash = hashInvitationToken(token);
  const preflight = await (async () => {
    const currentSession = await auth();
    const invite = await prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      include: { organization: { select: { name: true, isActive: true } } },
    });
    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt <= new Date() || !invite.organization.isActive) {
      return { status: "invalid" as const };
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } });
    if (existingUser && (!currentSession?.user?.id || currentSession.user.email?.trim().toLowerCase() !== invite.email)) {
      return { status: "sign-in-required" as const };
    }
    if (!existingUser && (fullName.length < 2 || fullName.length > 100)) {
      return { status: "invalid-name" as const };
    }
    if (!existingUser && !isValidAccountPassword(password)) {
      return { status: "invalid-password" as const };
    }

    return { status: "ready" as const, currentSession, invite };
  })().catch((error: unknown) => {
    logInvitationFailure("acceptance-preflight", error);
    return { status: "error" as const };
  });

  if (preflight.status !== "ready") {
    const errorKey = preflight.status === "sign-in-required"
      ? "invite.signInRequired"
      : preflight.status === "invalid-name"
        ? "invite.namePolicyError"
        : preflight.status === "invalid-password"
          ? "invite.passwordPolicyError"
          : preflight.status === "error"
            ? "invite.acceptFailed"
            : "invite.invalid";
    return { error: t(language, errorKey) };
  }

  const { currentSession, invite } = preflight;

  let createdAccount = false;
  try {
    await prisma.$transaction(async (tx) => {
      const currentInvitation = await tx.organizationInvitation.findUnique({
        where: { tokenHash },
        select: { id: true, email: true, name: true, role: true, organizationId: true, expiresAt: true, acceptedAt: true, revokedAt: true },
      });
      if (!currentInvitation || currentInvitation.acceptedAt || currentInvitation.revokedAt || currentInvitation.expiresAt <= new Date()) {
        throw new InvitationAcceptanceError("invite.invalid");
      }

      let user = await tx.user.findUnique({
        where: { email: currentInvitation.email },
        include: { memberships: { select: { organizationId: true } } },
      });
      const organization = await tx.organization.findUnique({
        where: { id: currentInvitation.organizationId },
        select: { isActive: true },
      });
      if (!organization?.isActive) throw new InvitationAcceptanceError("invite.invalid");
      if (user) {
        if (!currentSession?.user?.id || currentSession.user.id !== user.id || currentSession.user.email?.trim().toLowerCase() !== currentInvitation.email) {
          throw new InvitationAcceptanceError("invite.wrongAccount");
        }
        if (
          !user.isActive || user.isPlatformAdmin ||
          (user.organizationId && user.organizationId !== currentInvitation.organizationId) ||
          user.memberships.some((membership) => membership.organizationId !== currentInvitation.organizationId)
        ) {
          throw new InvitationAcceptanceError("invite.invalid");
        }
      } else {
        if (currentSession?.user?.id) throw new InvitationAcceptanceError("invite.wrongAccount");
        const passwordHash = await bcrypt.hash(password, 12);
        user = await tx.user.create({
          data: {
            email: currentInvitation.email,
            name: fullName,
            passwordHash,
            organizationId: currentInvitation.organizationId,
            role: currentInvitation.role,
            isActive: true,
          },
          include: { memberships: { select: { organizationId: true } } },
        });
        createdAccount = true;
      }

      const membership = await tx.membership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId: currentInvitation.organizationId } },
        select: { id: true },
      });
      if (membership) {
        await tx.membership.update({
          where: { id: membership.id },
          data: { role: currentInvitation.role, isActive: true },
        });
      } else {
        await tx.membership.create({
          data: { userId: user.id, organizationId: currentInvitation.organizationId, role: currentInvitation.role, isActive: true },
        });
      }
      await tx.user.update({
        where: { id: user.id },
        data: {
          organizationId: currentInvitation.organizationId,
          role: currentInvitation.role,
          ...(createdAccount ? { isActive: true } : { name: user.name || currentInvitation.name }),
        },
      });
      await tx.organizationInvitation.update({ where: { id: currentInvitation.id }, data: { acceptedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId: currentInvitation.organizationId,
          action: "USER_INVITATION_ACCEPTED",
          entityType: "OrganizationInvitation",
          entityId: currentInvitation.id,
          details: { email: currentInvitation.email, role: currentInvitation.role },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: t(language, "invite.invalid") };
    }
    if (error instanceof InvitationAcceptanceError) {
      return { error: t(language, error.translationKey) };
    }

    logInvitationFailure("acceptance", error);
    return { error: t(language, "invite.acceptFailed") };
  }

  if (createdAccount) {
    try {
      await signIn("credentials", { email: invite.email, password, redirectTo: "/dashboard" });
    } catch (error) {
      if (isRedirectError(error)) throw error;
      logInvitationFailure("acceptance-sign-in", error);
      return {
        error: t(language, "invite.acceptedSignInFailed"),
        accepted: true,
      };
    }
  }
  revalidatePath("/ajustes");
  redirect("/dashboard");
}
