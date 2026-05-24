import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Globe2,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { localizedHref, normalizeLanguage, t } from "@/lib/i18n";

const problemCards = [
  {
    icon: Zap,
    title: "Mensajes Perdidos",
    text: "Pasaportes en hilos de WhatsApp imposibles de encontrar cuando los necesitas.",
  },
  {
    icon: FileText,
    title: "Errores de Datos",
    text: "Nombres y numeros mal escritos en Excel que causan rechazos legales masivos.",
  },
  {
    icon: CalendarDays,
    title: "Logistica a Ciegas",
    text: "Nadie sabe quien llega hoy, en que vuelo o quien debe recogerlos.",
  },
];

const featureCards = [
  {
    icon: Users,
    title: "ATS Especializado",
    text: "Gestion de pipeline visual disenada para procesos internacionales con estados personalizados.",
  },
  {
    icon: Zap,
    title: "OCR de Documentos",
    text: "Sube un pasaporte y deja que nuestra IA extraiga los datos automaticamente en segundos.",
  },
  {
    icon: ShieldCheck,
    title: "Modulo Legal",
    text: "Revisiones estructuradas de documentos, PESEL y Karta Pobytu con trazabilidad completa.",
  },
  {
    icon: Globe2,
    title: "Gestion Logistica",
    text: "Coordina vuelos, trenes y transportes. Sincroniza la llegada de tus candidatos en tiempo real.",
  },
  {
    icon: BarChart3,
    title: "Reportes Brandeados",
    text: "Genera informes de rendimiento y cumplimiento legal para tus clientes con tu propia marca.",
  },
  {
    icon: CheckCircle2,
    title: "Multi-Inquilino (SaaS)",
    text: "Aislamiento total de datos. Tu informacion es solo tuya, protegida y segura.",
  },
];

const pricingPlans = [
  {
    badge: "Basico",
    title: "Gratis",
    items: ["25 Candidatos", "2 Usuarios", "OCR Limitado", "Branding ORI CRUIT HUB"],
    featured: false,
  },
  {
    badge: "Popular",
    title: "EUR 49",
    suffix: "/mes",
    items: ["250 Candidatos", "5 Usuarios", "OCR Estandar", "Exportacion XLSX"],
    featured: true,
  },
  {
    badge: "Profesional",
    title: "EUR 149",
    suffix: "/mes",
    items: ["2500 Candidatos", "20 Usuarios", "OCR Completo", "Paneles Legal/Logistica"],
    featured: false,
    darkBadge: true,
  },
  {
    badge: "Empresa",
    title: "EUR 349",
    suffix: "/mes",
    items: ["10000 Candidatos", "50 Usuarios", "API de Integracion", "Branding Propio"],
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
                  <h3 style={{ marginBottom: "1rem" }}>{card.title}</h3>
                  <p style={{ opacity: 0.75 }}>{card.text}</p>
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
                  <h3 style={{ color: "var(--amber-flame)" }}>{card.title}</h3>
                  <p>{card.text}</p>
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
                key={plan.title}
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
                    {plan.badge}
                  </div>
                  <h3 style={{ fontSize: "2.35rem" }}>
                    {plan.title}
                    {plan.suffix ? <span style={{ fontSize: "1rem" }}>{plan.suffix}</span> : null}
                  </h3>
                </div>
                <ul style={{ listStyle: "none", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
                  {plan.items.map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CheckCircle2 size={18} color="green" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href={loginHref} className="button" style={{ width: "100%" }}>
                  {plan.title === "Gratis" ? labels("public.hero.primaryCta") : "Seleccionar Plan"}
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
            (c) 2026 ORI CRUIT HUB SaaS. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
