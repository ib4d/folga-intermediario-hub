import Link from "next/link";
import { ArrowDownRight, ArrowRight, Check, MoveUpRight } from "lucide-react";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import BrandLogo from "@/components/BrandLogo";
import ScrollRevealObserver from "@/components/ScrollRevealObserver";
import MarketingScrollTop from "@/components/public/MarketingScrollTop";
import { localizedHref, normalizeLanguage } from "@/lib/i18n";
import { publicPageMetadata } from "@/lib/public-seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const localized = {
    es: { title: "Gestión de reclutamiento internacional | ORI CRUIT HUB", description: "Coordina candidatos, documentos, revisión y logística en un flujo de trabajo para agencias de reclutamiento internacional." },
    en: { title: "International recruitment workflow | ORI CRUIT HUB", description: "Coordinate candidates, documents, reviews, and logistics in one workflow for international recruitment agencies." },
    pl: { title: "Proces rekrutacji międzynarodowej | ORI CRUIT HUB", description: "Koordynuj kandydatów, dokumenty, weryfikację i logistykę w jednym procesie dla agencji rekrutacyjnych." },
  }[language];
  return publicPageMetadata({ language, path: "/", ...localized });
}

const content = {
  es: {
    nav: ["El sistema", "Proceso", "Seguridad", "Precios"], signIn: "Acceder", demo: "Solicitar demo", discover: "Explorar el sistema",
    heroScroll: "DESPLÁZATE PARA DESCUBRIR ↓", navLabel: "Navegación principal", regionLabel: "EUROPA ↔ LATAM", artBrand: "ORI / OPERACIONES", artTitle: ["RECLUTAMIENTO", "COMO SISTEMA"], productProgress: "TRABAJO ORGANIZADO / PROGRESO VISIBLE", previewSection: "OPERACIONES / 01", previewTitle: "Resumen", previewWorkflow: "FLUJO / ESTADO", previewFigure: "FIGURA / 02", nextLabel: "ORI CRUIT HUB / SIGUIENTE PASO",
    eyebrow: "RECLUTAMIENTO INTERNACIONAL / EUROPA ↔ LATAM", first: "Todo el proceso.", second: "Una sola vista.",
    lead: "Coordina candidatos, documentos, revisión legal y llegadas desde un espacio de trabajo diseñado para agencias que operan entre países.",
    caseLabel: "01 / UN SISTEMA MÁS CLARO", caseTitle: "Cuando todo avanza, necesitas verlo todo.",
    caseText: "Los datos dispersos en hojas, mensajes y archivos ralentizan cada incorporación. ORI CRUIT HUB reúne el trabajo diario, sus responsables y los próximos pasos.",
    steps: ["Captación", "Documentos", "Revisión legal", "Logística"],
    productLabel: "02 / ESPACIO DE TRABAJO", productTitle: "Diseñado para decidir con contexto.",
    productText: "Una visión de las prioridades de hoy y el detalle que necesitas para resolverlas.",
    metric: ["Documentos pendientes", "Revisión legal", "Listos para llegar"], illustrative: "VISTA ILUSTRATIVA DEL PRODUCTO",
    workflowLabel: "03 / DEL INGRESO A LA LLEGADA", workflowTitle: "Un recorrido conectado. Equipos coordinados.",
    workflowText: "Cada equipo ve lo que le corresponde y trabaja sobre el mismo expediente. La extracción de datos ayuda a preparar la revisión; las decisiones permanecen en manos de las personas autorizadas.",
    modules: [["Candidatos", "Perfil, estado y actividad en un solo lugar."], ["Documentos", "Carga, extracción y corrección con fuentes visibles."], ["Legal", "Colas de revisión y decisiones motivadas."], ["Logística", "Llegadas, transporte y alojamiento coordinados."]],
    offerLabel: "04 / EMPEZAR CON CRITERIO", offerTitle: "Un piloto empieza con el alcance correcto.",
    offerText: "Empezamos con una demo de datos sintéticos. Si encaja, acordamos versión, alcance de datos y soporte antes de proponer un piloto con datos reales.",
    offerCardLabel: "PROPUESTA DE PILOTO", setup: "Implantación propuesta", cycle: "Piloto guiado propuesto / hasta 30 días", operators: "Hasta 5 operadores, sujeto al alcance", note: "Precio y alcance se confirman por escrito. La demo usa datos sintéticos; el piloto real requiere aprobación de versión y condiciones.",
    proposalBased: "A consultar", resources: "Recursos y herramientas",
    securityLabel: "CONTROL Y TRAZABILIDAD", securityTitle: "Cada expediente, con el acceso adecuado.",
    securityText: "Roles, permisos y actividad registrada para que cada persona trabaje con el contexto que necesita.",
    finalTitle: "Hagamos visible toda la operación.", finalText: "Conversemos sobre el flujo de tu agencia y preparemos una demostración enfocada en tu equipo.",
  },
  en: {
    nav: ["The system", "Workflow", "Security", "Pricing"], signIn: "Sign in", demo: "Request a demo", discover: "Explore the system",
    heroScroll: "SCROLL TO DISCOVER ↓", navLabel: "Main navigation", regionLabel: "EUROPE ↔ LATAM", artBrand: "ORI / OPERATIONS", artTitle: ["RECRUITMENT", "AS A SYSTEM"], productProgress: "ORGANIZED WORK / VISIBLE PROGRESS", previewSection: "OPERATIONS / 01", previewTitle: "Overview", previewWorkflow: "WORKFLOW / STATUS", previewFigure: "FIG / 02", nextLabel: "ORI CRUIT HUB / NEXT STEP",
    eyebrow: "INTERNATIONAL RECRUITMENT / EUROPE ↔ LATAM", first: "The entire process.", second: "One clear view.",
    lead: "Coordinate candidates, documents, legal review and arrivals from a workspace built for agencies operating across borders.",
    caseLabel: "01 / A CLEARER SYSTEM", caseTitle: "When everything moves, you need to see it all.",
    caseText: "Information scattered across sheets, messages and files slows down each placement. ORI CRUIT HUB brings daily work, ownership and next steps together.",
    steps: ["Sourcing", "Documents", "Legal review", "Logistics"],
    productLabel: "02 / WORKSPACE", productTitle: "Designed for decisions in context.",
    productText: "A view of today's priorities and the detail you need to resolve them.",
    metric: ["Documents pending", "Legal review", "Ready to arrive"], illustrative: "ILLUSTRATIVE PRODUCT VIEW",
    workflowLabel: "03 / FROM INTAKE TO ARRIVAL", workflowTitle: "One connected journey. Coordinated teams.",
    workflowText: "Each team sees what it needs and works from the same record. Data extraction supports review; authorized people make the decisions.",
    modules: [["Candidates", "Profile, status and activity in one place."], ["Documents", "Upload, extraction and correction with visible sources."], ["Legal", "Review queues and reasoned decisions."], ["Logistics", "Coordinated arrivals, transport and accommodation."]],
    offerLabel: "04 / START WITH PURPOSE", offerTitle: "A pilot starts with the right scope.",
    offerText: "We start with a synthetic-data demo. If it fits, we agree the release, data scope and support before proposing a real-data pilot.",
    offerCardLabel: "PILOT PROPOSAL", setup: "Proposed setup", cycle: "Proposed guided pilot / up to 30 days", operators: "Up to 5 operators, subject to scope", note: "Price and scope are confirmed in writing. Demos use synthetic data; a real-data pilot requires release and terms approval.", proposalBased: "On request", resources: "Resources and tools",
    securityLabel: "CONTROL AND TRACEABILITY", securityTitle: "The right access for every record.",
    securityText: "Roles, permissions and recorded activity give each person the context they need to work.",
    finalTitle: "Make the whole operation visible.", finalText: "Let's discuss your agency's workflow and prepare a demo focused on your team.",
  },
  pl: {
    nav: ["System", "Proces", "Bezpieczeństwo", "Cennik"], signIn: "Zaloguj się", demo: "Umów prezentację", discover: "Poznaj system",
    heroScroll: "PRZEWIŃ, ABY ODKRYĆ ↓", navLabel: "Nawigacja główna", regionLabel: "EUROPA ↔ AMERYKA ŁACIŃSKA", artBrand: "ORI / OPERACJE", artTitle: ["REKRUTACJA", "JAKO SYSTEM"], productProgress: "UPORZĄDKOWANA PRACA / WIDOCZNY POSTĘP", previewSection: "OPERACJE / 01", previewTitle: "Przegląd", previewWorkflow: "PROCES / STATUS", previewFigure: "RYS. / 02", nextLabel: "ORI CRUIT HUB / NASTĘPNY KROK",
    eyebrow: "REKRUTACJA MIĘDZYNARODOWA / EUROPA ↔ LATAM", first: "Cały proces.", second: "Jeden obraz.",
    lead: "Koordynuj kandydatów, dokumenty, weryfikację prawną i przyjazdy w jednym miejscu pracy dla agencji działających międzynarodowo.",
    caseLabel: "01 / PRZEJRZYSTY SYSTEM", caseTitle: "Gdy wszystko jest w ruchu, potrzebujesz pełnego obrazu.",
    caseText: "Dane rozproszone w arkuszach, wiadomościach i plikach spowalniają proces. ORI CRUIT HUB łączy codzienną pracę, osoby odpowiedzialne i kolejne kroki.",
    steps: ["Pozyskiwanie", "Dokumenty", "Weryfikacja prawna", "Logistyka"],
    productLabel: "02 / MIEJSCE PRACY", productTitle: "Decyzje podejmowane z pełnym kontekstem.",
    productText: "Widok dzisiejszych priorytetów i szczegóły potrzebne do ich rozwiązania.",
    metric: ["Brakujące dokumenty", "Weryfikacja prawna", "Gotowi do przyjazdu"], illustrative: "POGLĄDOWY WIDOK PRODUKTU",
    workflowLabel: "03 / OD ZGŁOSZENIA DO PRZYJAZDU", workflowTitle: "Jeden proces. Skoordynowane zespoły.",
    workflowText: "Każdy zespół widzi właściwe informacje i pracuje na tej samej sprawie. Odczyt danych pomaga weryfikować dokumenty; decyzje podejmują uprawnione osoby.",
    modules: [["Kandydaci", "Profil, status i aktywność w jednym miejscu."], ["Dokumenty", "Przesyłanie, odczyt i poprawki z widocznym źródłem danych."], ["Prawo", "Kolejki weryfikacji i uzasadnione decyzje."], ["Logistyka", "Koordynacja przyjazdu, transportu i zakwaterowania."]],
    offerLabel: "04 / DOBRY POCZĄTEK", offerTitle: "Dobry pilotaż zaczyna się od właściwego zakresu.",
    offerText: "Zaczynamy od prezentacji z danymi syntetycznymi. Jeśli proces odpowiada potrzebom, przed propozycją pilotażu z prawdziwymi danymi uzgadniamy wersję, zakres i wsparcie.",
    offerCardLabel: "PROPOZYCJA PILOTAŻU", setup: "Proponowane wdrożenie", cycle: "Proponowany pilotaż / do 30 dni", operators: "Do 5 operatorów, zgodnie z zakresem", note: "Cenę i zakres potwierdzamy na piśmie. Prezentacja wykorzystuje dane syntetyczne; pilotaż z prawdziwymi danymi wymaga zatwierdzenia wersji i warunków.", proposalBased: "Na zapytanie", resources: "Materiały i narzędzia",
    securityLabel: "KONTROLA I HISTORIA ZMIAN", securityTitle: "Właściwy dostęp do każdej sprawy.",
    securityText: "Role, uprawnienia i historia działań zapewniają każdej osobie kontekst potrzebny do pracy.",
    finalTitle: "Zobacz cały proces w jednym miejscu.", finalText: "Porozmawiajmy o pracy Twojej agencji i przygotujmy prezentację dla zespołu.",
  },
} as const;

