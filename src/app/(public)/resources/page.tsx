import Link from "next/link";
import { ArrowRight, ExternalLink, FileCheck2, Scale, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import ResourcesWorkbench from "@/components/public/ResourcesWorkbench";
import ScrollRevealObserver from "@/components/ScrollRevealObserver";
import MarketingScrollTop from "@/components/public/MarketingScrollTop";
import { localizedHref, normalizeLanguage } from "@/lib/i18n";
import { publicPageMetadata } from "@/lib/public-seo";

const copy = {
  es: {
    title: "Recursos para operar con más claridad.", intro: "Herramientas de estimación y fuentes públicas para estructurar procesos de reclutamiento internacional. No sustituyen asesoramiento profesional ni una revisión del caso concreto.",
    navLabel: "Navegación principal", brandKicker: "ORI / NOTAS DE CAMPO", heroVisual: "MEDIR / REVISAR / MEJORAR", linksLabel: "04 / ENLACES", referenceLabel: "REFERENCIA /", resources: "FUENTES PÚBLICAS / CONSULTA DIRECTA", note: "Comprueba siempre la información vigente en la fuente oficial y para el país concreto.",
    sourceTitles: ["Registro KRAZ", "Buscador KRS", "Portal de Inmigración de la UE", "Accesibilidad web (W3C)"],
    sourceDescriptions: ["Consulta el registro oficial polaco de agencias de empleo y su información pública.", "Busca entidades inscritas en el Registro Judicial Nacional de Polonia.", "Información general y por país sobre migración, trabajo, estudio y residencia en la UE.", "Referencia internacional para diseñar y evaluar accesibilidad web."],
    sourceLinks: ["Abrir STOR / KRAZ", "Abrir buscador oficial", "Consultar portal europeo", "Consultar guía W3C"],
    home: "Inicio", demo: "Ver demo", pricing: "Precios", security: "Seguridad", links: ["https://stor.praca.gov.pl/portal/kraz", "https://wyszukiwarka-krs.ms.gov.pl/", "https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal_en", "https://www.w3.org/WAI/standards-guidelines/"],
  },
  en: {
    title: "Resources for clearer operations.", intro: "Estimation tools and public sources for structuring international recruitment workflows. They do not replace professional advice or review of a specific case.",
    navLabel: "Main navigation", brandKicker: "ORI / FIELD NOTES", heroVisual: "MEASURE / REVIEW / IMPROVE", linksLabel: "04 / LINKS", referenceLabel: "REFERENCE /", resources: "PUBLIC SOURCES / DIRECT REFERENCE", note: "Always confirm current information with the official source and for the relevant country.",
    sourceTitles: ["KRAZ register", "KRS entity search", "EU Immigration Portal", "Web accessibility (W3C)"],
    sourceDescriptions: ["Search Poland’s official public register of employment agencies.", "Search entities entered in Poland’s National Court Register.", "General and country-specific information on migration, work, study, and residence in the EU.", "International reference for designing and evaluating web accessibility."],
    sourceLinks: ["Open STOR / KRAZ", "Open official search", "Visit EU portal", "Read W3C guidance"],
    home: "Home", demo: "View demo", pricing: "Pricing", security: "Security", links: ["https://stor.praca.gov.pl/portal/kraz", "https://wyszukiwarka-krs.ms.gov.pl/", "https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal_en", "https://www.w3.org/WAI/standards-guidelines/"],
  },
  pl: {
    title: "Materiały dla bardziej przejrzystej pracy.", intro: "Narzędzia szacunkowe i źródła publiczne pomagające uporządkować procesy rekrutacji międzynarodowej. Nie zastępują profesjonalnej porady ani analizy konkretnej sprawy.",
    navLabel: "Nawigacja główna", brandKicker: "ORI / NOTATKI TERENOWE", heroVisual: "MIERZ / SPRAWDZAJ / ULEPSZAJ", linksLabel: "04 / LINKI", referenceLabel: "ŹRÓDŁO /", resources: "ŹRÓDŁA PUBLICZNE / BEZPOŚREDNIE", note: "Zawsze sprawdzaj aktualne informacje w oficjalnym źródle i dla właściwego kraju.",
    sourceTitles: ["Rejestr KRAZ", "Wyszukiwarka KRS", "Portal Imigracyjny UE", "Dostępność stron (W3C)"],
    sourceDescriptions: ["Sprawdź oficjalny polski rejestr agencji zatrudnienia i informacje publiczne.", "Wyszukaj podmioty wpisane do Krajowego Rejestru Sądowego.", "Ogólne i krajowe informacje o migracji, pracy, nauce i pobycie w UE.", "Międzynarodowe wytyczne dotyczące projektowania i oceny dostępności stron."],
    sourceLinks: ["Otwórz STOR / KRAZ", "Otwórz wyszukiwarkę", "Odwiedź portal UE", "Przeczytaj wytyczne W3C"],
    home: "Strona główna", demo: "Zobacz demo", pricing: "Cennik", security: "Bezpieczeństwo", links: ["https://stor.praca.gov.pl/portal/kraz", "https://wyszukiwarka-krs.ms.gov.pl/", "https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal_en", "https://www.w3.org/WAI/standards-guidelines/"],
  },
} as const;

const sourceIcons = [FileCheck2, Scale, ShieldCheck, ExternalLink] as const;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const title = language === "es" ? "Recursos operativos | ORI CRUIT HUB" : language === "pl" ? "Materiały operacyjne | ORI CRUIT HUB" : "Operational resources | ORI CRUIT HUB";
  const description = language === "es" ? "Calculadora de escenario, diagnóstico operativo y enlaces a fuentes oficiales para agencias de reclutamiento internacional." : language === "pl" ? "Kalkulator scenariusza, diagnoza operacyjna i linki do oficjalnych źródeł dla agencji rekrutacyjnych." : "Scenario calculator, operational self-assessment, and official sources for international recruitment agencies.";
  return publicPageMetadata({ language, path: "/resources", title, description });
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const c = copy[language];
  const home = localizedHref("/", language);
  const demo = localizedHref("/demo", language);
  const pricing = localizedHref("/pricing", language);
  const security = localizedHref("/security", language);

  return <div id="top" className="ori-landing ori-resources-page">
    <ScrollRevealObserver />
    <MarketingScrollTop label={language === "es" ? "Volver arriba" : language === "pl" ? "Wróć na górę" : "Back to top"} />
    <nav className="ori-nav" aria-label={c.navLabel}>
      <Link href={home} aria-label="ORI CRUIT HUB" className="ori-brand-link"><BrandLogo /></Link>
      <div className="ori-nav-links"><Link href={demo}>{c.demo}</Link><Link href={pricing}>{c.pricing}</Link><Link href={security}>{c.security}</Link></div>
      <div className="ori-nav-actions"><LanguageSwitcher currentLanguage={language} /><Link href={home} className="ori-nav-login">{c.home}</Link><Link href={demo} className="ori-nav-demo">{c.demo}<ArrowRight size={15} /></Link></div>
    </nav>
    <main>
      <header className="ori-subpage-hero ori-resources-hero"><div data-scroll-reveal><span className="ori-kicker"><i />{c.brandKicker}</span><h1>{c.title}</h1><p>{c.intro}</p></div><div className="ori-subpage-hero-art" aria-hidden="true"><Scale size={64} strokeWidth={1} /><span>{c.heroVisual}</span></div></header>
      <ResourcesWorkbench language={language} />
      <section className="ori-section ori-resource-links">
        <div className="ori-section-label"><span>{c.resources}</span><span>{c.linksLabel}</span></div>
        <p className="ori-resource-links-note">{c.note}</p>
        <div className="ori-resource-link-grid">{c.sourceTitles.map((title, index) => {
          const Icon = sourceIcons[index];
          return <article key={title} className="ori-resource-link-card" data-scroll-reveal><span><Icon size={21} /></span><small>{c.referenceLabel} 0{index + 1}</small><h2>{title}</h2><p>{c.sourceDescriptions[index]}</p><a href={c.links[index]} target="_blank" rel="noreferrer">{c.sourceLinks[index]}<ExternalLink size={14} /></a></article>;
        })}</div>
      </section>
    </main>
    <footer className="ori-footer"><Link href={home} className="ori-brand-link" aria-label="ORI CRUIT HUB"><BrandLogo variant="green" /></Link><div><Link href={demo}>{c.demo}</Link><Link href={pricing}>{c.pricing}</Link><Link href={security}>{c.security}</Link></div><small>© 2026 ORI CRUIT HUB</small></footer>
  </div>;
}
