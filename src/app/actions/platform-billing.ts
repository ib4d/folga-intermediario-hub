"use server";

import { Plan, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";

export type ManualBillingActionState = {
  error: TranslationKey | "";
  success: TranslationKey | "";
};

const emptyState: ManualBillingActionState = { error: "", success: "" };
const MANUAL_PLANS = new Set<Plan>([Plan.STARTER, Plan.PRO, Plan.BUSINESS]);

function readString(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseEndOfDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? parsed
    : null;
}

async function platformAdminOrError(): Promise<{ userId: string } | ManualBillingActionState> {
  try {
    return await requirePlatformAdmin();
  } catch {
    return { ...emptyState, error: "common.noPermission" };
  }
}

function isActionError(value: { userId: string } | ManualBillingActionState): value is ManualBillingActionState {
  return "error" in value;
}

function revalidateBillingViews() {
  revalidatePath("/platform");
  revalidatePath("/platform/billing");
  revalidatePath("/billing");
  revalidatePath("/billing/plans");
  revalidatePath("/ajustes");
}

async function notifyTenantAdministrators(
  organizationId: string,
  type: string,
  titleKey: TranslationKey,
  messageKey: TranslationKey,
  replacements: Record<string, string> = {}
) {
  try {
    const memberships = await prisma.membership.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: ["ADMIN", "SUPERADMIN"] },
        user: { isActive: true },
      },
      select: {
        userId: true,
        user: { select: { settings: true } },
      },
    });
    const recipientSettings = new Map<string, Prisma.JsonValue | null>();
    for (const membership of memberships) {
      if (!recipientSettings.has(membership.userId)) {
        recipientSettings.set(membership.userId, membership.user.settings);
      }
    }
    if (recipientSettings.size === 0) return;

    await prisma.notification.createMany({
      data: [...recipientSettings.entries()].map(([userId, settings]) => {
        const preferredLanguage = settings && typeof settings === "object" && !Array.isArray(settings)
          ? (settings as Prisma.JsonObject).interfaceLanguage
          : undefined;
        const language = normalizeLanguage(preferredLanguage);
        const message = Object.entries(replacements).reduce(
          (value, [key, replacement]) => value.split(`{${key}}`).join(replacement),
          t(language, messageKey)
        );

        return {
          organizationId,
          userId,
          type,
          title: t(language, titleKey),
          message,
        };
      }),
    });
  } catch (error) {
    console.error("[PlatformBilling] Tenant billing notice could not be created", error);
  }
}

