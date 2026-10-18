import Link from "next/link";
import { ArrowRight, FileText, Globe2, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
import { localizedHref, normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { auth } from "@/auth";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import BrandLogo from "@/components/BrandLogo";
import ScrollRevealObserver from "@/components/ScrollRevealObserver";
import MarketingScrollTop from "@/components/public/MarketingScrollTop";
import { publicPageMetadata } from "@/lib/public-seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const localized = {
    es: { title: "Demo guiada | ORI CRUIT HUB", description: "Recorre el flujo de candidatos, documentos, revisión humana y coordinación en ORI CRUIT HUB." },
    en: { title: "Guided product demo | ORI CRUIT HUB", description: "Walk through candidate, document, human review, and coordination workflows in ORI CRUIT HUB." },
    pl: { title: "Prowadzone demo | ORI CRUIT HUB", description: "Poznaj proces kandydatów, dokumentów, weryfikacji przez człowieka i koordynacji w ORI CRUIT HUB." },
  }[language];
  return publicPageMetadata({ language, path: "/demo", ...localized });
}

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

const sandboxGuards = [
  {
    icon: LockKeyhole,
    title: "public.demo.guard1Title",
    text: "public.demo.guard1Text",
  },
  {
    icon: ShieldCheck,
    title: "public.demo.guard2Title",
    text: "public.demo.guard2Text",
  },
] as const satisfies readonly { icon: typeof LockKeyhole; title: TranslationKey; text: TranslationKey }[];

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const session = await auth();
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang ?? session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const homeHref = localizedHref("/", language);
  const onboardingHref = localizedHref("/onboarding?mode=demo", language);
  const loginHref = `/login?${new URLSearchParams({
    callbackUrl: onboardingHref,
    lang: language,
  }).toString()}`;

  return (
    <div id="top" className="ori-landing">
      <ScrollRevealObserver />
      <MarketingScrollTop label={language === "es" ? "Volver arriba" : language === "pl" ? "Wróć na górę" : "Back to top"} />
      <nav className="ori-nav" aria-label={labels("public.nav.main")}>
        <Link href={localizedHref("/", language)} aria-label="ORI CRUIT HUB" className="ori-brand-link"><BrandLogo /></Link>
        <div className="ori-nav-links"><Link href={localizedHref("/security", language)}>{labels("public.nav.security")}</Link><Link href={localizedHref("/pricing", language)}>{labels("public.nav.pricing")}</Link></div>
        <div className="ori-nav-actions"><LanguageSwitcher currentLanguage={language} /><Link href={loginHref} className="ori-nav-login">{labels("public.finalCta.secondary")}</Link><Link href={onboardingHref} className="ori-nav-demo">{labels("public.demo.getStarted")}<ArrowRight size={15} /></Link></div>
      </nav>

      <header className="ori-subpage-hero ori-demo-hero">
        <div data-scroll-reveal><span className="ori-kicker"><i />{labels("public.demo.badge")}</span><h1>{labels("public.demo.pageTitle")}</h1><p>{labels("public.demo.pageDescription")}</p><Link href={onboardingHref} className="ori-action ori-action-lime">{labels("public.demo.getStarted")}<ArrowRight size={17} /></Link></div>
        <div className="ori-subpage-hero-art" aria-hidden="true"><PlayCircle size={66} strokeWidth={1} /><span>{labels("public.demo.heroVisual")}</span></div>
      </header>

      <section className="ori-section ori-demo-steps-section">
        <div className="ori-section-label"><span>{labels("public.demo.walkthroughLabel")}</span><span>{labels("public.demo.stepsLabel")}</span></div>
        <div className="ori-trust-intro" data-scroll-reveal><h2>{labels("public.demo.introTitle")}</h2><p>{labels("public.demo.introText")}</p></div>
        <div className="ori-demo-step-grid">
          {demoSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="ori-demo-step" data-scroll-reveal style={{ transitionDelay: `${index * 80}ms` }}>
                <div className="ori-demo-step-top"><span>0{index + 1} / 03</span><Icon size={25} strokeWidth={1.6} /></div>
                <h3>{labels(step.title)}</h3>
                <p>{labels(step.text)}</p>
                <ArrowRight className="ori-demo-step-arrow" size={18} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="ori-section ori-demo-sandbox-section">
        <div className="ori-section-label"><span>{labels("public.demo.sandboxLabel")}</span><span>{labels("public.demo.sandboxType")}</span></div>
        <div className="ori-demo-sandbox-grid">
          {sandboxGuards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="ori-sandbox-card" data-scroll-reveal>
                <span><Icon size={24} strokeWidth={1.6} /></span><h3>{labels(item.title)}</h3><p>{labels(item.text)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ori-final"><small data-scroll-reveal>{labels("public.demo.nextLabel")}</small><h2 data-scroll-reveal>{labels("public.demo.nextTitle")}</h2><p data-scroll-reveal>{labels("public.demo.nextDescription")}</p><div className="ori-hero-actions" data-scroll-reveal><Link href={loginHref} className="ori-action ori-action-lime">{labels("public.demo.signIn")}<ArrowRight size={18} /></Link><Link href={onboardingHref} className="ori-action ori-action-outline">{labels("public.demo.startWorkspace")}<ArrowRight size={18} /></Link></div></section>
      <footer className="ori-footer"><Link href={homeHref} className="ori-brand-link" aria-label="ORI CRUIT HUB — inicio"><BrandLogo variant="green" /></Link><div><Link href={localizedHref("/security", language)}>{labels("public.nav.security")}</Link><Link href={localizedHref("/pricing", language)}>{labels("public.nav.pricing")}</Link><Link href={loginHref}>{labels("public.finalCta.secondary")}</Link></div><small>© 2026 ORI CRUIT HUB</small></footer>
    </div>
  );
}
