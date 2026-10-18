import Link from "next/link";
import { ArrowRight, CalendarDays, BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ScrollRevealObserver from "@/components/ScrollRevealObserver";
import MarketingScrollTop from "@/components/public/MarketingScrollTop";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { localizedHref, normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { publicPageMetadata } from "@/lib/public-seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const localized = {
    es: { title: "Controles y alcance de seguridad | ORI CRUIT HUB", description: "Consulta los controles de acceso, trazabilidad y recuperación, junto con sus límites conocidos." },
    en: { title: "Security controls and scope | ORI CRUIT HUB", description: "Review access, audit, and recovery controls alongside their known limitations." },
    pl: { title: "Zabezpieczenia i ich zakres | ORI CRUIT HUB", description: "Poznaj kontrolę dostępu, historię działań i odzyskiwanie danych wraz ze znanymi ograniczeniami." },
  }[language];
  return publicPageMetadata({ language, path: "/security", ...localized });
}

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
  const homeHref = localizedHref("/", language);
  const loginHref = localizedHref("/login", language);
  const pricingHref = localizedHref("/pricing", language);

  return (
    <div id="top" className="ori-landing">
      <ScrollRevealObserver />
      <MarketingScrollTop label={language === "es" ? "Volver arriba" : language === "pl" ? "Wróć na górę" : "Back to top"} />
      <nav className="ori-nav" aria-label={labels("public.nav.main")}>
        <Link href={localizedHref("/", language)} aria-label="ORI CRUIT HUB" className="ori-brand-link"><BrandLogo /></Link>
        <div className="ori-nav-links"><Link href={demoHref}>{labels("public.nav.demo")}</Link><Link href={pricingHref}>{labels("public.nav.pricing")}</Link></div>
        <div className="ori-nav-actions"><LanguageSwitcher currentLanguage={language} /><Link href={loginHref} className="ori-nav-login">{labels("public.nav.login")}</Link><Link href={demoHref} className="ori-nav-demo">{labels("public.nav.demo")}<ArrowRight size={15} /></Link></div>
      </nav>

      <header className="ori-subpage-hero ori-security-hero">
        <div data-scroll-reveal><span className="ori-kicker"><i />{labels("public.security.title")}</span><h1>{labels("public.security.title")}</h1><p>{labels("public.security.description")}</p></div>
        <div className="ori-subpage-hero-art" aria-hidden="true"><LockKeyhole size={64} strokeWidth={1} /><span>{labels("public.security.heroVisual")}</span></div>
      </header>

      <section className="ori-section ori-trust-section">
        <div className="ori-section-label"><span>{labels("public.security.sectionLabel")}</span><span>{labels("public.security.sectionBrand")}</span></div>
        <div className="ori-trust-intro" data-scroll-reveal><h2>{labels("public.security.introTitle")}</h2><p>{labels("public.security.introText")}</p></div>
        <div className="ori-trust-grid">
          {trustCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="ori-trust-card" data-scroll-reveal>
                <span className="ori-trust-icon"><Icon size={25} strokeWidth={1.6} /></span>
                <small>{labels("public.security.controlLabel")} {String(trustCards.indexOf(item) + 1).padStart(2, "0")}</small>
                <h3>{labels(item.title)}</h3>
                <p>{labels(item.text)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ori-final"><small data-scroll-reveal>{labels("public.security.transparencyLabel")}</small><h2 data-scroll-reveal>{labels("public.finalCta.title")}</h2><p data-scroll-reveal>{labels("public.finalCta.description")}</p><Link href={demoHref} className="ori-action ori-action-lime" data-scroll-reveal>{labels("public.finalCta.primary")}<ArrowRight size={18} /></Link></section>
      <footer className="ori-footer"><Link href={homeHref} className="ori-brand-link" aria-label="ORI CRUIT HUB — inicio"><BrandLogo variant="green" /></Link><div><Link href={demoHref}>{labels("public.nav.demo")}</Link><Link href={pricingHref}>{labels("public.nav.pricing")}</Link><Link href={loginHref}>{labels("public.nav.login")}</Link></div><small>© 2026 ORI CRUIT HUB</small></footer>
    </div>
  );
}
