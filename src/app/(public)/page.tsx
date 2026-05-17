import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Globe2, 
  ArrowRight, 
  FileText, 
  Users, 
  BarChart3,
  CalendarDays
} from "lucide-react";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { localizedHref, normalizeLanguage, t } from "@/lib/i18n";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const labels = t.bind(null, language);
  const loginHref = localizedHref("/login", language);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)', overflowX: 'hidden' }}>
      {/* Navigation */}
      <nav style={{ 
        padding: '1.5rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '4px solid var(--amber-flame)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(11, 5, 0, 0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 100
      }}>
        <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--amber-flame)', letterSpacing: '-0.05em' }}>
          ORI CRUIT <span style={{ color: 'var(--ghost-white)' }}>HUB</span>
        </div>
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
          <Link href="#features" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>{labels("public.nav.features")}</Link>
          <Link href="#pricing" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>{labels("public.nav.pricing")}</Link>
          <LanguageSwitcher currentLanguage={language} />
          <Link href={loginHref} className="button" style={{ fontSize: '0.8rem', padding: '0.5rem 1.25rem' }}>{labels("public.nav.login")}</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ 
        padding: '10rem 2rem', 
        textAlign: 'center', 
        maxWidth: '1200px', 
        margin: '0 auto',
        position: 'relative'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '20%', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: '800px', 
          height: '400px', 
          background: 'radial-gradient(circle, rgba(252, 186, 4, 0.1) 0%, transparent 70%)',
          zIndex: -1 
        }} />

        <h1 style={{ 
          fontSize: 'clamp(3rem, 8vw, 5.5rem)', 
          fontWeight: '900', 
          marginBottom: '2rem', 
          lineHeight: 0.9,
          textTransform: 'uppercase',
          letterSpacing: '-0.04em'
        }}>
          {labels("public.hero.titleA")} <br/>
          <span style={{ color: 'var(--amber-flame)', textShadow: '4px 4px 0px var(--pitch-black)' }}>{labels("public.hero.titleB")}</span>
        </h1>
        <p style={{ 
          fontSize: '1.5rem', 
          marginBottom: '3.5rem', 
          maxWidth: '800px', 
          margin: '0 auto 3.5rem',
          opacity: 0.9,
          fontWeight: '500'
        }}>
          {labels("public.hero.description")}
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={loginHref} className="button" style={{ padding: '1.25rem 2.5rem', fontSize: '1.25rem' }}>
            {labels("public.hero.primaryCta")} <ArrowRight size={24} style={{ marginLeft: '0.5rem' }} />
          </Link>
          <Link href="#demo" className="button button-secondary" style={{ padding: '1.25rem 2.5rem', fontSize: '1.25rem', backgroundColor: 'transparent', border: '2px solid var(--ghost-white)', color: 'var(--ghost-white)' }}>
            {labels("public.hero.secondaryCta")}
          </Link>
        </div>
      </header>

      {/* Problem Section */}
      <section style={{ padding: '6rem 2rem', backgroundColor: '#0f0f0f', borderTop: '4px solid var(--amber-flame)', borderBottom: '4px solid var(--amber-flame)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '4rem', textTransform: 'uppercase' }}>{labels("public.problem.title")}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
            <div style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#ff4d4d', marginBottom: '1.5rem' }}><Zap size={40} /></div>
              <h3 style={{ marginBottom: '1rem' }}>Mensajes Perdidos</h3>
              <p style={{ opacity: 0.7 }}>Pasaportes en hilos de WhatsApp imposibles de encontrar cuando los necesitas.</p>
            </div>
            <div style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#ff4d4d', marginBottom: '1.5rem' }}><FileText size={40} /></div>
              <h3 style={{ marginBottom: '1rem' }}>Errores de Datos</h3>
              <p style={{ opacity: 0.7 }}>Nombres y números mal escritos en Excel que causan rechazos legales masivos.</p>
            </div>
            <div style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#ff4d4d', marginBottom: '1.5rem' }}><CalendarDays size={40} /></div>
              <h3 style={{ marginBottom: '1rem' }}>Logística a Ciegas</h3>
              <p style={{ opacity: 0.7 }}>Nadie sabe quién llega hoy, en qué vuelo o quién debe recogerlos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '8rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
            <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>{labels("public.features.title")}</h2>
            <p style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto' }}>
              {labels("public.features.description")}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem' }}>
            <div className="card" style={{ backgroundColor: '#151515', border: '2px solid var(--amber-flame)', boxShadow: '8px 8px 0px var(--amber-flame)' }}>
              <Users size={32} style={{ color: 'var(--amber-flame)', marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'var(--amber-flame)' }}>ATS Especializado</h3>
              <p>Gestión de pipeline visual diseñada para procesos internacionales con estados personalizados.</p>
            </div>
            <div className="card" style={{ backgroundColor: '#151515', border: '2px solid var(--amber-flame)', boxShadow: '8px 8px 0px var(--amber-flame)' }}>
              <Zap size={32} style={{ color: 'var(--amber-flame)', marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'var(--amber-flame)' }}>OCR de Documentos</h3>
              <p>Sube un pasaporte y deja que nuestra IA extraiga los datos automáticamente en segundos.</p>
            </div>
            <div className="card" style={{ backgroundColor: '#151515', border: '2px solid var(--amber-flame)', boxShadow: '8px 8px 0px var(--amber-flame)' }}>
              <ShieldCheck size={32} style={{ color: 'var(--amber-flame)', marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'var(--amber-flame)' }}>Módulo Legal</h3>
              <p>Revisiones estructuradas de documentos, PESEL y Karta Pobytu con trazabilidad completa.</p>
            </div>
            <div className="card" style={{ backgroundColor: '#151515', border: '2px solid var(--amber-flame)', boxShadow: '8px 8px 0px var(--amber-flame)' }}>
              <Globe2 size={32} style={{ color: 'var(--amber-flame)', marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'var(--amber-flame)' }}>Gestión Logística</h3>
              <p>Coordina vuelos, trenes y transportes. Sincroniza la llegada de tus candidatos en tiempo real.</p>
            </div>
            <div className="card" style={{ backgroundColor: '#151515', border: '2px solid var(--amber-flame)', boxShadow: '8px 8px 0px var(--amber-flame)' }}>
              <BarChart3 size={32} style={{ color: 'var(--amber-flame)', marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'var(--amber-flame)' }}>Reportes Brandeados</h3>
              <p>Genera informes de rendimiento y cumplimiento legal para tus clientes con tu propia marca.</p>
            </div>
            <div className="card" style={{ backgroundColor: '#151515', border: '2px solid var(--amber-flame)', boxShadow: '8px 8px 0px var(--amber-flame)' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--amber-flame)', marginBottom: '1.5rem' }} />
              <h3 style={{ color: 'var(--amber-flame)' }}>Multi-Inquilino (SaaS)</h3>
              <p>Aislamiento total de datos. Tu información es solo tuya, protegida y segura.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '8rem 2rem', backgroundColor: 'var(--ghost-white)', color: 'var(--pitch-black)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
            <h2 style={{ fontSize: '3.5rem', marginBottom: '1rem', textTransform: 'uppercase' }}>{labels("public.pricing.title")}</h2>
            <p style={{ fontSize: '1.25rem' }}>{labels("public.pricing.description")}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {/* FREE */}
            <div className="card" style={{ backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div className="status-badge" style={{ marginBottom: '1rem' }}>Básico</div>
                <h3 style={{ fontSize: '2.5rem' }}>Gratis</h3>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '3rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 25 Candidatos</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 2 Usuarios</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> OCR Limitado</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> Branding ORI CRUIT HUB</li>
              </ul>
              <Link href={loginHref} className="button" style={{ width: '100%' }}>{labels("public.hero.primaryCta")}</Link>
            </div>

            {/* STARTER */}
            <div className="card" style={{ backgroundColor: 'white', border: '4px solid var(--pitch-black)', transform: 'translateY(-10px)' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div className="status-badge active" style={{ marginBottom: '1rem' }}>Popular</div>
                <h3 style={{ fontSize: '2.5rem' }}>€49<span style={{ fontSize: '1rem' }}>/mes</span></h3>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 250 Candidatos</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 5 Usuarios</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> OCR Estándar</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> Exportación XLSX</li>
              </ul>
              <Link href={loginHref} className="button" style={{ width: '100%' }}>Seleccionar Plan</Link>
            </div>

            {/* PRO */}
            <div className="card" style={{ backgroundColor: 'white' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div className="status-badge" style={{ marginBottom: '1rem', backgroundColor: 'var(--pitch-black)', color: 'white' }}>Profesional</div>
                <h3 style={{ fontSize: '2.5rem' }}>€149<span style={{ fontSize: '1rem' }}>/mes</span></h3>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 2500 Candidatos</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 20 Usuarios</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> OCR Completo</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> Paneles Legal/Logística</li>
              </ul>
              <Link href={loginHref} className="button" style={{ width: '100%' }}>Seleccionar Plan</Link>
            </div>

            {/* BUSINESS */}
            <div className="card" style={{ backgroundColor: 'white' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div className="status-badge" style={{ marginBottom: '1rem' }}>Empresa</div>
                <h3 style={{ fontSize: '2.5rem' }}>€349<span style={{ fontSize: '1rem' }}>/mes</span></h3>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 10000 Candidatos</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> 50 Usuarios</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> API de Integración</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="green" /> Branding Propio</li>
              </ul>
              <Link href={loginHref} className="button" style={{ width: '100%' }}>Seleccionar Plan</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '6rem 2rem', 
        borderTop: '4px solid var(--amber-flame)', 
        backgroundColor: 'var(--pitch-black)',
        textAlign: 'center' 
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--amber-flame)', marginBottom: '2rem' }}>
            ORI CRUIT HUB
          </div>
          <p style={{ opacity: 0.6, marginBottom: '3rem' }}>
            {labels("public.footer.description")}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
            <Link href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>{labels("public.nav.features")}</Link>
            <Link href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>{labels("public.nav.pricing")}</Link>
            <Link href={loginHref} style={{ color: 'inherit', textDecoration: 'none' }}>{labels("public.nav.login")}</Link>
            <Link href="/docs" style={{ color: 'inherit', textDecoration: 'none' }}>Documentación</Link>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.4 }}>
            © 2026 ORI CRUIT HUB SaaS. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
