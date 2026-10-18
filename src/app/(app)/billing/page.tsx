import { auth } from "@/auth";
import { getPlanLimits } from "@/lib/billing/limits";
import { formatManualPlanDate, formatManualPlanEndDate, resolveEffectivePlan } from "@/lib/billing/entitlements";
import { isStripeConfigured, isStripePortalConfigured } from "@/lib/billing/stripe";
import { canAccessModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { CalendarClock, CreditCard, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeLanguage, t, type AppLanguage, type TranslationKey } from "@/lib/i18n";
import BillingPortalButton from "@/components/BillingPortalButton";
import BillingReviewControls from "@/components/BillingReviewControls";

function formatLimit(value: number, language: AppLanguage) {
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  return value === Infinity ? t(language, "billing.unlimited") : value.toLocaleString(locale);
}

function usagePercent(used: number, limit: number) {
  if (limit === Infinity) return 0;
  return Math.min((used / limit) * 100, 100);
}

function formatBillingDate(value: Date | null | undefined, language: AppLanguage) {
  if (!value) return null;
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getBillingAttentionStatusLabel(status: string, language: AppLanguage) {
  switch (status) {
    case "missing":
      return t(language, "billing.subscriptionAttentionStatusMissing");
    case "past_due":
      return t(language, "billing.subscriptionAttentionStatusPastDue");
    case "canceled":
      return t(language, "billing.subscriptionAttentionStatusCanceled");
    case "unpaid":
      return t(language, "billing.subscriptionAttentionStatusUnpaid");
    case "incomplete":
    case "incomplete_expired":
      return t(language, "billing.subscriptionAttentionStatusIncomplete");
    default:
      return t(language, "billing.subscriptionAttentionStatusUnknown");
  }
}

function getBillingIncidentLabel(status: string, eventType: string, language: AppLanguage) {
  if (eventType === "checkout.session.async_payment_failed") {
    return status === "RECOVERED"
      ? t(language, "billing.checkoutAsyncPaymentRecovered")
      : t(language, "billing.checkoutAsyncPaymentFailed");
  }
  if (status === "CLOSED") return t(language, "billing.invoiceIncidentClosed");
  if (status === "RECOVERED") return t(language, "billing.invoiceIncidentRecovered");
  if (eventType === "invoice.finalization_failed") {
    return t(language, "billing.invoiceIncidentFinalizationFailed");
  }
  if (eventType === "invoice.payment_action_required") {
    return t(language, "billing.invoiceIncidentActionRequired");
  }
  return t(language, "billing.invoiceIncidentPaymentFailed");
}

function getBillingReviewLabel(kind: string, language: AppLanguage) {
  switch (kind) {
    case "REFUND":
      return t(language, "billing.reviewRefundTitle");
    case "DISPUTE":
      return t(language, "billing.reviewDisputeTitle");
    default:
      return t(language, "billing.reviewFraudTitle");
  }
}

function getBillingReviewStatusLabel(status: string, language: AppLanguage) {
  const statusKeys: Partial<Record<string, TranslationKey>> = {
    pending: "billing.reviewStatusPending",
    requires_action: "billing.reviewStatusRequiresAction",
    succeeded: "billing.reviewStatusSucceeded",
    failed: "billing.reviewStatusFailed",
    canceled: "billing.reviewStatusCanceled",
    needs_response: "billing.reviewStatusNeedsResponse",
    under_review: "billing.reviewStatusUnderReview",
    won: "billing.reviewStatusWon",
    lost: "billing.reviewStatusLost",
    warning_needs_response: "billing.reviewStatusWarningNeedsResponse",
    warning_under_review: "billing.reviewStatusWarningUnderReview",
    warning_closed: "billing.reviewStatusWarningClosed",
  };
  const key = statusKeys[status];
  return key ? t(language, key) : status.replaceAll("_", " ");
}

export default async function BillingPage() {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "billing")) redirect("/sin-permisos");
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  const stripeConfigured = isStripeConfigured();

  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    include: {
      subscription: true,
      stripeBillingIncidents: {
        orderBy: [{ status: "asc" }, { lastEventCreatedAt: "desc" }],
        take: 10,
      },
      stripeBillingReviews: {
        orderBy: [{ reviewedAt: "asc" }, { actionDueAt: "asc" }, { lastEventCreatedAt: "desc" }],
        take: 10,
      },
    },
  });

  if (!organization) return null;

  const now = new Date();
  const effectivePlan = resolveEffectivePlan(organization.plan, organization.subscription, now);
  const limits = getPlanLimits(effectivePlan);
  const manualSubscription = organization.subscription?.provider?.toLowerCase() === "manual"
    ? organization.subscription
    : null;
  const manualBilling = manualSubscription !== null;
  const stripePortalAvailable = Boolean(
    isStripePortalConfigured() &&
      organization.subscription?.provider?.toLowerCase() === "stripe" &&
      organization.subscription.providerCustomerId,
  );
  const manualPilotExpired = Boolean(
    manualSubscription &&
      manualSubscription.status.toLowerCase() === "active" &&
      (!manualSubscription.currentPeriodEnd || manualSubscription.currentPeriodEnd <= now),
  );
  const manualPilotNotStarted = Boolean(
    manualSubscription &&
      manualSubscription.status.toLowerCase() === "active" &&
      manualSubscription.currentPeriodEnd &&
      manualSubscription.currentPeriodEnd > now &&
      (!manualSubscription.currentPeriodStart || manualSubscription.currentPeriodStart > now),
  );
  const billingAttention =
    effectivePlan === "FREE" || manualPilotExpired
      ? null
      : (() => {
          const status = organization.subscription?.status?.toLowerCase() ?? "missing";
          if (["active", "trialing"].includes(status)) return null;
          return {
            status,
            currentPeriodEnd: organization.subscription?.currentPeriodEnd ?? null,
          };
        })();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [candidateUsage, userUsage, documentUsage, ocrUsage] = await Promise.all([
    prisma.candidate.count({ where: { organizationId: tenant.organizationId } }),
    prisma.membership.count({ where: { organizationId: tenant.organizationId, isActive: true } }),
    prisma.document.count({ where: { organizationId: tenant.organizationId, createdAt: { gte: startOfMonth } } }),
    prisma.auditLog.count({
      where: {
        organizationId: tenant.organizationId,
        action: { in: ["OCR_EXTRACTED_PENDING_REVIEW", "OCR_FAILED"] },
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  const usagePressureCandidates = [
    { key: "billing.candidates" as TranslationKey, used: candidateUsage, limit: limits.candidates },
    { key: "billing.users" as TranslationKey, used: userUsage, limit: limits.users },
    { key: "billing.documentsCycle" as TranslationKey, used: documentUsage, limit: limits.documentsPerMonth },
    { key: "billing.ocrCycle" as TranslationKey, used: ocrUsage, limit: limits.ocrPerMonth },
  ]
    .filter((item) => item.limit !== Infinity)
    .map((item) => ({
      ...item,
      ratio: usagePercent(item.used, item.limit),
    }))
    .sort((a, b) => b.ratio - a.ratio);

  const usagePressure =
    usagePressureCandidates.length > 0 && usagePressureCandidates[0].ratio >= 80
      ? usagePressureCandidates[0]
      : null;

  return (
    <div className="module-page-shell billing-page-shell">
      <section className="hero-section">
        <h1>{labels("billing.title")}</h1>
        <p>{labels("billing.description")}</p>
      </section>

      {manualPilotExpired || manualPilotNotStarted || billingAttention ? (
        <section className={`card billing-alert ${manualPilotNotStarted && !manualPilotExpired ? "billing-alert--warning" : "billing-alert--danger"}`}>
          <div className="card-header billing-alert-header">
            <h3 className="billing-alert-title">
              {labels(manualPilotExpired
                ? "billing.manualPilotExpiredTitle"
                : manualPilotNotStarted
                  ? "billing.manualPilotNotStartedTitle"
                  : "billing.subscriptionAttentionTitle")}
            </h3>
          </div>
          {manualPilotExpired ? (
            <p className="billing-alert-copy">
              {labels("billing.manualPilotExpiredMessage")
                .replace("{organization}", organization.name)
                .replace(
                  "{date}",
                  formatManualPlanEndDate(manualSubscription?.currentPeriodEnd, locale) ??
                    labels("billing.notAvailable"),
                )}
            </p>
          ) : manualPilotNotStarted ? (
            <p className="billing-alert-copy">
              {labels("billing.manualPilotNotStartedMessage")
                .replace("{organization}", organization.name)
                .replace(
                  "{date}",
                  formatManualPlanDate(manualSubscription?.currentPeriodStart, locale) ??
                    labels("billing.notAvailable"),
                )}
            </p>
          ) : billingAttention ? (
            <>
              <p className="billing-alert-copy">{labels("billing.subscriptionAttentionMessage")}</p>
              <div className="billing-alert-details">
                <div>
                  {labels("billing.subscriptionAttentionStatus").replace(
                    "{status}",
                    getBillingAttentionStatusLabel(billingAttention.status, language),
                  )}
                </div>
                <div>
                  {labels("billing.subscriptionAttentionPeriodEnd").replace(
                    "{date}",
                    billingAttention.currentPeriodEnd
                      ? formatBillingDate(billingAttention.currentPeriodEnd, language) ?? labels("billing.notAvailable")
                      : labels("billing.notAvailable"),
                  )}
                </div>
              </div>
            </>
          ) : null}
          <div className="billing-actions">
            {!manualBilling ? (
              stripePortalAvailable ? (
                <BillingPortalButton language={language} />
              ) : (
                <button className="button" type="button" disabled>
                  {labels("billing.stripePortalUnavailable")}
                </button>
              )
            ) : null}
            <Link href="/billing/plans" className="button button-secondary">
              {labels("billing.changePlan")}
            </Link>
          </div>
        </section>
      ) : null}

      {usagePressure ? (
        <section className="card billing-alert billing-alert--warning">
          <div className="card-header billing-alert-header">
            <h3 className="billing-alert-title">{labels("billing.usagePressureTitle")}</h3>
          </div>
          <p className="billing-alert-copy">{labels("billing.usagePressureMessage")}</p>
          <div className="billing-alert-details">
            <div>
              {labels("billing.usagePressureCurrent").replace(
                "{usage}",
                `${labels(usagePressure.key)} ${usagePressure.used.toLocaleString(locale)} / ${formatLimit(usagePressure.limit, language)}`,
              )}
            </div>
            <div>{labels("billing.usagePressureAction")}</div>
          </div>
          <div className="billing-actions">
            <Link href="/billing/plans" className="button">
              {labels("billing.changePlan")}
            </Link>
          </div>
        </section>
      ) : null}

      {organization.stripeBillingIncidents.length > 0 ? (
        <section className="card billing-alert billing-alert--warning" aria-labelledby="billing-invoice-incidents-title">
          <div className="card-header billing-alert-header">
            <h2 id="billing-invoice-incidents-title" className="billing-alert-title">
              {labels("billing.invoiceIncidentsTitle")}
            </h2>
          </div>
          <p className="billing-alert-copy">{labels("billing.invoiceIncidentsDescription")}</p>
          <ul className="billing-detail-list">
            {organization.stripeBillingIncidents.map((incident) => (
              <li className="billing-detail-row" key={incident.id}>
                <span className="billing-detail-label">
                  {getBillingIncidentLabel(incident.status, incident.lastEventType, language)}
                </span>
                <span className="billing-detail-value">
                    {incident.invoiceId ?? incident.checkoutSessionId ?? incident.id} · {formatBillingDate(incident.lastEventCreatedAt, language) ?? labels("billing.notAvailable")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {organization.stripeBillingReviews.length > 0 ? (
        <section className="card billing-alert billing-alert--warning" aria-labelledby="billing-review-cases-title">
          <div className="card-header billing-alert-header">
            <h2 id="billing-review-cases-title" className="billing-alert-title">
              {labels("billing.reviewCasesTitle")}
            </h2>
          </div>
          <p className="billing-alert-copy">{labels("billing.reviewCasesDescription")}</p>
          <ul className="billing-detail-list">
            {organization.stripeBillingReviews.map((review) => (
              <li className="billing-detail-row" key={review.id}>
                <span className="billing-detail-label">{getBillingReviewLabel(review.kind, language)}</span>
                <span className="billing-detail-value">
                  {review.resourceStatus
                    ? `${labels("billing.reviewStripeStatus")}: ${getBillingReviewStatusLabel(review.resourceStatus, language)} · `
                    : ""}
                  {review.providerObjectId}
                  {review.actionDueAt
                    ? ` · ${labels("billing.reviewActionDue")}: ${formatBillingDate(review.actionDueAt, language)}`
                    : ""}
                  {review.actionable === true
                    ? ` · ${labels("billing.reviewActionable")}`
                    : review.actionable === false
                      ? ` · ${labels("billing.reviewNotActionable")}`
                      : ""}
                </span>
                <BillingReviewControls
                  reviewId={review.id}
                  status={review.reviewStatus}
                  note={review.reviewNote}
                  reviewedAt={formatBillingDate(review.reviewedAt, language)}
                  language={language}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="dashboard-grid billing-metric-grid">
        <div className="card billing-summary-card">
          <div className="card-header">
            <h3>{labels("billing.currentPlan")}</h3>
            <Zap size={24} color="var(--amber-flame)" />
          </div>
          <div className="billing-summary-value">{effectivePlan}</div>
          <Link href="/billing/plans" className="button billing-full-width">
            {labels("billing.changePlan")}
          </Link>
        </div>

        <div className="card billing-summary-card">
          <div className="card-header">
            <h3>{labels("billing.paymentMethod")}</h3>
            <CreditCard size={24} />
          </div>
          <div className="billing-summary-copy">
            {organization.subscription?.provider
              ? labels("billing.managedVia").replace("{provider}", organization.subscription.provider)
              : stripeConfigured
                ? labels("billing.stripeConfiguredNoSubscription")
                : labels("billing.stripePendingConfig")}
          </div>
          {!manualBilling ? (
            stripePortalAvailable ? (
              <BillingPortalButton
                language={language}
                className="button button-secondary billing-full-width"
              />
            ) : (
              <button className="button button-secondary billing-full-width" type="button" disabled>
                {labels("billing.stripePortalUnavailable")}
              </button>
            )
          ) : null}
        </div>

        <div className="card billing-summary-card">
          <div className="card-header">
            <h3>{labels("billing.subscriptionDetails")}</h3>
            <CalendarClock size={24} />
          </div>

          {organization.subscription ? (
            <div className="billing-detail-list">
              <BillingDetailRow label={labels("billing.subscriptionStatus")} value={organization.subscription.status.toUpperCase()} />
              <BillingDetailRow
                label={labels("billing.periodStart")}
                value={formatBillingDate(organization.subscription.currentPeriodStart, language) ?? labels("billing.notAvailable")}
              />
              <BillingDetailRow
                label={labels("billing.periodEnd")}
                value={manualBilling
                  ? formatManualPlanEndDate(organization.subscription.currentPeriodEnd, locale) ?? labels("billing.notAvailable")
                  : formatBillingDate(organization.subscription.currentPeriodEnd, language) ?? labels("billing.notAvailable")}
              />
              <BillingDetailRow
                label={labels("billing.providerCustomerId")}
                value={organization.subscription.providerCustomerId ?? labels("billing.notAvailable")}
              />
              <BillingDetailRow
                label={labels("billing.providerSubscriptionId")}
                value={organization.subscription.providerSubscriptionId ?? labels("billing.notAvailable")}
              />
            </div>
          ) : (
            <p className="billing-empty-note">{labels("billing.noSubscriptionRecord")}</p>
          )}
        </div>
      </div>

      <div className="card billing-limits-card">
        <div className="card-header">
          <h2>{labels("billing.usageLimits")}</h2>
        </div>
        <div className="billing-limit-stack">
          <UsageBar language={language} label={labels("billing.candidates")} used={candidateUsage} limit={limits.candidates} />
          <UsageBar language={language} label={labels("billing.users")} used={userUsage} limit={limits.users} />
          <UsageBar language={language} label={labels("billing.documentsCycle")} used={documentUsage} limit={limits.documentsPerMonth} />
          <UsageBar language={language} label={labels("billing.ocrCycle")} used={ocrUsage} limit={limits.ocrPerMonth} />
        </div>
      </div>
    </div>
  );
}

function UsageBar({
  language,
  label,
  used,
  limit,
}: {
  language: AppLanguage;
  label: string;
  used: number;
  limit: number;
}) {
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  return (
    <div className="billing-usage-row">
      <div className="billing-usage-head">
        <span>{label}</span>
        <span>
          {used.toLocaleString(locale)} / {formatLimit(limit, language)}
        </span>
      </div>
      <div className="billing-usage-bar">
        <div className="billing-usage-fill" style={{ width: `${usagePercent(used, limit)}%` }} />
      </div>
    </div>
  );
}

function BillingDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="billing-detail-row">
      <span className="billing-detail-label">{label}</span>
      <span className="billing-detail-value">{value}</span>
    </div>
  );
}
