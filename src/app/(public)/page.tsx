import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Globe2,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { localizedHref, normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";

const problemCards = [
  {
    icon: Zap,
    title: "public.problem.messagesTitle",
    text: "public.problem.messagesText",
  },
  {
    icon: FileText,
    title: "public.problem.dataTitle",
    text: "public.problem.dataText",
  },
  {
    icon: CalendarDays,
    title: "public.problem.logisticsTitle",
    text: "public.problem.logisticsText",
  },
] as const satisfies readonly { icon: typeof Zap; title: TranslationKey; text: TranslationKey }[];

const featureCards = [
  {
    icon: Users,
    title: "public.features.atsTitle",
    text: "public.features.atsText",
  },
  {
    icon: Zap,
    title: "public.features.ocrTitle",
    text: "public.features.ocrText",
  },
  {
    icon: ShieldCheck,
    title: "public.features.legalTitle",
    text: "public.features.legalText",
  },
  {
    icon: Globe2,
    title: "public.features.logisticsTitle",
    text: "public.features.logisticsText",
  },
  {
    icon: BarChart3,
    title: "public.features.reportsTitle",
    text: "public.features.reportsText",
  },
  {
    icon: CheckCircle2,
    title: "public.features.saasTitle",
    text: "public.features.saasText",
  },
] as const satisfies readonly { icon: typeof Zap; title: TranslationKey; text: TranslationKey }[];

const demoSteps = [
  {
    icon: PlayCircle,
    title: "public.demo.step1Title",
    text: "public.demo.step1Text",
  },
  {
    icon: FileText,
    title: "public.demo.step2Title",
    text: "public.demo.step2Text",
  },
  {
    icon: Globe2,
    title: "public.demo.step3Title",
    text: "public.demo.step3Text",
  },
] as const satisfies readonly { icon: typeof PlayCircle; title: TranslationKey; text: TranslationKey }[];

const trustCards = [
  {
    icon: LockKeyhole,
    title: "public.security.dataTitle",
    text: "public.security.dataText",
  },
  {
    icon: ShieldCheck,
    title: "public.security.gdprTitle",
    text: "public.security.gdprText",
  },
  {
    icon: BarChart3,
    title: "public.security.auditTitle",
    text: "public.security.auditText",
  },
  {
    icon: CalendarDays,
    title: "public.security.backupTitle",
    text: "public.security.backupText",
  },
] as const satisfies readonly { icon: typeof LockKeyhole; title: TranslationKey; text: TranslationKey }[];

type PricingPlan = {
  badge: TranslationKey;
  title?: TranslationKey;
  price?: `EUR ${number}`;
  suffix?: TranslationKey;
  items: readonly TranslationKey[];
  featured: boolean;
  darkBadge?: boolean;
};

const pricingPlans: readonly PricingPlan[] = [
  {
    badge: "public.pricing.basic",
    title: "public.pricing.free",
    items: ["public.pricing.candidates25", "public.pricing.users2", "public.pricing.ocrLimited", "public.pricing.brandingOri"],
    featured: false,
  },
  {
    badge: "public.pricing.popular",
    price: "EUR 49",
    suffix: "public.pricing.perMonth",
    items: ["public.pricing.candidates250", "public.pricing.users5", "public.pricing.ocrStandard", "public.pricing.exportXlsx"],
    featured: true,
  },
  {
    badge: "public.pricing.professional",
    price: "EUR 149",
    suffix: "public.pricing.perMonth",
    items: ["public.pricing.candidates2500", "public.pricing.users20", "public.pricing.ocrFull", "public.pricing.legalLogistics"],
    featured: false,
    darkBadge: true,
  },
  {
    badge: "public.pricing.company",
    price: "EUR 349",
    suffix: "public.pricing.perMonth",
    items: ["public.pricing.candidates10000", "public.pricing.users50", "public.pricing.apiIntegration", "public.pricing.customBranding"],
    featured: false,
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const labels = t.bind(null, language);
  const securityHref = localizedHref("/security", language);
  const pricingHref = localizedHref("/pricing", language);
  const demoHref = localizedHref("/demo", language);
  const onboardingHref = localizedHref("/onboarding", language);
  const loginHref = localizedHref("/login", language);

  return (
    <div className="public-landing">
      <nav className="public-topbar">
        <div className="public-brand">
          ORI CRUIT <span className="public-brand-accent">HUB</span>
        </div>
        <div className="public-nav-links">
          <Link href="#features" className="public-nav-link">
            {labels("public.nav.features")}
          </Link>
          <Link href={demoHref} className="public-nav-link">
            {labels("public.nav.demo")}
          </Link>
          <Link href={securityHref} className="public-nav-link">
            {labels("public.nav.security")}
          </Link>
          <Link href={pricingHref} className="public-nav-link">
            {labels("public.nav.pricing")}
          </Link>
          <LanguageSwitcher currentLanguage={language} />
          <Link href={loginHref} className="button public-login-link">
            {labels("public.nav.login")}
          </Link>
        </div>
      </nav>

      <header className="public-hero">
        <h1 className="public-hero-title">
          {labels("public.hero.titleA")} <br />
          <span>{labels("public.hero.titleB")}</span>
        </h1>
        <p className="public-hero-copy">
          {labels("public.hero.description")}
        </p>
        <div className="public-hero-actions">
          <Link href={onboardingHref} className="button public-hero-primary-action">
            {labels("public.hero.primaryCta")} <ArrowRight size={22} className="public-hero-arrow" />
          </Link>
          <Link
            href={demoHref}
            className="button public-hero-secondary-action"
          >
            {labels("public.hero.secondaryCta")}
          </Link>
        </div>

        <div className="public-card-grid public-card-grid--3 public-hero-card-grid">
          {featureCards.slice(0, 3).map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="card public-card public-card-dark public-hero-card"
              >
                <Icon size={28} className="public-hero-card-icon" />
                <h3 className="public-hero-card-title">{labels(card.title)}</h3>
                <p className="public-hero-card-copy">{labels(card.text)}</p>
              </div>
            );
          })}
        </div>
      </header>

      <section className="public-section public-section--dark">
        <div className="public-section-inner public-section-inner--narrow public-section-copy">
          <h2 className="public-section-title">
            {labels("public.problem.title")}
          </h2>
          <div className="public-card-grid public-card-grid--4">
            {problemCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="card public-card public-card-dark-alt">
                  <Icon size={40} className="public-problem-icon" />
                  <h3 className="public-problem-title">{labels(card.title)}</h3>
                  <p className="public-problem-copy">{labels(card.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="public-section public-section--light">
        <div className="public-section-inner">
          <div className="public-section-copy">
            <h2 className="public-section-title">
              {labels("public.features.title")}
            </h2>
            <p>
              {labels("public.features.description")}
            </p>
          </div>

          <div className="public-card-grid public-card-grid--pricing">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="card public-card public-card-dark public-card-accent"
                >
                  <Icon size={32} className="public-feature-icon" />
                  <h3 className="public-feature-title">{labels(card.title)}</h3>
                  <p>{labels(card.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="demo" className="public-section public-section--dark">
        <div className="public-section-inner">
          <div className="public-section-copy">
            <h2 className="public-section-title">
              {labels("public.demo.title")}
            </h2>
            <p>
              {labels("public.demo.description")}
            </p>
          </div>

          <div className="public-card-grid public-demo-card-grid">
            {demoSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="card public-card public-card-dark-alt"
                >
                  <div className="public-demo-step-header">
                    <span className="status-badge active public-demo-step-badge">
                      0{index + 1}
                    </span>
                    <Icon size={28} className="public-demo-step-icon" />
                  </div>
                  <h3 className="public-demo-step-title">{labels(step.title)}</h3>
                  <p className="public-demo-step-copy">{labels(step.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="security" className="public-section public-section--light">
        <div className="public-section-inner">
          <div className="public-section-copy">
            <h2 className="public-section-title">
              {labels("public.security.title")}
            </h2>
            <p>{labels("public.security.description")}</p>
          </div>

          <div className="public-card-grid public-card-grid--4 public-security-card-grid">
            {trustCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="card public-card"
                >
                  <Icon size={30} className="public-security-icon" />
                  <h3 className="public-security-title">{labels(card.title)}</h3>
                  <p className="public-security-copy">{labels(card.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="public-section public-section--light">
        <div className="public-section-inner">
          <div className="public-section-copy">
            <h2 className="public-section-title">
              {labels("public.pricing.title")}
            </h2>
            <p>{labels("public.pricing.description")}</p>
          </div>

          <div className="public-card-grid public-card-grid--pricing">
            {pricingPlans.map((plan) => {
              const planHref = plan.title === "public.pricing.free" ? onboardingHref : pricingHref;
              const planLabel =
                plan.title === "public.pricing.free"
                  ? labels("public.hero.primaryCta")
                  : labels("public.pricing.selectPlan");

              return (
                <div
                  key={plan.title ?? plan.price}
                  className={`card public-card public-pricing-card ${plan.featured ? "public-card-accent" : ""} ${plan.darkBadge ? "public-pricing-card--dark-badge" : ""}`.trim()}
                >
                  <div className="public-pricing-header">
                    <div
                      className={`status-badge ${plan.featured ? "active" : ""} public-pricing-badge ${plan.darkBadge ? "public-pricing-badge--dark" : ""}`}
                    >
                    {labels(plan.badge)}
                    </div>
                    <h3 className="public-pricing-title">
                      {plan.price ?? labels(plan.title ?? "public.pricing.free")}
                      {plan.suffix ? <span className="public-pricing-suffix">{labels(plan.suffix)}</span> : null}
                    </h3>
                  </div>
                  <ul className="public-pricing-list">
                    {plan.items.map((item) => (
                      <li key={item} className="public-pricing-item">
                        <CheckCircle2 size={18} color="green" /> {labels(item)}
                      </li>
                    ))}
                  </ul>
                  <Link href={planHref} className="button public-pricing-action">
                    {planLabel}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="cta" className="public-section public-section--dark public-cta-section">
        <div className="public-section-inner public-section-inner--narrow public-cta-inner">
          <h2 className="public-section-title">
            {labels("public.finalCta.title")}
          </h2>
          <p className="public-cta-copy">
            {labels("public.finalCta.description")}
          </p>
          <div className="public-section-actions">
            <Link href={demoHref} className="button public-cta-primary">
              {labels("public.finalCta.primary")} <ArrowRight size={20} className="public-cta-arrow" />
            </Link>
            <Link
              href={loginHref}
              className="button public-cta-secondary"
            >
              {labels("public.finalCta.secondary")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div className="public-footer-brand">
            ORI CRUIT HUB
          </div>
          <p className="public-footer-copy">{labels("public.footer.description")}</p>
          <div className="public-footer-links">
            <Link href="#features" className="public-footer-link">
              {labels("public.nav.features")}
            </Link>
            <Link href={demoHref} className="public-footer-link">
              {labels("public.nav.demo")}
            </Link>
            <Link href={securityHref} className="public-footer-link">
              {labels("public.nav.security")}
            </Link>
            <Link href={pricingHref} className="public-footer-link">
              {labels("public.nav.pricing")}
            </Link>
            <Link href={loginHref} className="public-footer-link">
              {labels("public.nav.login")}
            </Link>
          </div>
          <div className="public-footer-rights">
            {labels("public.footer.rights")}
          </div>
        </div>
      </footer>
    </div>
  );
}
