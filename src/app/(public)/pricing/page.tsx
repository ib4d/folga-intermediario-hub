import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import ScrollRevealObserver from "@/components/ScrollRevealObserver";
import MarketingScrollTop from "@/components/public/MarketingScrollTop";
import { localizedHref, normalizeLanguage } from "@/lib/i18n";
import { publicPageMetadata } from "@/lib/public-seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const localized = {
    es: { title: "Alcance y precios | ORI CRUIT HUB", description: "Consulta las capacidades configuradas y cómo funciona la implantación guiada de ORI CRUIT HUB." },
    en: { title: "Scope and pricing | ORI CRUIT HUB", description: "Review configured capacity and the guided implementation approach for ORI CRUIT HUB." },
    pl: { title: "Zakres i ceny | ORI CRUIT HUB", description: "Poznaj skonfigurowane możliwości i zasady prowadzonego wdrożenia ORI CRUIT HUB." },
  }[language];
  return publicPageMetadata({ language, path: "/pricing", ...localized });
}

const copy = {
  es: {
    navBack: "Volver al inicio", navLabel: "Navegación principal", cta: "Solicitar demo", kicker: "IMPLANTACIÓN GUIADA / ALCANCE Y PROPUESTA",
    title: "El alcance correcto empieza con tu operación.", intro: "Revisamos candidatos, operadores y documentos para acordar un piloto guiado. El precio y las condiciones se confirman en una propuesta comercial.",
    custom: "A consultar", featuresLabel: "LÍMITES CONFIGURADOS", choose: "Consultar alcance", plansLabel: "01 / CAPACIDAD", plansTitle: "Un punto de partida para cada volumen.", proposalBased: "A consultar", limitsNote: "Los límites mostrados son valores de configuración, no garantías de rendimiento. Precio, alcance y condiciones se confirman en una propuesta.", pilotNote: "La demo usa datos sintéticos. Un piloto con datos reales requiere aprobar versión, privacidad, soporte y alcance.", scaleVisual: "01 / ESCALA CON TU EQUIPO", sectionBrand: "ORI / OPERACIONES", pilotCardLabel: "PROPUESTA DE PILOTO",
    tiers: [
      { name: "Starter", price: "", description: "Límites operativos para un equipo pequeño.", features: ["Hasta 250 candidatos", "5 usuarios", "100 lecturas OCR / mes", "500 documentos / mes"] },
      { name: "Pro", price: "", description: "Límites ampliados para más candidatos y documentos.", features: ["Hasta 2.500 candidatos", "20 usuarios", "1.000 lecturas OCR / mes", "5.000 documentos / mes"] },
      { name: "Business", price: "", description: "Topes superiores para una actividad de mayor volumen.", features: ["Hasta 10.000 candidatos", "50 usuarios", "5.000 lecturas OCR / mes", "20.000 documentos / mes"] },
      { name: "Enterprise", price: "", description: "Capacidad y condiciones definidas para la operación.", features: ["Volumen de candidatos acordado", "Usuarios según alcance", "Límites operativos acordados", "Propuesta específica"] },
    ],
    pilotLabel: "02 / SERVICIO DE IMPLANTACIÓN", pilotTitle: "Primero, una demostración guiada.", pilotText: "Mostramos el flujo con datos sintéticos. Si encaja, acordamos la versión disponible, el alcance de datos, el soporte y los criterios de aceptación antes de proponer un piloto con datos reales.", pilot: "Piloto guiado propuesto / hasta 30 días", includes: ["Revisión del flujo y configuración propuestas", "Hasta 5 operadores, sujeto al alcance", "Sesión de formación propuesta", "Revisión con criterios acordados"], faqLabel: "PROPUESTA / SIGUIENTE PASO", faqTitle: "¿No sabes cuál encaja?", faqText: "Revisamos el volumen de candidatos, el número de operadores y el flujo antes de proponer el alcance.",
  },
  en: {
    navBack: "Back to home", navLabel: "Main navigation", cta: "Request a demo", kicker: "GUIDED IMPLEMENTATION / SCOPE AND PROPOSAL",
    title: "The right scope starts with your operation.", intro: "We review candidate, operator, and document volumes to shape a guided pilot. Price and terms are confirmed in a commercial proposal.",
    custom: "On request", featuresLabel: "CONFIGURED LIMITS", choose: "Discuss scope", plansLabel: "01 / CAPACITY", plansTitle: "A starting point for each volume.", proposalBased: "On request", limitsNote: "The limits shown are configuration caps, not performance guarantees. Price, scope, and terms are confirmed in a proposal.", pilotNote: "Demos use synthetic data. Real-data pilots require release, privacy, support, and scope approval.", scaleVisual: "01 / SCALE WITH YOUR TEAM", sectionBrand: "ORI / OPERATIONS", pilotCardLabel: "PILOT PROPOSAL",
    tiers: [
      { name: "Starter", price: "", description: "Operating limits for a small team.", features: ["Up to 250 candidates", "5 users", "100 OCR reads / month", "500 documents / month"] },
      { name: "Pro", price: "", description: "Higher limits for more candidates and documents.", features: ["Up to 2,500 candidates", "20 users", "1,000 OCR reads / month", "5,000 documents / month"] },
      { name: "Business", price: "", description: "Higher caps for greater operating volume.", features: ["Up to 10,000 candidates", "50 users", "5,000 OCR reads / month", "20,000 documents / month"] },
      { name: "Enterprise", price: "", description: "Capacity and terms defined for your operation.", features: ["Candidate volume agreed", "Users based on scope", "Operating limits agreed", "Tailored proposal"] },
    ],
    pilotLabel: "02 / IMPLEMENTATION SERVICE", pilotTitle: "Start with a guided demonstration.", pilotText: "We show the workflow with synthetic data. If it fits, we agree on the available release, data scope, support, and acceptance criteria before proposing a real-data pilot.", pilot: "Proposed guided pilot / up to 30 days", includes: ["Proposed workflow review and setup", "Up to 5 operators, subject to scope", "Proposed team training session", "Review against agreed criteria"], faqLabel: "PROPOSAL / NEXT STEP", faqTitle: "Not sure what fits?", faqText: "We review candidate volume, operators, and workflow before proposing a scope.",
  },
  pl: {
    navBack: "Wróć na stronę główną", navLabel: "Nawigacja główna", cta: "Umów prezentację", kicker: "PROWADZONE WDROŻENIE / ZAKRES I OFERTA",
    title: "Zakres zaczyna się od Twojej operacji.", intro: "Analizujemy liczbę kandydatów, operatorów i dokumentów, aby przygotować pilotaż. Cena i warunki są potwierdzane w ofercie.",
    custom: "Na zapytanie", featuresLabel: "SKONFIGUROWANE LIMITY", choose: "Ustal zakres", plansLabel: "01 / MOŻLIWOŚCI", plansTitle: "Punkt wyjścia dla każdej skali.", proposalBased: "Na zapytanie", limitsNote: "Widoczne limity to wartości konfiguracji, a nie gwarancje wydajności. Cenę, zakres i warunki potwierdzamy w ofercie.", pilotNote: "Prezentacja wykorzystuje dane syntetyczne. Pilotaż z prawdziwymi danymi wymaga zatwierdzenia wersji, prywatności, wsparcia i zakresu.", scaleVisual: "01 / SKALUJ Z ZESPOŁEM", sectionBrand: "ORI / OPERACJE", pilotCardLabel: "PROPOZYCJA PILOTAŻU",
    tiers: [
      { name: "Starter", price: "", description: "Limity operacyjne dla małego zespołu.", features: ["Do 250 kandydatów", "5 użytkowników", "100 odczytów OCR / mies.", "500 dokumentów / mies."] },
      { name: "Pro", price: "", description: "Wyższe limity dla większej liczby kandydatów i dokumentów.", features: ["Do 2 500 kandydatów", "20 użytkowników", "1 000 odczytów OCR / mies.", "5 000 dokumentów / mies."] },
      { name: "Business", price: "", description: "Wyższe limity dla większego wolumenu pracy.", features: ["Do 10 000 kandydatów", "50 użytkowników", "5 000 odczytów OCR / mies.", "20 000 dokumentów / mies."] },
      { name: "Enterprise", price: "", description: "Możliwości i warunki określane dla Twojej organizacji.", features: ["Uzgodniony wolumen kandydatów", "Liczba użytkowników według zakresu", "Limity operacyjne według uzgodnień", "Indywidualna oferta"] },
    ],
    pilotLabel: "02 / WSPARCIE WE WDROŻENIU", pilotTitle: "Zacznijmy od prowadzonej prezentacji.", pilotText: "Prezentujemy proces na danych syntetycznych. Jeśli pasuje do potrzeb, przed zaproponowaniem pilotażu z prawdziwymi danymi uzgadniamy dostępną wersję, zakres danych, wsparcie i kryteria akceptacji.", pilot: "Proponowany pilotaż / do 30 dni", includes: ["Proponowana analiza procesu i konfiguracja", "Do 5 operatorów, zgodnie z zakresem", "Proponowane szkolenie zespołu", "Omówienie wyników według uzgodnionych kryteriów"], faqLabel: "OFERTA / NASTĘPNY KROK", faqTitle: "Nie wiesz, co będzie odpowiednie?", faqText: "Przed przygotowaniem oferty sprawdzimy liczbę kandydatów, operatorów i przebieg procesu.",
  },
} as const;

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const c = copy[language];
  const home = localizedHref("/", language);
  const demo = localizedHref("/demo", language);

  return <div id="top" className="ori-landing ori-pricing-page">
    <ScrollRevealObserver />
    <MarketingScrollTop label={language === "es" ? "Volver arriba" : language === "pl" ? "Wróć na górę" : "Back to top"} />
    <nav className="ori-nav" aria-label={c.navLabel}>
      <Link href={home} aria-label="ORI CRUIT HUB" className="ori-brand-link"><BrandLogo /></Link>
      <div className="ori-nav-actions"><LanguageSwitcher currentLanguage={language} /><Link href={home} className="ori-nav-login">{c.navBack}</Link><Link href={demo} className="ori-nav-demo">{c.cta}<ArrowRight size={15} /></Link></div>
    </nav>
    <main>
      <section className="ori-pricing-hero">
        <div><span className="ori-kicker"><i />{c.kicker}</span><h1>{c.title}</h1><p>{c.intro}</p><Link href={demo} className="ori-action ori-action-lime">{c.cta}<ArrowRight size={17} /></Link></div>
        <div className="ori-pricing-geometry" aria-hidden="true"><div /><span>{c.scaleVisual}</span></div>
      </section>
      <section className="ori-pricing-plans">
        <div className="ori-section-label"><span>{c.plansLabel}</span><span>{c.sectionBrand}</span></div>
        <div className="ori-pricing-plans-intro" data-scroll-reveal><h2>{c.plansTitle}</h2><p>{c.intro}</p><small>{c.limitsNote}</small></div>
        <div className="ori-plan-grid">
          {c.tiers.map((tier, index) => {
            return <article key={tier.name} className="ori-plan-card" data-scroll-reveal style={{ transitionDelay: `${index * 55}ms` }}>
              <div className="ori-plan-card-top"><span>0{index + 1} / 05</span><span>{tier.name}</span></div>
              <h3>{tier.name}</h3><p>{tier.description}</p>
              <div className="ori-plan-price">{c.custom}</div>
              <small className="ori-plan-features-label">{c.featuresLabel}</small>
              <ul>{tier.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul>
              <Link className="ori-plan-action" href={demo}>{c.choose}<ArrowRight size={16} /></Link>
            </article>;
          })}
        </div>
      </section>
      <section className="ori-pricing-pilot">
        <div className="ori-pricing-pilot-copy" data-scroll-reveal><span className="ori-kicker"><i />{c.pilotLabel}</span><h2>{c.pilotTitle}</h2><p>{c.pilotText}</p><small>{c.pilotNote}</small></div>
        <div className="ori-pricing-pilot-card" data-scroll-reveal>
          <span>{c.pilotCardLabel}</span><div><small>{c.pilot}</small><strong>{c.proposalBased}</strong></div>
          <ul>{c.includes.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul><Link href={demo} className="ori-action ori-action-black">{c.cta}<ArrowRight size={16} /></Link>
        </div>
      </section>
      <section className="ori-final"><small data-scroll-reveal>{c.faqLabel}</small><h2 data-scroll-reveal>{c.faqTitle}</h2><p data-scroll-reveal>{c.faqText}</p><Link href={demo} className="ori-action ori-action-lime" data-scroll-reveal>{c.cta}<ArrowRight size={17} /></Link></section>
    </main>
    <footer className="ori-footer"><Link href={home} className="ori-brand-link" aria-label="ORI CRUIT HUB — inicio"><BrandLogo variant="green" /></Link><div><Link href={demo}>{c.cta}</Link><Link href={home}>{c.navBack}</Link></div><small>© 2026 ORI CRUIT HUB</small></footer>
  </div>;
}
