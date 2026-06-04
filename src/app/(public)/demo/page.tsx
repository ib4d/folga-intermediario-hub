import Link from "next/link";
import { ArrowRight, FileText, Globe2, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
import { localizedHref, normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { auth } from "@/auth";

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
  const loginHref = localizedHref("/login", language);
  const onboardingHref = localizedHref("/onboarding?mode=demo", language);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--pitch-black)",
        color: "var(--ghost-white)",
      }}
    >
      <section style={{ padding: "2rem", borderBottom: "4px solid var(--amber-flame)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <Link href={localizedHref("/", language)} style={{ color: "inherit", textDecoration: "none", fontWeight: 900 }}>
            ORI CRUIT HUB
          </Link>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href={loginHref} className="button button-secondary" style={{ textDecoration: "none" }}>
              {labels("public.finalCta.secondary")}
            </Link>
            <Link href={onboardingHref} className="button" style={{ textDecoration: "none" }}>
              {labels("public.demo.getStarted")}
              <ArrowRight size={18} style={{ marginLeft: "0.5rem" }} />
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "6rem 2rem 3rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
          <div className="badge" style={{ marginBottom: "1rem" }}>
            {labels("public.demo.badge")}
          </div>
          <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", lineHeight: 1, textTransform: "uppercase", marginBottom: "1.25rem" }}>
            {labels("public.demo.pageTitle")}
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: "820px", margin: "0 auto", opacity: 0.88, lineHeight: 1.6 }}>
            {labels("public.demo.pageDescription")}
          </p>
        </div>
      </section>

      <section style={{ padding: "2rem 2rem 6rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
                    minHeight: "240px",
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
                  <h3 style={{ marginBottom: "0.75rem", color: "var(--ghost-white)" }}>{labels(step.title)}</h3>
                  <p style={{ opacity: 0.78, margin: 0, lineHeight: 1.6 }}>{labels(step.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 2rem 6rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {sandboxGuards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="card"
                  style={{
                    backgroundColor: "#0f0f0f",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
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
            {labels("public.demo.nextTitle")}
          </h2>
          <p style={{ maxWidth: "760px", margin: "0 auto 2rem", opacity: 0.88, lineHeight: 1.6 }}>
            {labels("public.demo.nextDescription")}
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={loginHref} className="button" style={{ textDecoration: "none" }}>
              {labels("public.demo.signIn")}
              <ArrowRight size={18} style={{ marginLeft: "0.5rem" }} />
            </Link>
            <Link href={onboardingHref} className="button button-secondary" style={{ textDecoration: "none" }}>
              {labels("public.demo.startWorkspace")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
