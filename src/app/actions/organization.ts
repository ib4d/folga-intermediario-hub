"use server";

import { auth, unstable_update } from "@/auth";
import type { Session } from "next-auth";
import { CandidateStatus, LocationStatus, Prisma } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { sendTransactionalEmail } from "@/lib/providers/email";
import { logger } from "@/lib/logger";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { isValidAccountPassword } from "@/lib/security/password-policy";
import { isAllowedAppBaseUrlInProduction } from "@/lib/auth-app-url";

const ORGANIZATION_SIGNUP_TTL_MS = 24 * 60 * 60 * 1000;
const ORGANIZATION_SIGNUP_RESEND_DELAY_MS = 60 * 1000;

type OrganizationCreationErrorKey = "onboarding.error.session" | "onboarding.error.alreadyMember";

class OrganizationCreationError extends Error {
  constructor(readonly translationKey: OrganizationCreationErrorKey) {
    super(translationKey);
    this.name = "OrganizationCreationError";
  }
}

function logOrganizationOnboardingFailure(
  operation: "create" | "verification-info" | "verify",
  error: unknown
) {
  const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
  logger.error("Organization onboarding operation failed", {
    operation,
    errorKind: prismaCode
      ? "PRISMA_KNOWN_REQUEST"
      : error instanceof Error
        ? "UNEXPECTED_ERROR"
        : "UNKNOWN_ERROR",
    ...(prismaCode ? { prismaCode } : {}),
  });
}

function hashOrganizationSignupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function formatOrganizationSignupEmail(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

function slugifyOrganizationName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "organizacion"}-${Math.random().toString(36).slice(2, 6)}`;
}

async function seedDemoWorkspace(
  tx: Prisma.TransactionClient,
  organization: { id: string; slug: string },
  userId: string
) {
  const demoTag = organization.slug.slice(0, 8) || organization.id.slice(0, 8);
  const demoCandidateOne = await tx.candidate.create({
    data: {
      firstName: "Abad",
      lastName: "Bolanos",
      email: `demo-${demoTag}-abad@example.com`,
      phone: "+48123456789",
      country: "Cuba",
      status: CandidateStatus.RECOPILANDO_DOCS,
      intermediaryId: userId,
      organizationId: organization.id,
      locationStatus: LocationStatus.EN_ORIGEN,
      notes: "Candidato de ejemplo del sandbox comercial.",
    },
  });

  const demoCandidateTwo = await tx.candidate.create({
    data: {
      firstName: "Juan",
      lastName: "Perez",
      email: `demo-${demoTag}-juan@example.com`,
      phone: "+48987654321",
      country: "Colombia",
      status: CandidateStatus.EN_REVISION_LEGAL,
      intermediaryId: userId,
      organizationId: organization.id,
      locationStatus: LocationStatus.EN_TRANSITO,
      paid400pln: true,
      paymentDate: new Date(),
      notes: "Caso de ejemplo para el flujo legal y la llegada operativa.",
    },
  });

  const demoCandidateThree = await tx.candidate.create({
    data: {
      firstName: "Marta",
      lastName: "Kowalska",
      email: `demo-${demoTag}-marta@example.com`,
      phone: "+48555111222",
      country: "Poland",
      status: CandidateStatus.APROBADO,
      intermediaryId: userId,
      organizationId: organization.id,
      locationStatus: LocationStatus.EN_POLONIA,
      paid400pln: true,
      paymentDate: new Date(),
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      accommodation: "Hotel demo central",
      accommodationNotes: "Reserva de ejemplo para la presentación comercial.",
      notes: "Caso de ejemplo para demostrar el flujo de logistica y llegada.",
    },
  });

  await tx.statusHistory.create({
    data: {
      candidateId: demoCandidateTwo.id,
      organizationId: organization.id,
      fromStatus: CandidateStatus.RECOPILANDO_DOCS,
      toStatus: CandidateStatus.EN_REVISION_LEGAL,
      changedById: userId,
      reason: "Sandbox de demostracion preparado para revision legal.",
    },
  });

  await tx.statusHistory.create({
    data: {
      candidateId: demoCandidateThree.id,
      organizationId: organization.id,
      fromStatus: CandidateStatus.EN_REVISION_LEGAL,
      toStatus: CandidateStatus.APROBADO,
      changedById: userId,
      reason: "Sandbox de demostracion preparado para la parte operativa.",
    },
  });

  await tx.logisticsEvent.create({
    data: {
      type: "ARRIVAL",
      description: "Llegada demo programada para mostrar el flujo logistico.",
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      organizationId: organization.id,
      candidateId: demoCandidateThree.id,
      transportType: "BUS",
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      terminal: "Demo Terminal",
      flightOrTrain: "D-2026-001",
      pickedUpBy: "Equipo demo",
      confirmed: true,
    },
  });

  await tx.notification.createMany({
    data: [
      {
        userId,
        organizationId: organization.id,
        candidateId: demoCandidateOne.id,
        type: "DOC_REQUIRED",
        title: "Sandbox: documentos pendientes",
        message: "Abad Bolanos necesita subir su pasaporte para continuar la demo.",
      },
      {
        userId,
        organizationId: organization.id,
        candidateId: demoCandidateTwo.id,
        type: "LEGAL_REVIEW_PENDING",
        title: "Sandbox: revision legal pendiente",
        message: "Juan Perez ya puede seguir el recorrido de revision legal en la demo.",
      },
      {
        userId,
        organizationId: organization.id,
        candidateId: demoCandidateThree.id,
        type: "ARRIVAL_TODAY",
        title: "Sandbox: llegada operativa",
        message: "Marta Kowalska tiene una llegada de ejemplo preparada para la parte logistica.",
      },
    ],
  });
}

export async function createOrganizationAction(
  _prevState: { error: string; notice?: string },
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const workspaceMode = formData.get("mode") === "demo" ? "demo" : "standard";
  const language = normalizeLanguage(String(formData.get("language") ?? "es"));
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    logOrganizationOnboardingFailure("create", error);
    return { error: t(language, "onboarding.error.create") };
  }

  if (name.length < 2 || name.length > 120) {
    return { error: t(language, "onboarding.error.organizationName") };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!session && (fullName.length < 2 || fullName.length > 100)) {
    return { error: t(language, "onboarding.error.fullName") };
  }

  if (!session && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: t(language, "onboarding.error.email") };
  }

  const slug = slugifyOrganizationName(name);

  try {
    const currentUser = session
      ? await prisma.user.findFirst({
          // The authenticated user ID is the identity source of truth. An OR
          // lookup could select a different account if a stale session email
          // happens to belong to another user.
          where: session.user?.id
            ? { id: session.user.id }
            : { email: session.user?.email ?? "" },
          select: {
            id: true,
            email: true,
            isPlatformAdmin: true,
            isActive: true,
            organizationId: true,
            memberships: {
              select: { id: true },
            },
          },
        })
      : null;

    if (session && (!currentUser || !currentUser.isActive)) {
      return {
        error: t(language, "onboarding.error.session"),
      };
    }

    if (currentUser && (currentUser.organizationId || currentUser.memberships.length > 0)) {
      return {
        error: t(language, "onboarding.error.alreadyMember"),
      };
    }

    if (currentUser) {
      const result = await prisma.$transaction(async (tx) => {
        const currentState = await tx.user.findUnique({
          where: { id: currentUser.id },
          select: {
            isActive: true,
            organizationId: true,
            memberships: { select: { id: true } },
          },
        });

        if (!currentState?.isActive) {
          throw new OrganizationCreationError("onboarding.error.session");
        }

        if (currentState.organizationId || currentState.memberships.length > 0) {
          throw new OrganizationCreationError("onboarding.error.alreadyMember");
        }

        const organizationId = randomUUID();
        const org = await tx.organization.create({
          data: {
            id: organizationId,
            name,
            slug,
            plan: "FREE",
            isActive: true,
          },
        });

        await tx.membership.create({
          data: {
            organizationId: org.id,
            userId: currentUser.id,
            role: "SUPERADMIN",
            isActive: true,
          },
        });

        await tx.user.update({
          where: { id: currentUser.id },
          data: {
            organizationId: org.id,
            role: "SUPERADMIN",
          },
        });

        if (workspaceMode === "demo") {
          await seedDemoWorkspace(tx, org, currentUser.id);
        }

        return org;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      await unstable_update({
        user: {
          id: currentUser.id,
          organizationId: result.id,
          role: "SUPERADMIN",
          isPlatformAdmin: Boolean(currentUser.isPlatformAdmin),
        },
      });
    } else {
      const now = new Date();
      const configuredAppUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
      let appBaseUrl: URL;
      try {
        if (!configuredAppUrl && process.env.NODE_ENV === "production") {
          return { error: t(language, "onboarding.verifyUrlMissing") };
        }
        appBaseUrl = new URL(configuredAppUrl || "http://localhost:3000");
        if (process.env.NODE_ENV === "production" && !isAllowedAppBaseUrlInProduction(appBaseUrl)) {
          return { error: t(language, "onboarding.verifyUrlHttps") };
        }
      } catch {
        return { error: t(language, "onboarding.verifyUrlInvalid") };
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        await prisma.pendingOrganizationSignup.deleteMany({ where: { email } });
        return { error: "", notice: t(language, "onboarding.verifySentNotice") };
      }

      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashOrganizationSignupToken(token);
      const expiresAt = new Date(now.getTime() + ORGANIZATION_SIGNUP_TTL_MS);
      await prisma.pendingOrganizationSignup.deleteMany({ where: { expiresAt: { lte: now } } });
      const pendingSignup = await prisma.$transaction(async (tx) => {
        const currentSignup = await tx.pendingOrganizationSignup.findUnique({
          where: { email },
          select: { lastSentAt: true },
        });
        if (
          currentSignup?.lastSentAt &&
          now.getTime() - currentSignup.lastSentAt.getTime() < ORGANIZATION_SIGNUP_RESEND_DELAY_MS
        ) {
          return null;
        }

        return tx.pendingOrganizationSignup.upsert({
          where: { email },
          create: {
            email,
            fullName,
            organizationName: name,
            workspaceMode,
            language,
            tokenHash,
            expiresAt,
            lastSentAt: now,
          },
          update: {
            fullName,
            organizationName: name,
            workspaceMode,
            language,
            tokenHash,
            expiresAt,
            lastSentAt: now,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (!pendingSignup) {
        return { error: "", notice: t(language, "onboarding.verifySentNotice") };
      }

      const verifyUrl = new URL("/onboarding/verify", appBaseUrl);
      verifyUrl.searchParams.set("lang", language);
      verifyUrl.hash = new URLSearchParams({ token }).toString();
      const emailValues = { name: fullName, organization: name, url: verifyUrl.toString() };
      const emailText = (key: TranslationKey) =>
        formatOrganizationSignupEmail(t(language, key), emailValues);
      let emailSent = false;
      try {
        const emailResult = await sendTransactionalEmail({
          to: email,
          subject: t(language, "onboarding.verifyEmailSubject"),
          body: [
            emailText("onboarding.verifyEmailGreeting"),
            "",
            emailText("onboarding.verifyEmailBody"),
            "",
            emailText("onboarding.verifyEmailAction"),
            emailValues.url,
            "",
            emailText("onboarding.verifyEmailExpiry"),
            emailText("onboarding.verifyEmailIgnore"),
          ].join("\n"),
        });
        emailSent = emailResult.success;
      } catch {
        emailSent = false;
      }

      if (!emailSent) {
        logger.warn("Organization signup verification email delivery was not confirmed.");
        await prisma.pendingOrganizationSignup.deleteMany({ where: { email, tokenHash } });
        return { error: "", notice: t(language, "onboarding.verifySentNotice") };
      }

      return {
        error: "",
        notice: t(language, "onboarding.verifySentNotice"),
      };
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof OrganizationCreationError) {
      return { error: t(language, error.translationKey) };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (!session) {
        return { error: "", notice: t(language, "onboarding.verifySentNotice") };
      }
      return { error: t(language, "onboarding.error.duplicate") };
    }

    logOrganizationOnboardingFailure("create", error);
    return {
      error: t(language, "onboarding.error.create"),
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/candidatos");
  revalidatePath("/legal");
  revalidatePath("/logistica");
  revalidatePath("/notificaciones");
  redirect("/dashboard");
}

export async function getOrganizationSignupVerificationInfo(rawToken: string) {
  const token = typeof rawToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(rawToken) ? rawToken : "";
  if (!token) return { status: "invalid" as const, organizationName: "" };

  try {
    const pending = await prisma.pendingOrganizationSignup.findUnique({
      where: { tokenHash: hashOrganizationSignupToken(token) },
      select: { organizationName: true, expiresAt: true },
    });
    if (!pending || pending.expiresAt <= new Date()) {
      return { status: "invalid" as const, organizationName: "" };
    }
    return { status: "valid" as const, organizationName: pending.organizationName };
  } catch (error) {
    logOrganizationOnboardingFailure("verification-info", error);
    return { status: "error" as const, organizationName: "" };
  }
}

export async function verifyOrganizationSignupAction(formData: FormData) {
  const rawToken = String(formData.get("token") ?? "");
  const token = /^[A-Za-z0-9_-]{43}$/.test(rawToken) ? rawToken : "";
  const tokenHash = token ? hashOrganizationSignupToken(token) : "";
  const language = normalizeLanguage(String(formData.get("language") ?? "es"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const verifyUrl = `/onboarding/verify?${new URLSearchParams({ lang: language, error: "password" }).toString()}#${new URLSearchParams({ token }).toString()}`;
  const now = new Date();
  try {
    await prisma.pendingOrganizationSignup.deleteMany({ where: { expiresAt: { lte: now } } });
  } catch (error) {
    logOrganizationOnboardingFailure("verify", error);
    redirect(`/onboarding/verify?${new URLSearchParams({ lang: language, status: "error" }).toString()}`);
  }

  if (
    !token || !isValidAccountPassword(password) ||
    password !== confirmPassword
  ) {
    redirect(verifyUrl);
  }

  let pendingBeforeHash: { expiresAt: Date } | null;
  try {
    pendingBeforeHash = await prisma.pendingOrganizationSignup.findUnique({
      where: { tokenHash },
      select: { expiresAt: true },
    });
  } catch (error) {
    logOrganizationOnboardingFailure("verify", error);
    redirect(`/onboarding/verify?${new URLSearchParams({ lang: language, status: "error" }).toString()}`);
  }
  if (!pendingBeforeHash || pendingBeforeHash.expiresAt <= now) {
    redirect(`/onboarding/verify?${new URLSearchParams({ lang: language, status: "invalid" }).toString()}`);
  }

  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(password, 12);
  } catch (error) {
    logOrganizationOnboardingFailure("verify", error);
    redirect(`/onboarding/verify?${new URLSearchParams({ lang: language, status: "error" }).toString()}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const pending = await tx.pendingOrganizationSignup.findUnique({
        where: { tokenHash },
      });
      if (!pending || pending.expiresAt <= new Date()) {
        throw new Error("SIGNUP_TOKEN_INVALID");
      }

      const existingUser = await tx.user.findUnique({
        where: { email: pending.email },
        select: { id: true },
      });
      if (existingUser) {
        throw new Error("SIGNUP_EMAIL_ALREADY_USED");
      }

      const organization = await tx.organization.create({
        data: {
          name: pending.organizationName,
          slug: slugifyOrganizationName(pending.organizationName),
          plan: "FREE",
          isActive: true,
        },
      });
      const user = await tx.user.create({
        data: {
          email: pending.email,
          name: pending.fullName,
          passwordHash,
          organizationId: organization.id,
          role: "SUPERADMIN",
          isActive: true,
          settings: { interfaceLanguage: normalizeLanguage(pending.language) },
        },
        select: { id: true },
      });

      await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "SUPERADMIN",
          isActive: true,
        },
      });

      if (pending.workspaceMode === "demo") {
        await seedDemoWorkspace(tx, organization, user.id);
      }

      await tx.auditLog.create({
        data: {
          action: "ORGANIZATION_SIGNUP_VERIFIED",
          entityType: "Organization",
          entityId: organization.id,
          userId: user.id,
          organizationId: organization.id,
          details: { emailVerified: true, workspaceMode: pending.workspaceMode },
        },
      });

      const consumed = await tx.pendingOrganizationSignup.deleteMany({
        where: { id: pending.id, tokenHash, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) {
        throw new Error("SIGNUP_TOKEN_ALREADY_USED");
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const conflict = error instanceof Error ? error.message : "";
    const expectedConflict = [
      "SIGNUP_TOKEN_INVALID",
      "SIGNUP_EMAIL_ALREADY_USED",
      "SIGNUP_TOKEN_ALREADY_USED",
    ].includes(conflict);
    if (!expectedConflict) logOrganizationOnboardingFailure("verify", error);
    if (conflict === "SIGNUP_EMAIL_ALREADY_USED") {
      redirect(`/onboarding/verify?${new URLSearchParams({ lang: language, status: "existing" }).toString()}`);
    }
    if (["SIGNUP_TOKEN_INVALID", "SIGNUP_TOKEN_ALREADY_USED"].includes(conflict)) {
      redirect(`/onboarding/verify?${new URLSearchParams({ lang: language, status: "invalid" }).toString()}`);
    }
    redirect(`/onboarding/verify?${new URLSearchParams({ lang: language, status: "error" }).toString()}`);
  }

  revalidatePath("/", "layout");
  redirect(`/login?${new URLSearchParams({ lang: language, verified: "1" }).toString()}`);
}
