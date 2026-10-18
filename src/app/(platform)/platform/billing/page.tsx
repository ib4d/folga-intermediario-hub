import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import PlatformManualBillingPanel from "@/components/PlatformManualBillingPanel";
import { formatManualPlanEndDate, resolveEffectivePlan } from "@/lib/billing/entitlements";
import { normalizeLanguage, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";

export default async function PlatformBillingPage() {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";

  const [organizations, auditLogs] = await Promise.all([
    prisma.organization.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      isActive: true,
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
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: ["MANUAL_PLAN_ACTIVATED", "MANUAL_PLAN_EXTENDED", "MANUAL_PLAN_REVOKED"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        organization: { select: { name: true } },
        User: { select: { name: true, email: true } },
      },
    }),
  ]);

  const now = new Date();
  const rows = organizations.map((organization) => {
    const subscription = organization.subscription;
    const manualExpired = subscription !== null &&
      subscription.provider?.toLowerCase() === "manual" &&
      subscription.status.toLowerCase() === "active" &&
      (!subscription.currentPeriodEnd || subscription.currentPeriodEnd <= now);
    const manualNotStarted = subscription !== null &&
      subscription.provider?.toLowerCase() === "manual" &&
      subscription.status.toLowerCase() === "active" &&
      Boolean(subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) &&
      (!subscription.currentPeriodStart || subscription.currentPeriodStart > now);
    const status = !organization.isActive
      ? t(language, "platformBilling.organizationInactive")
      : manualExpired
        ? t(language, "platformBilling.expired")
        : manualNotStarted
          ? t(language, "platformBilling.notStarted")
          : subscription?.status ?? t(language, "platformBilling.noSubscription");

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      isActive: organization.isActive,
      storedPlan: organization.plan,
      effectivePlan: resolveEffectivePlan(organization.plan, subscription),
      provider: subscription?.provider ?? t(language, "platformBilling.providerUnknown"),
      status,
      validUntil: subscription?.provider?.toLowerCase() === "manual"
        ? formatManualPlanEndDate(subscription.currentPeriodEnd, locale) ?? ""
        : subscription?.currentPeriodEnd
          ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(subscription.currentPeriodEnd)
          : "",
    };
  });

  const auditEntries = auditLogs.map((entry) => {
    const details = entry.details && typeof entry.details === "object" && !Array.isArray(entry.details)
      ? entry.details as Prisma.JsonObject
      : {};
    const readDetail = (key: string) => typeof details[key] === "string" ? details[key] as string : "";
    return {
      id: entry.id,
      organization: entry.organization.name,
      actor: entry.User?.name ?? entry.User?.email ?? entry.userId ?? t(language, "platformBilling.providerUnknown"),
      action: entry.action,
      plan: readDetail("plan") || readDetail("previousPlan"),
      periodEnd: readDetail("periodEnd") || readDetail("revokedAt"),
      proposalReference: readDetail("proposalReference"),
      invoiceReference: readDetail("invoiceReference"),
      paymentReference: readDetail("paymentReference"),
      createdAt: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt),
    };
  });

  return <PlatformManualBillingPanel language={language} organizations={rows} auditEntries={auditEntries} />;
}
