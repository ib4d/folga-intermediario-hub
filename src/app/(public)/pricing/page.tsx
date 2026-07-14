import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { Plan } from "@prisma/client";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { localizedHref, normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { getStripePaymentLink } from "@/lib/billing/stripe";

type PricingPlan = {
  plan: Plan;
  badge: TranslationKey;
  price?: string;
  suffix?: TranslationKey;
  items: readonly TranslationKey[];
  featured: boolean;
};

const pricingPlans: readonly PricingPlan[] = [
  {
    plan: Plan.FREE,
    badge: "public.pricing.basic",
    price: "EUR 0",
    items: ["public.pricing.candidates25", "public.pricing.users2", "public.pricing.ocrLimited", "public.pricing.brandingOri"],
    featured: false,
  },
  {
    plan: Plan.STARTER,
    badge: "public.pricing.popular",
    price: "EUR 49",
    suffix: "public.pricing.perMonth",
    items: ["public.pricing.candidates250", "public.pricing.users5", "public.pricing.ocrStandard", "public.pricing.exportXlsx"],
    featured: true,
  },
  {
    plan: Plan.PRO,
    badge: "public.pricing.professional",
    price: "EUR 149",
    suffix: "public.pricing.perMonth",
    items: ["public.pricing.candidates2500", "public.pricing.users20", "public.pricing.ocrFull", "public.pricing.legalLogistics"],
    featured: false,
  },
  {
    plan: Plan.BUSINESS,
    badge: "public.pricing.company",
    price: "EUR 349",
    suffix: "public.pricing.perMonth",
    items: ["public.pricing.candidates10000", "public.pricing.users50", "public.pricing.apiIntegration", "public.pricing.customBranding"],
    featured: false,
  },
  {
    plan: Plan.ENTERPRISE,
    badge: "public.pricing.enterprise",
    price: "billing.price.enterprise",
    items: ["public.pricing.candidates10000", "public.pricing.users50", "public.pricing.apiIntegration", "public.pricing.customBranding"],
    featured: false,
  },
] as const;

function getPlanAction(
  plan: PricingPlan,
  language: Parameters<typeof t>[0],
  demoHref: string,
  loginHref: string,
  onboardingHref: string
) {
  const paymentLink = plan.plan === Plan.FREE ? null : getStripePaymentLink(plan.plan);
  const href = plan.plan === Plan.FREE ? onboardingHref : paymentLink ?? (plan.plan === Plan.ENTERPRISE ? demoHref : loginHref);

  const label =
    plan.plan === Plan.FREE
      ? t(language, "public.pricing.startFree")
      : plan.plan === Plan.ENTERPRISE
        ? t(language, "public.pricing.requestDemo")
        : t(language, "public.pricing.selectPlan");

  return { href, label, paymentLink };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const labels = t.bind(null, language);
  const demoHref = localizedHref("/demo", language);
  const securityHref = localizedHref("/security", language);
  const loginHref = localizedHref("/login", language);
  const onboardingHref = localizedHref("/onboarding", language);

  return (
    <div className="public-landing">
      <nav className="public-topbar">
        <div className="public-brand">
          ORI CRUIT <span className="public-brand-accent">HUB</span>
        </div>
        <div className="public-nav-links">
          <Link href={demoHref} className="public-nav-link">
            {labels("public.nav.demo")}
          </Link>
          <Link href={securityHref} className="public-nav-link">
            {labels("public.nav.security")}
          </Link>
          <LanguageSwitcher currentLanguage={language} />
          <Link href={loginHref} className="button public-login-link">
            {labels("public.nav.login")}
          </Link>
        </div>
      </nav>

      <header className="public-hero">
        <div className="badge public-pricing-badge-anchor">
          {labels("public.pricing.title")}
        </div>
        <h1 className="public-hero-title">{labels("public.pricing.title")}</h1>
        <p className="public-hero-copy">{labels("public.pricing.description")}</p>

        <div className="card public-card-dark public-pricing-guided">
          <div className="card-header public-pricing-guided-header">
            <div className="public-hero-card-title">{labels("public.pricing.guidedTitle")}</div>
          </div>
          <div className="public-hero-card-copy">{labels("public.pricing.guidedDescription")}</div>
        </div>
      </header>

      <section className="public-section public-pricing-section">
        <div className="public-section-inner public-section-inner--wide public-pricing-section-inner">
          <div className="public-card-grid public-card-grid--pricing">
            {pricingPlans.map((plan) => {
              const { href, label, paymentLink } = getPlanAction(plan, language, demoHref, loginHref, onboardingHref);
              const featuredClass = plan.featured ? "public-card-accent public-pricing-card--dark-badge" : "";

              return (
                <article key={plan.badge} className={`card public-card-dark public-pricing-card ${featuredClass}`.trim()}>
                  <div className="public-pricing-header">
                    <div
                      className={`status-badge public-pricing-badge ${plan.featured ? "active public-pricing-badge--dark" : ""}`.trim()}
                    >
                      {labels(plan.badge)}
                    </div>
                    {plan.price ? (
                      <div className="public-pricing-title">
                        {plan.price.startsWith("billing.")
                          ? labels(plan.price as Parameters<typeof labels>[0])
                          : plan.price}
                        <span className="public-pricing-suffix">{plan.suffix ? labels(plan.suffix) : ""}</span>
                      </div>
                    ) : (
                      <div className="public-pricing-title">{labels("public.pricing.free")}</div>
                    )}
                  </div>

                  <ul className="public-pricing-list">
                    {plan.items.map((item) => (
                      <li key={item} className="public-pricing-item">
                        <CheckCircle2 size={18} color="var(--amber-flame)" />
                        {labels(item)}
                      </li>
                    ))}
                    <li className="public-pricing-item">
                      <ShieldCheck size={18} color="var(--amber-flame)" />
                      {labels("billing.feature.dashboardOps")}
                    </li>
                    <li className="public-pricing-item">
                      <CreditCard size={18} color="var(--amber-flame)" />
                      {labels("billing.feature.emailSupport")}
                    </li>
                  </ul>

                  <Link
                    href={href}
                    className="button public-pricing-action"
                    {...(paymentLink ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {label}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="public-section public-section--dark public-cta-section">
        <div className="public-cta-inner">
          <h2 className="public-hero-title public-pricing-guided-title">
            {labels("public.finalCta.title")}
          </h2>
          <p className="public-cta-copy">{labels("public.finalCta.description")}</p>
          <div className="public-section-actions">
            <Link href={demoHref} className="button">
              {labels("public.finalCta.primary")}
              <ArrowRight size={18} className="public-cta-arrow" />
            </Link>
            <Link href={securityHref} className="button button-secondary">
              {labels("public.nav.security")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
