import { Plan } from "@prisma/client";

export type SubscriptionEntitlement = {
  plan: Plan;
  status: string;
  provider: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} | null;

/**
 * Manual pilot grants are entered as an inclusive UTC calendar date. Format
 * that boundary as a date in UTC so tenant and platform screens show the same
 * day the operator selected, independent of the viewer's timezone.
 */
export function formatManualPlanEndDate(
  value: Date | null | undefined,
  locale: string
): string | null {
  return formatManualPlanDate(value, locale);
}

/** Format a manual pilot boundary as a UTC calendar date. */
export function formatManualPlanDate(
  value: Date | null | undefined,
  locale: string
): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

/**
 * Manual pilot access is fail-closed: a missing end date, a non-active state,
 * or an elapsed period immediately returns the tenant to the FREE limits.
 * Other providers keep the plan already maintained by their billing flow.
 */
export function resolveEffectivePlan(
  organizationPlan: Plan,
  subscription: SubscriptionEntitlement,
  now = new Date()
): Plan {
  if (subscription?.provider?.toLowerCase() === "manual") {
    if (
      subscription.status.toLowerCase() !== "active" ||
      !subscription.currentPeriodStart ||
      subscription.currentPeriodStart > now ||
      !subscription.currentPeriodEnd ||
      subscription.currentPeriodEnd <= now
    ) {
      return Plan.FREE;
    }

    return subscription.plan;
  }

  return organizationPlan;
}
