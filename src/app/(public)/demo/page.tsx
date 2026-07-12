import Link from "next/link";
import { ArrowRight, FileText, Globe2, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
import { localizedHref, normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { auth } from "@/auth";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";

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
  const onboardingHref = localizedHref("/onboarding?mode=demo", language);
  const loginHref = `/login?${new URLSearchParams({
    callbackUrl: onboardingHref,
    lang: language,
  }).toString()}`;

  return (
    <div className="public-landing">
      <nav className="public-topbar">
        <Link href={localizedHref("/", language)} className="public-brand public-nav-link">
          ORI CRUIT HUB
        </Link>
        <div className="public-nav-links">
          <LanguageSwitcher currentLanguage={language} />
          <Link href={loginHref} className="button button-secondary public-login-link">
            {labels("public.finalCta.secondary")}
          </Link>
          <Link href={onboardingHref} className="button public-login-link">
            {labels("public.demo.getStarted")}
            <ArrowRight size={18} className="public-cta-arrow" />
          </Link>
        </div>
      </nav>

      <header className="public-hero">
        <div className="badge public-pricing-badge-anchor">{labels("public.demo.badge")}</div>
        <h1 className="public-hero-title">{labels("public.demo.pageTitle")}</h1>
        <p className="public-hero-copy">{labels("public.demo.pageDescription")}</p>
      </header>

      <section className="public-section">
        <div className="public-card-grid public-demo-card-grid">
          {demoSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="card public-card-dark public-demo-card">
                <div className="public-demo-step-header">
                  <span className="status-badge active public-demo-step-badge">0{index + 1}</span>
                  <Icon size={28} className="public-hero-card-icon" />
                </div>
                <h3 className="public-demo-step-title">{labels(step.title)}</h3>
                <p className="public-demo-step-copy">{labels(step.text)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="public-section">
        <div className="public-card-grid public-card-grid--3 public-security-card-grid">
          {sandboxGuards.map((item) => {
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
          <h2 className="public-hero-title public-pricing-guided-title">{labels("public.demo.nextTitle")}</h2>
          <p className="public-cta-copy">{labels("public.demo.nextDescription")}</p>
          <div className="public-section-actions">
            <Link href={loginHref} className="button">
              {labels("public.demo.signIn")}
              <ArrowRight size={18} className="public-cta-arrow" />
            </Link>
            <Link href={onboardingHref} className="button button-secondary">
              {labels("public.demo.startWorkspace")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