export async function activateManualPlanAction(
  _previousState: ManualBillingActionState,
  formData: FormData
): Promise<ManualBillingActionState> {
  const admin = await platformAdminOrError();
  if (isActionError(admin)) return admin;

  const organizationId = readString(formData, "organizationId", 80);
  const rawPlan = readString(formData, "plan", 20).toUpperCase();
  const plan = MANUAL_PLANS.has(rawPlan as Plan) ? rawPlan as Plan : null;
  const endDate = parseEndOfDay(readString(formData, "validUntil", 10));
  const proposalReference = readString(formData, "proposalReference", 100);
  const invoiceReference = readString(formData, "invoiceReference", 100);
  const paymentReference = readString(formData, "paymentReference", 100);
  const paymentConfirmed = formData.get("paymentConfirmed") === "on";

  if (
    !organizationId || !plan || !MANUAL_PLANS.has(plan) || !endDate ||
    !proposalReference || !invoiceReference || !paymentReference || !paymentConfirmed
  ) {
    return { ...emptyState, error: "platformBilling.errorRequired" };
  }

  if (endDate <= new Date()) return { ...emptyState, error: "platformBilling.errorDate" };

  let action: "MANUAL_PLAN_ACTIVATED" | "MANUAL_PLAN_EXTENDED";
  try {
    action = await prisma.$transaction(async (tx) => {
      let transactionAction: "MANUAL_PLAN_ACTIVATED" | "MANUAL_PLAN_EXTENDED" = "MANUAL_PLAN_ACTIVATED";
      const actor = await tx.user.findUnique({
        where: { id: admin.userId },
        select: { isActive: true, isPlatformAdmin: true },
      });
      if (!actor?.isActive || !actor.isPlatformAdmin) {
        throw new Error("PLATFORM_ADMIN_CHANGED");
      }

      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });
      if (!organization?.isActive) throw new Error("ORGANIZATION_UNAVAILABLE");
      const now = new Date();
      if (endDate <= now) throw new Error("END_DATE_ELAPSED");

      const subscription = organization.subscription;
      if (subscription && subscription.provider?.toLowerCase() !== "manual") {
        throw new Error("BILLING_PROVIDER_CONFLICT");
      }
      if (
        subscription?.providerCustomerId ||
        subscription?.providerSubscriptionId
      ) {
        throw new Error("BILLING_PROVIDER_CONFLICT");
      }
      if (!subscription && organization.plan !== Plan.FREE) {
        throw new Error("BILLING_PROVIDER_CONFLICT");
      }

      const activeManualSubscription =
        subscription !== null &&
        subscription.provider?.toLowerCase() === "manual" &&
        subscription.status.toLowerCase() === "active" &&
        subscription.currentPeriodStart !== null &&
        subscription.currentPeriodStart <= now &&
        subscription.currentPeriodEnd !== null &&
        subscription.currentPeriodEnd > now
          ? subscription
          : null;

      if (activeManualSubscription) {
        if (
          organization.plan !== Plan.FREE &&
          organization.plan !== activeManualSubscription.plan
        ) {
          throw new Error("BILLING_PROVIDER_CONFLICT");
        }
        if (activeManualSubscription.plan !== plan) throw new Error("ACTIVE_PLAN_CHANGE");
        if (endDate <= activeManualSubscription.currentPeriodEnd!) throw new Error("EXTENSION_DATE_INVALID");
        transactionAction = "MANUAL_PLAN_EXTENDED";
      } else if (
        subscription !== null &&
        subscription.provider?.toLowerCase() === "manual" &&
        organization.plan !== Plan.FREE && organization.plan !== subscription.plan
      ) {
        throw new Error("BILLING_PROVIDER_CONFLICT");
      }

      const effectiveStart = activeManualSubscription
        ? activeManualSubscription.currentPeriodEnd!
        : now;

      const manualSubscription = subscription
        ? await tx.subscription.update({
          where: { organizationId },
          data: {
            plan,
            status: "active",
            currentPeriodStart: activeManualSubscription
              ? activeManualSubscription.currentPeriodStart!
              : effectiveStart,
            currentPeriodEnd: endDate,
            provider: "manual",
            providerCustomerId: null,
            providerSubscriptionId: null,
          },
        })
        : await tx.subscription.create({
          data: {
            organizationId,
            plan,
            status: "active",
            currentPeriodStart: effectiveStart,
            currentPeriodEnd: endDate,
            provider: "manual",
          },
        });

      const updatedOrganization = await tx.organization.updateMany({
        where: { id: organizationId, plan: organization.plan, isActive: true },
        data: { plan },
      });
      if (updatedOrganization.count !== 1) throw new Error("ORGANIZATION_CHANGED");

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: admin.userId,
          action: transactionAction,
          entityType: "Subscription",
          entityId: manualSubscription.id,
          details: {
            provider: "manual",
            plan,
            previousPlan: organization.plan,
            periodStart: effectiveStart.toISOString(),
            periodEnd: endDate.toISOString(),
            proposalReference,
            invoiceReference,
            paymentReference,
            paymentConfirmed,
          },
        },
      });
      return transactionAction;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    let errorKey: TranslationKey = "platformBilling.errorSave";
    switch (message) {
      case "PLATFORM_ADMIN_CHANGED":
        errorKey = "common.noPermission";
        break;
      case "ORGANIZATION_UNAVAILABLE":
        errorKey = "platformBilling.errorOrganization";
        break;
      case "END_DATE_ELAPSED":
        errorKey = "platformBilling.errorDate";
        break;
      case "BILLING_PROVIDER_CONFLICT":
        errorKey = "platformBilling.errorProviderConflict";
        break;
      case "ACTIVE_PLAN_CHANGE":
        errorKey = "platformBilling.errorPlanChange";
        break;
      case "EXTENSION_DATE_INVALID":
        errorKey = "platformBilling.errorExtensionDate";
        break;
    }
    return { ...emptyState, error: errorKey };
  }

  revalidateBillingViews();
  await notifyTenantAdministrators(
    organizationId,
    "BILLING_MANUAL_PLAN_ACTIVATED",
    action === "MANUAL_PLAN_EXTENDED"
      ? "platformBilling.noticeExtendedTitle"
      : "platformBilling.noticeActivatedTitle",
    "platformBilling.noticePlanMessage",
    { plan, date: endDate.toISOString().slice(0, 10) }
  );
  return {
    ...emptyState,
    success: action === "MANUAL_PLAN_EXTENDED"
      ? "platformBilling.successExtended"
      : "platformBilling.successActivated",
  };
}

