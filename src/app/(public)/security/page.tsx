import Link from "next/link";
import { ArrowRight, CalendarDays, BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { localizedHref, normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";

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

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const labels = t.bind(null, language);
  const demoHref = localizedHref("/demo", language);
  const loginHref = localizedHref("/login", language);
  const pricingHref = localizedHref("/pricing", language);

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
        <div className="badge public-pricing-badge-anchor">{labels("public.security.title")}</div>
        <h1 className="public-hero-title">{labels("public.security.title")}</h1>
        <p className="public-hero-copy">{labels("public.security.description")}</p>
      </header>

      <section className="public-section">
        <div className="public-card-grid public-security-card-grid">
          {trustCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="card public-card-dark public-security-card">
                <Icon size={28} className="public-security-icon" />
                <h3 className="public-security-title">{labels(item.title)}</h3>
                <p className="public-security-copy">{labels(item.text)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="public-section public-section--dark public-cta-section">
        <div className="public-cta-inner">
          <h2 className="public-hero-title public-pricing-guided-title">{labels("public.finalCta.title")}</h2>
          <p className="public-cta-copy">{labels("public.finalCta.description")}</p>
          <div className="public-section-actions">
            <Link href={demoHref} className="button">
              {labels("public.finalCta.primary")}
              <ArrowRight size={18} className="public-cta-arrow" />
            </Link>
            <Link href={loginHref} className="button button-secondary">
              {labels("public.finalCta.secondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