function Orbit({ small = false }: { small?: boolean }) {
  return <svg className={`ori-orbit ${small ? "ori-orbit-small" : ""}`} viewBox="0 0 600 600" aria-hidden="true">
    <circle cx="300" cy="300" r="242" /><circle cx="300" cy="300" r="184" /><circle cx="300" cy="300" r="126" /><circle cx="300" cy="300" r="69" />
    <path d="M300 58v484M58 300h484M128 128l344 344M472 128 128 472" className="ori-orbit-guides" />
    <circle cx="300" cy="58" r="12" className="ori-orbit-point ori-orbit-point-lime" />
    <circle cx="484" cy="300" r="10" className="ori-orbit-point ori-orbit-point-stone" />
    <circle cx="300" cy="426" r="10" className="ori-orbit-point ori-orbit-point-green" />
    <circle cx="231" cy="300" r="9" className="ori-orbit-point ori-orbit-point-lime" />
    <circle cx="300" cy="300" r="19" className="ori-orbit-center" />
  </svg>;
}

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const c = content[language];
  const demo = localizedHref("/demo", language);
  const pricing = localizedHref("/pricing", language);
  const security = localizedHref("/security", language);
  const resources = localizedHref("/resources", language);
  const login = localizedHref("/login", language);

  return <div id="top" className="ori-landing">
    <ScrollRevealObserver />
    <MarketingScrollTop label={language === "es" ? "Volver arriba" : language === "pl" ? "Wróć na górę" : "Back to top"} />
    <nav className="ori-nav" aria-label={c.navLabel}>
      <Link href={localizedHref("/", language)} aria-label="ORI CRUIT HUB" className="ori-brand-link"><BrandLogo /></Link>
      <div className="ori-nav-links"><Link href="#system">{c.nav[0]}</Link><Link href="#workflow">{c.nav[1]}</Link><Link href={security}>{c.nav[2]}</Link><Link href={pricing}>{c.nav[3]}</Link></div>
      <div className="ori-nav-actions"><LanguageSwitcher currentLanguage={language} /><Link href={login} className="ori-nav-login">{c.signIn}</Link><Link href={demo} className="ori-nav-demo">{c.demo}<ArrowRight size={15} /></Link></div>
    </nav>

    <main>
      <section className="ori-hero" aria-labelledby="ori-hero-title">
        <div className="ori-hero-content"><div className="ori-kicker"><i />{c.eyebrow}</div><h1 id="ori-hero-title"><span className="ori-hero-line">{c.first}</span><br /><em>{c.second}</em></h1><p>{c.lead}</p><div className="ori-hero-actions"><Link href={demo} className="ori-action ori-action-lime">{c.demo}<ArrowRight size={18} /></Link><Link href="#system" className="ori-action ori-action-outline">{c.discover}<ArrowDownRight size={18} /></Link></div><div className="ori-hero-foot"><span>01 / 04</span><span>{c.heroScroll}</span></div></div>
        <div className="ori-hero-graphic"><div className="ori-art-head"><span>{c.artBrand}</span><span>001—004</span></div><Orbit /><div className="ori-art-foot"><span>{c.artTitle[0]}<br />{c.artTitle[1]}</span><span>{c.regionLabel}</span></div></div>
      </section>

      <section id="system" className="ori-section ori-overview"><div className="ori-section-label"><span>{c.caseLabel}</span><span>↘</span></div><div className="ori-overview-copy"><h2 data-scroll-reveal>{c.caseTitle}</h2><div data-scroll-reveal><p>{c.caseText}</p><Link href="#workflow" className="ori-text-link">{c.discover}<ArrowRight size={17} /></Link></div></div><div className="ori-step-rail">{c.steps.map((step, index) => <div key={step} data-scroll-reveal style={{ transitionDelay: `${index * 70}ms` }}><span>0{index + 1}</span><strong>{step}</strong><MoveUpRight size={17} /></div>)}</div></section>

      <section className="ori-section ori-product"><div className="ori-product-copy"><div className="ori-section-label"><span>{c.productLabel}</span><span>↗</span></div><h2 data-scroll-reveal>{c.productTitle}</h2><p data-scroll-reveal>{c.productText}</p><div className="ori-product-copy-foot"><span>◉</span> {c.productProgress}</div></div><div className="ori-product-frame" data-scroll-reveal><div className="ori-product-preview"><div className="ori-preview-rail"><BrandLogo compact variant="green-dark" /><i /><i /><i /><i /></div><div className="ori-preview-content"><div className="ori-preview-top">{c.previewSection} <span>ORI CRUIT HUB</span></div><h3>{c.previewTitle}<span>.</span></h3><div className="ori-preview-metrics">{c.metric.map((metric, index) => <div key={metric}><small>0{index + 1} / {metric}</small><strong>{[24, 8, 12][index]}</strong><i /></div>)}</div><div className="ori-preview-bottom"><div><small>{c.previewWorkflow}</small><div className="ori-preview-bars"><i /><i /><i /><i /></div><div className="ori-preview-bars"><i /><i /><i /><i /></div><div className="ori-preview-bars"><i /><i /><i /><i /></div></div><Orbit small /></div></div></div><div className="ori-preview-caption"><span>{c.illustrative}</span><span>{c.previewFigure}</span></div></div></section>

      <section id="workflow" className="ori-section ori-workflow"><div className="ori-section-label"><span>{c.workflowLabel}</span><span>03 / 04</span></div><div className="ori-workflow-intro"><h2 data-scroll-reveal>{c.workflowTitle}</h2><p data-scroll-reveal>{c.workflowText}</p></div><div className="ori-module-grid">{c.modules.map(([title, description], index) => <article key={title} className="ori-module" data-scroll-reveal style={{ transitionDelay: `${index * 75}ms` }}><div><span>0{index + 1} / 04</span><span>↗</span></div><h3>{title}</h3><p>{description}</p><i /></article>)}</div></section>

      <section className="ori-section ori-offer"><div className="ori-offer-copy"><div className="ori-section-label"><span>{c.offerLabel}</span><span>04 / 04</span></div><h2 data-scroll-reveal>{c.offerTitle}</h2><p data-scroll-reveal>{c.offerText}</p><Link href={pricing} className="ori-text-link">{c.nav[3]}<ArrowRight size={17} /></Link></div><div className="ori-offer-card" data-scroll-reveal><small>{c.offerCardLabel}</small><div><span>{c.setup}</span><strong>{c.proposalBased}</strong></div><div><span>{c.cycle}</span><strong>{c.proposalBased}</strong></div><p><Check size={16} />{c.operators}</p><small>{c.note}</small><Link href={demo} className="ori-action ori-action-black">{c.demo}<ArrowRight size={18} /></Link></div></section>

      <section className="ori-security"><div data-scroll-reveal><small>{c.securityLabel}</small><h2>{c.securityTitle}</h2><p>{c.securityText}</p></div><Link href={security} aria-label={c.nav[2]} data-scroll-reveal><ArrowRight size={25} /></Link></section>
      <section className="ori-final"><small data-scroll-reveal>{c.nextLabel}</small><h2 data-scroll-reveal>{c.finalTitle}</h2><p data-scroll-reveal>{c.finalText}</p><Link href={demo} className="ori-action ori-action-lime" data-scroll-reveal>{c.demo}<ArrowRight size={18} /></Link></section>
    </main>
    <footer className="ori-footer"><Link href="#top" className="ori-brand-link" aria-label="ORI CRUIT HUB — top"><BrandLogo variant="green" /></Link><div><Link href={security}>{c.nav[2]}</Link><Link href={pricing}>{c.nav[3]}</Link><Link href={resources}>{c.resources}</Link><Link href={login}>{c.signIn}</Link></div><small>© 2026 ORI CRUIT HUB</small></footer>
  </div>;
}