export async function revokeManualPlanAction(
  _previousState: ManualBillingActionState,
  formData: FormData
): Promise<ManualBillingActionState> {
  const admin = await platformAdminOrError();
  if (isActionError(admin)) return admin;

  const organizationId = readString(formData, "organizationId", 80);
  const reason = readString(formData, "reason", 500);
  const revokeConfirmed = formData.get("revokeConfirmed") === "on";
  if (!organizationId || reason.length < 5 || !revokeConfirmed) {
    return { ...emptyState, error: "platformBilling.errorRevokeRequired" };
  }

  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: admin.userId },
        select: { isActive: true, isPlatformAdmin: true },
      });
      if (!actor?.isActive || !actor.isPlatformAdmin) throw new Error("PLATFORM_ADMIN_CHANGED");

      const subscription = await tx.subscription.findUnique({
        where: { organizationId },
        include: { organization: { select: { plan: true, isActive: true } } },
      });
      if (
        !subscription?.organization.isActive ||
        subscription.provider?.toLowerCase() !== "manual" ||
        subscription.status.toLowerCase() !== "active" ||
        subscription.providerCustomerId ||
        subscription.providerSubscriptionId
      ) {
        throw new Error("MANUAL_SUBSCRIPTION_NOT_FOUND");
      }

      if (subscription.organization.plan !== subscription.plan && subscription.organization.plan !== Plan.FREE) {
        throw new Error("ORGANIZATION_PLAN_CHANGED");
      }

      await tx.subscription.update({
        where: { organizationId },
        data: { status: "canceled", currentPeriodEnd: now },
      });
      const updatedOrganization = await tx.organization.updateMany({
        where: { id: organizationId, plan: subscription.organization.plan, isActive: true },
        data: { plan: Plan.FREE },
      });
      if (updatedOrganization.count !== 1) throw new Error("ORGANIZATION_CHANGED");

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: admin.userId,
          action: "MANUAL_PLAN_REVOKED",
          entityType: "Subscription",
          entityId: subscription.id,
          details: {
            provider: "manual",
            previousPlan: subscription.plan,
            revokedAt: now.toISOString(),
            reason,
          },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    let errorKey: TranslationKey = "platformBilling.errorSave";
    if (message === "PLATFORM_ADMIN_CHANGED") errorKey = "common.noPermission";
    if (message === "MANUAL_SUBSCRIPTION_NOT_FOUND") errorKey = "platformBilling.errorNoManualSubscription";
    return { ...emptyState, error: errorKey };
  }

  revalidateBillingViews();
  await notifyTenantAdministrators(
    organizationId,
    "BILLING_MANUAL_PLAN_REVOKED",
    "platformBilling.noticeRevokedTitle",
    "platformBilling.noticeRevokedMessage"
  );
  return { ...emptyState, success: "platformBilling.successRevoked" };
}
