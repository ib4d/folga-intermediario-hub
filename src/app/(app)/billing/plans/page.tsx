import { requireTenant } from "@/lib/tenant";
import { PLAN_LIMITS } from "@/lib/billing/limits";
import { resolveEffectivePlan } from "@/lib/billing/entitlements";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Plan } from "@prisma/client";
import { canAccessModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { normalizeLanguage, t, type AppLanguage } from "@/lib/i18n";
import { auth } from "@/auth";
import Link from "next/link";

const plans: Plan[] = [
  Plan.FREE,
  Plan.STARTER,
  Plan.PRO,
  Plan.BUSINESS,
  Plan.ENTERPRISE,
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
  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    select: {
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
  const currentPlan = organization
    ? resolveEffectivePlan(organization.plan, organization.subscription)
    : Plan.FREE;

  return (
    <div className="content-shell billing-plans-page">
      <section className="hero-section billing-plans-hero">
        <h1>{labels("billing.plansTitle")}</h1>
        <p>{labels("billing.plansDescription")}</p>
      </section>

      <div className="billing-plans-grid">
        {plans.map((plan) => {
          const limits = PLAN_LIMITS[plan];
          const isCurrent = plan === currentPlan;

          return (
            <div key={plan} className={`card billing-plan-card ${isCurrent ? "billing-plan-card--current" : ""}`}>
              {isCurrent ? <div className="billing-plan-current">{labels("billing.currentPlanBadge")}</div> : null}

              <div className="billing-plan-header">
                <h2 className="billing-plan-title">{labels(planNameKey(plan))}</h2>
                <div className="billing-plan-price">
                  {plan === Plan.FREE ? (
                    <>{labels("billing.price.free")}<span className="billing-plan-period">{labels("billing.perMonth")}</span></>
                  ) : (
                    <span className="billing-plan-price-guided">{labels("billing.guidedPrice")}</span>
                  )}
                </div>
                <p className="billing-plan-description">{labels(planDescKey(plan))}</p>
              </div>

              <ul className="billing-plan-features">
                {[
                  formatFeature(limits.candidates, language, "billing.feature.candidates", "billing.feature.unlimitedCandidates"),
                  formatFeature(limits.users, language, "billing.feature.users", "billing.feature.unlimitedUsers"),
                  formatFeature(limits.ocrPerMonth, language, "billing.feature.ocrReads", "billing.feature.unlimitedOcrReads"),
                  formatFeature(limits.documentsPerMonth, language, "billing.feature.documents", "billing.feature.unlimitedDocuments"),
                  labels("billing.feature.dashboardOps"),
                ].map((feature) => (
                  <li key={feature} className="billing-plan-feature">
                    <CheckCircle2 size={16} />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="button button-secondary billing-plan-cta" disabled>
                  {labels("billing.currentPlanBadge")}
                </button>
              ) : plan === Plan.FREE ? (
                <button className="button button-secondary billing-plan-cta" disabled>
                  {labels("billing.freePlanReference")}
                </button>
              ) : (
                <Link className="button billing-plan-cta" href={`/demo?lang=${language}`}>
                  <ExternalLink size={16} />
                  {labels("billing.requestProposal")}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
