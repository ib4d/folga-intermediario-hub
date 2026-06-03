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
  const loginHref = localizedHref("/login", language);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--pitch-black)",
        color: "var(--ghost-white)",
        overflowX: "hidden",
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
        <div
          style={{
            fontSize: "1.75rem",
            fontWeight: 900,
            color: "var(--amber-flame)",
          }}
        >
          ORI CRUIT <span style={{ color: "var(--ghost-white)" }}>HUB</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="#features" style={{ color: "inherit", textDecoration: "none", fontWeight: 800 }}>
            {labels("public.nav.features")}
          </Link>
          <Link href="#pricing" style={{ color: "inherit", textDecoration: "none", fontWeight: 800 }}>
            {labels("public.nav.pricing")}
          </Link>
          <LanguageSwitcher currentLanguage={language} />
          <Link href={loginHref} className="button" style={{ fontSize: "0.8rem", padding: "0.5rem 1.25rem" }}>
            {labels("public.nav.login")}
          </Link>
        </div>
      </nav>

      <header style={{ padding: "8rem 2rem", textAlign: "center", maxWidth: "1200px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 900,
            marginBottom: "2rem",
            lineHeight: 0.95,
            textTransform: "uppercase",
          }}
        >
          {labels("public.hero.titleA")} <br />
          <span style={{ color: "var(--amber-flame)" }}>{labels("public.hero.titleB")}</span>
        </h1>
        <p
          style={{
            fontSize: "1.35rem",
            margin: "0 auto 3rem",
            maxWidth: "820px",
            opacity: 0.9,
            fontWeight: 600,
          }}
        >
          {labels("public.hero.description")}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={loginHref} className="button" style={{ padding: "1.1rem 2rem", fontSize: "1.1rem" }}>
            {labels("public.hero.primaryCta")} <ArrowRight size={22} style={{ marginLeft: "0.5rem" }} />
          </Link>
          <Link
            href="#demo"
            className="button button-secondary"
            style={{
              padding: "1.1rem 2rem",
              fontSize: "1.1rem",
              backgroundColor: "transparent",
              border: "2px solid var(--ghost-white)",
              color: "var(--ghost-white)",
            }}
          >
            {labels("public.hero.secondaryCta")}
          </Link>
        </div>
      </header>

      <section style={{ padding: "5rem 2rem", backgroundColor: "#0f0f0f", borderBlock: "4px solid var(--amber-flame)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "3rem", marginBottom: "3rem", textTransform: "uppercase" }}>
            {labels("public.problem.title")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "2rem" }}>
            {problemCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} style={{ padding: "2rem", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <Icon size={40} style={{ color: "#ff4d4d", marginBottom: "1.5rem" }} />
                  <h3 style={{ marginBottom: "1rem" }}>{labels(card.title)}</h3>
                  <p style={{ opacity: 0.75 }}>{labels(card.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: "7rem 2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "5rem" }}>
            <h2 style={{ fontSize: "3.5rem", marginBottom: "1.5rem", textTransform: "uppercase" }}>
              {labels("public.features.title")}
            </h2>
            <p style={{ fontSize: "1.25rem", maxWidth: "720px", margin: "0 auto" }}>
              {labels("public.features.description")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="card"
                  style={{
                    backgroundColor: "#151515",
                    border: "2px solid var(--amber-flame)",
                    boxShadow: "8px 8px 0 var(--amber-flame)",
                    minHeight: "220px",
                  }}
                >
                  <Icon size={32} style={{ color: "var(--amber-flame)", marginBottom: "1.5rem" }} />
                  <h3 style={{ color: "var(--amber-flame)" }}>{labels(card.title)}</h3>
                  <p>{labels(card.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="demo"
        style={{
          padding: "7rem 2rem",
          backgroundColor: "#0f0f0f",
          borderBlock: "4px solid var(--amber-flame)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "5rem" }}>
            <h2 style={{ fontSize: "3.25rem", marginBottom: "1.25rem", textTransform: "uppercase" }}>
              {labels("public.demo.title")}
            </h2>
            <p style={{ fontSize: "1.2rem", maxWidth: "780px", margin: "0 auto", opacity: 0.9 }}>
              {labels("public.demo.description")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {demoSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="card"
                  style={{
                    backgroundColor: "#151515",
                    border: "2px solid rgba(255, 255, 255, 0.14)",
                    minHeight: "220px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <span
                      className="status-badge active"
                      style={{
                        backgroundColor: "var(--amber-flame)",
                        color: "var(--pitch-black)",
                        paddingInline: "0.65rem",
                      }}
                    >
                      0{index + 1}
                    </span>
                    <Icon size={28} style={{ color: "var(--amber-flame)" }} />
                  </div>
                  <h3 style={{ color: "var(--ghost-white)", marginBottom: "0.75rem" }}>{labels(step.title)}</h3>
                  <p style={{ opacity: 0.78, margin: 0 }}>{labels(step.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="security"
        style={{ padding: "7rem 2rem", backgroundColor: "var(--ghost-white)", color: "var(--pitch-black)" }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "5rem" }}>
            <h2 style={{ fontSize: "3.25rem", marginBottom: "1.25rem", textTransform: "uppercase" }}>
              {labels("public.security.title")}
            </h2>
            <p style={{ fontSize: "1.2rem", maxWidth: "780px", margin: "0 auto" }}>{labels("public.security.description")}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {trustCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="card"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    minHeight: "200px",
                  }}
                >
                  <Icon size={30} style={{ color: "var(--amber-flame)", marginBottom: "1rem" }} />
                  <h3 style={{ marginBottom: "0.75rem" }}>{labels(card.title)}</h3>
                  <p style={{ margin: 0, opacity: 0.8 }}>{labels(card.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" style={{ padding: "7rem 2rem", backgroundColor: "var(--ghost-white)", color: "var(--pitch-black)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "5rem" }}>
            <h2 style={{ fontSize: "3.5rem", marginBottom: "1rem", textTransform: "uppercase" }}>
              {labels("public.pricing.title")}
            </h2>
            <p style={{ fontSize: "1.25rem" }}>{labels("public.pricing.description")}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2rem" }}>
            {pricingPlans.map((plan) => (
              <div
                key={plan.title ?? plan.price}
                className="card"
                style={{
                  backgroundColor: "white",
                  border: plan.featured ? "4px solid var(--pitch-black)" : undefined,
                  transform: plan.featured ? "translateY(-10px)" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "430px",
                }}
              >
                <div style={{ marginBottom: "2rem" }}>
                  <div
                    className={`status-badge ${plan.featured ? "active" : ""}`}
                    style={{
                      marginBottom: "1rem",
                      backgroundColor: plan.darkBadge ? "var(--pitch-black)" : undefined,
                      color: plan.darkBadge ? "white" : undefined,
                    }}
                  >
                    {labels(plan.badge)}
                  </div>
                  <h3 style={{ fontSize: "2.35rem" }}>
                    {plan.price ?? labels(plan.title ?? "public.pricing.free")}
                    {plan.suffix ? <span style={{ fontSize: "1rem" }}>{labels(plan.suffix)}</span> : null}
                  </h3>
                </div>
                <ul style={{ listStyle: "none", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
                  {plan.items.map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CheckCircle2 size={18} color="green" /> {labels(item)}
                    </li>
                  ))}
                </ul>
                <Link href={loginHref} className="button" style={{ width: "100%" }}>
                  {plan.title === "public.pricing.free" ? labels("public.hero.primaryCta") : labels("public.pricing.selectPlan")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        style={{
          padding: "5rem 2rem",
          borderTop: "4px solid var(--amber-flame)",
          backgroundColor: "var(--pitch-black)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--amber-flame)", marginBottom: "2rem" }}>
            ORI CRUIT HUB
          </div>
          <p style={{ opacity: 0.65, marginBottom: "3rem" }}>{labels("public.footer.description")}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "3rem", flexWrap: "wrap" }}>
            <Link href="#features" style={{ color: "inherit", textDecoration: "none" }}>
              {labels("public.nav.features")}
            </Link>
            <Link href="#pricing" style={{ color: "inherit", textDecoration: "none" }}>
              {labels("public.nav.pricing")}
            </Link>
            <Link href={loginHref} style={{ color: "inherit", textDecoration: "none" }}>
              {labels("public.nav.login")}
            </Link>
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.45 }}>
            {labels("public.footer.rights")}
          </div>
        </div>
      </footer>
    </div>
  );
}
