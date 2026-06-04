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

function getPlanAction(plan: PricingPlan, language: Parameters<typeof t>[0], demoHref: string, loginHref: string, onboardingHref: string) {
  const paymentLink = plan.plan === Plan.FREE ? null : getStripePaymentLink(plan.plan);
  const href =
    plan.plan === Plan.FREE
      ? onboardingHref
      : paymentLink ?? (plan.plan === Plan.ENTERPRISE ? demoHref : loginHref);

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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--pitch-black)",
        color: "var(--ghost-white)",
      }}
    >
      <nav
        style={{
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "4px solid var(--amber-flame)",
          position: "sticky",
          top: 0,
          backgroundColor: "rgba(11, 5, 0, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 100,
        }}
      >
        <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--amber-flame)" }}>
          ORI CRUIT <span style={{ color: "var(--ghost-white)" }}>HUB</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <Link href={demoHref} style={{ color: "inherit", textDecoration: "none", fontWeight: 800 }}>
            {labels("public.nav.demo")}
          </Link>
          <Link href={securityHref} style={{ color: "inherit", textDecoration: "none", fontWeight: 800 }}>
            {labels("public.nav.security")}
          </Link>
          <LanguageSwitcher currentLanguage={language} />
          <Link href={loginHref} className="button" style={{ fontSize: "0.8rem", padding: "0.5rem 1.25rem" }}>
            {labels("public.nav.login")}
          </Link>
        </div>
      </nav>

      <header style={{ padding: "6rem 2rem 3rem", textAlign: "center", maxWidth: "1100px", margin: "0 auto" }}>
        <div className="badge" style={{ marginBottom: "1rem" }}>
          {labels("public.pricing.title")}
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", lineHeight: 1, textTransform: "uppercase", marginBottom: "1.25rem" }}>
          {labels("public.pricing.title")}
        </h1>
        <p style={{ fontSize: "1.15rem", maxWidth: "820px", margin: "0 auto", opacity: 0.88, lineHeight: 1.6 }}>
          {labels("public.pricing.description")}
        </p>
      </header>

      <section style={{ padding: "2rem 2rem 6rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {pricingPlans.map((plan) => {
              const { href, label, paymentLink } = getPlanAction(plan, language, demoHref, loginHref, onboardingHref);

              return (
              <div
                key={plan.badge}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "430px",
                  border: plan.featured ? "2px solid var(--amber-flame)" : "1px solid rgba(255, 255, 255, 0.12)",
                  backgroundColor: "#111111",
                  boxShadow: plan.featured ? "8px 8px 0 var(--amber-flame)" : "none",
                }}
              >
                <div style={{ marginBottom: "2rem" }}>
                  <div
                    className={plan.featured ? "status-badge active" : "status-badge"}
                    style={{
                      marginBottom: "1rem",
                      backgroundColor: plan.featured ? "var(--amber-flame)" : "rgba(255,255,255,0.12)",
                      color: plan.featured ? "var(--pitch-black)" : "var(--ghost-white)",
                    }}
                  >
                    {labels(plan.badge)}
                  </div>
                  {plan.price ? (
                    <div style={{ fontSize: "2.35rem", fontWeight: 900 }}>
                      {plan.price.startsWith("billing.") ? labels(plan.price as Parameters<typeof labels>[0]) : plan.price}
                      <span style={{ fontSize: "1rem" }}>{plan.suffix ? labels(plan.suffix) : ""}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: "2.35rem", fontWeight: 900 }}>{labels("public.pricing.free")}</div>
                  )}
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "1rem", flex: 1 }}>
                  {plan.items.map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CheckCircle2 size={18} color="var(--amber-flame)" />
                      {labels(item)}
                    </li>
                  ))}
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ShieldCheck size={18} color="var(--amber-flame)" />
                    {labels("billing.feature.dashboardOps")}
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CreditCard size={18} color="var(--amber-flame)" />
                    {labels("billing.feature.emailSupport")}
                  </li>
                </ul>

                <Link
                  href={href}
                  className="button"
                  style={{ width: "100%", marginTop: "1.5rem", textDecoration: "none" }}
                  {...(paymentLink ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {label}
                </Link>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 2rem 6rem" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "2rem",
            borderTop: "4px solid var(--amber-flame)",
            borderBottom: "4px solid var(--amber-flame)",
            backgroundColor: "#111111",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "2.4rem", textTransform: "uppercase", marginBottom: "1rem" }}>
            {labels("public.finalCta.title")}
          </h2>
          <p style={{ maxWidth: "760px", margin: "0 auto 2rem", opacity: 0.88, lineHeight: 1.6 }}>
            {labels("public.finalCta.description")}
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={demoHref} className="button" style={{ textDecoration: "none" }}>
              {labels("public.finalCta.primary")}
              <ArrowRight size={18} style={{ marginLeft: "0.5rem" }} />
            </Link>
            <Link href={securityHref} className="button button-secondary" style={{ textDecoration: "none" }}>
              {labels("public.nav.security")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
