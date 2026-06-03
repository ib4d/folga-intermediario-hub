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
          <Link href={pricingHref} style={{ color: "inherit", textDecoration: "none", fontWeight: 800 }}>
            {labels("public.nav.pricing")}
          </Link>
          <LanguageSwitcher currentLanguage={language} />
          <Link href={loginHref} className="button" style={{ fontSize: "0.8rem", padding: "0.5rem 1.25rem" }}>
            {labels("public.nav.login")}
          </Link>
        </div>
      </nav>

      <header style={{ padding: "6rem 2rem 3rem", textAlign: "center", maxWidth: "1100px", margin: "0 auto" }}>
        <div className="badge" style={{ marginBottom: "1rem" }}>
          {labels("public.security.title")}
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", lineHeight: 1, textTransform: "uppercase", marginBottom: "1.25rem" }}>
          {labels("public.security.title")}
        </h1>
        <p style={{ fontSize: "1.15rem", maxWidth: "820px", margin: "0 auto", opacity: 0.88, lineHeight: 1.6 }}>
          {labels("public.security.description")}
        </p>
      </header>

      <section style={{ padding: "2rem 2rem 6rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {trustCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="card"
                  style={{
                    backgroundColor: "#111111",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    minHeight: "200px",
                  }}
                >
                  <Icon size={28} style={{ color: "var(--amber-flame)", marginBottom: "1rem" }} />
                  <h3 style={{ marginBottom: "0.75rem", color: "var(--ghost-white)" }}>{labels(item.title)}</h3>
                  <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>{labels(item.text)}</p>
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
            <Link href={loginHref} className="button button-secondary" style={{ textDecoration: "none" }}>
              {labels("public.finalCta.secondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
