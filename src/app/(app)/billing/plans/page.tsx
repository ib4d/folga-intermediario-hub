import { requireTenant } from "@/lib/tenant";
import { PLAN_LIMITS } from "@/lib/billing/limits";
import { getStripePaymentLink } from "@/lib/billing/stripe";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Plan } from "@prisma/client";
import { canAccessModule } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { normalizeLanguage, t, type AppLanguage } from "@/lib/i18n";
import { auth } from "@/auth";

const plans: Array<{ name: Plan; priceKey: string }> = [
  { name: Plan.FREE, priceKey: "billing.price.free" },
  { name: Plan.STARTER, priceKey: "billing.price.starter" },
  { name: Plan.PRO, priceKey: "billing.price.pro" },
  { name: Plan.BUSINESS, priceKey: "billing.price.business" },
  { name: Plan.ENTERPRISE, priceKey: "billing.price.enterprise" },
];

function planNameKey(plan: Plan) {
  switch (plan) {
    case Plan.FREE:
      return "billing.plan.freeName" as const;
    case Plan.STARTER:
      return "billing.plan.starterName" as const;
    case Plan.PRO:
      return "billing.plan.proName" as const;
    case Plan.BUSINESS:
      return "billing.plan.businessName" as const;
    case Plan.ENTERPRISE:
      return "billing.plan.enterpriseName" as const;
  }
  const exhaustivePlan: never = plan;
  throw new Error(`Unsupported plan name: ${exhaustivePlan}`);
}

function planDescKey(plan: Plan) {
  switch (plan) {
    case Plan.FREE:
      return "billing.plan.freeDesc" as const;
    case Plan.STARTER:
      return "billing.plan.starterDesc" as const;
    case Plan.PRO:
      return "billing.plan.proDesc" as const;
    case Plan.BUSINESS:
      return "billing.plan.businessDesc" as const;
    case Plan.ENTERPRISE:
      return "billing.plan.enterpriseDesc" as const;
  }
  const exhaustivePlan: never = plan;
  throw new Error(`Unsupported plan description: ${exhaustivePlan}`);
}

function formatFeature(value: number, language: AppLanguage, finiteKey: "billing.feature.candidates" | "billing.feature.users" | "billing.feature.ocrReads" | "billing.feature.documents", unlimitedKey: "billing.feature.unlimitedCandidates" | "billing.feature.unlimitedUsers" | "billing.feature.unlimitedOcrReads" | "billing.feature.unlimitedDocuments") {
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  if (value === Infinity) {
    return t(language, unlimitedKey);
  }

  return t(language, finiteKey).replace("{count}", value.toLocaleString(locale));
}

export default async function PlansPage() {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "billing")) redirect("/sin-permisos");
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  return (
    <div className="content-shell">
      <section className="hero-section billing-plans-hero">
        <h1>{labels("billing.plansTitle")}</h1>
        <p>{labels("billing.plansDescription")}</p>
      </section>

      <div className="billing-plans-grid">
        {plans.map((plan) => {
          const limits = PLAN_LIMITS[plan.name];
          const paymentLink = getStripePaymentLink(plan.name);
          const isRecommended = plan.name === Plan.PRO;

          return (
            <div key={plan.name} className={`card billing-plan-card ${isRecommended ? "billing-plan-card--featured" : ""}`}>
              {isRecommended ? (
                <div className="billing-plan-recommended">
                  {labels("billing.recommended")}
                </div>
              ) : null}

              <div className="billing-plan-header">
                <h2 className="billing-plan-title">{labels(planNameKey(plan.name))}</h2>
                <div className="billing-plan-price">
                  {labels(plan.priceKey as Parameters<typeof labels>[0])}
                  <span className="billing-plan-period">{labels("billing.perMonth")}</span>
                </div>
                <p className="billing-plan-description">{labels(planDescKey(plan.name))}</p>
              </div>

              <ul className="billing-plan-features">
                {[
                  formatFeature(limits.candidates, language, "billing.feature.candidates", "billing.feature.unlimitedCandidates"),
                  formatFeature(limits.users, language, "billing.feature.users", "billing.feature.unlimitedUsers"),
                  formatFeature(limits.ocrPerMonth, language, "billing.feature.ocrReads", "billing.feature.unlimitedOcrReads"),
                  formatFeature(limits.documentsPerMonth, language, "billing.feature.documents", "billing.feature.unlimitedDocuments"),
                  labels("billing.feature.dashboardOps"),
                  labels("billing.feature.emailSupport"),
                ].map((feature) => (
                  <li key={feature} className="billing-plan-feature">
                    <CheckCircle2 size={16} color="var(--amber-flame)" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.name === Plan.FREE ? (
                <button className="button button-secondary billing-plan-cta" disabled>
                  {labels("billing.initialPlan")}
                </button>
              ) : paymentLink ? (
                <a className="button billing-plan-cta" href={paymentLink} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  {labels("billing.selectPlan")}
                </a>
              ) : (
                <button className="button button-secondary billing-plan-cta" disabled>
                  {labels("billing.stripePending")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
