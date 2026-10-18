import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowRight, BarChart3, BriefcaseBusiness, Car, Check, CircleHelp, FileText, LayoutDashboard, LockKeyhole, Settings2, Users } from "lucide-react";
import DashboardOverview from "@/components/DashboardOverview";
import PageHeader from "@/components/ui/PageHeader";
import BrandLogo from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

const sampleMetrics = [
  { id: "candidates", title: "Candidatos activos", value: 148, href: "#dashboard", tone: "default" as const, helper: "En el pipeline", icon: "users" as const },
  { id: "documents", title: "Documentos pendientes", value: 24, href: "#review", tone: "accent" as const, helper: "Necesitan revisión", icon: "clock" as const },
  { id: "legal", title: "En revisión legal", value: 8, href: "#review", tone: "default" as const, helper: "Casos en curso", icon: "alert" as const },
  { id: "arrivals", title: "Listos para llegar", value: 12, href: "#dashboard", tone: "success" as const, helper: "Próxima coordinación", icon: "check" as const },
  { id: "blocked", title: "Casos bloqueados", value: 3, href: "#review", tone: "danger" as const, helper: "Requieren una acción", icon: "alert" as const },
  { id: "expiry", title: "Próximos vencimientos", value: 6, href: "#review", tone: "default" as const, helper: "Dentro de 30 días", icon: "clock" as const },
];

export default function DesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="ori-design-preview">
      <div className="ori-preview-banner">
        <span>ORI / VISUAL STUDY 01</span>
        <span>Datos ficticios · Solo desarrollo</span>
        <Link href="/">Ver portada <ArrowRight size={14} /></Link>
      </div>
      <div className="ori-preview-app" id="dashboard">
        <aside className="ori-preview-sidebar">
          <div className="ori-preview-sidebar-brand"><BrandLogo variant="green-dark" /></div>
          <span className="ori-preview-sidebar-caption">WORKSPACE / 001</span>
          <nav aria-label="Navegación de muestra">
            <div className="ori-preview-nav-group">
              <small>OPERACIÓN</small>
              <a className="active" href="#dashboard"><LayoutDashboard size={17} /> Dashboard</a>
              <a href="#dashboard"><Users size={17} /> Candidatos</a>
              <a href="#review"><FileText size={17} /> Documentos <i>24</i></a>
              <a href="#review"><LockKeyhole size={17} /> Legal</a>
              <a href="#dashboard"><Car size={17} /> Logística</a>
            </div>
            <div className="ori-preview-nav-group">
              <small>PARTNERS</small>
              <a href="#dashboard"><BriefcaseBusiness size={17} /> Brokers</a>
            </div>
            <div className="ori-preview-nav-group">
              <small>ADMINISTRACIÓN</small>
              <a href="#dashboard"><Settings2 size={17} /> Ajustes</a>
            </div>
          </nav>
          <div className="ori-preview-sidebar-foot">PILOT / OPERATIONS<br /><strong>Un espacio. Todo el proceso.</strong></div>
        </aside>
        <main className="ori-preview-main">
          <div className="ori-preview-topline"><span>WORKSPACE / OVERVIEW</span><span>OPERADOR · VISTA DE MUESTRA</span></div>
          <PageHeader
            title="Dashboard."
            eyebrow="FOCO DE HOY / 03 OCT 2026"
            icon={<BarChart3 size={14} />}
            description="Tu operación completa en una vista: lo que avanza, lo que espera y lo que necesita una decisión."
            actions={<a className="button" href="#review">Revisar documentos <ArrowDownRight size={16} /></a>}
          />
          <section className="ori-preview-priority" aria-label="Prioridades">
            <div><small>01 / PENDIENTES DOCUMENTALES</small><strong>24</strong><span>Revisar ahora <ArrowRight size={16} /></span></div>
            <div><small>02 / REVISIÓN LEGAL</small><strong>08</strong><span>Casos asignados <ArrowRight size={16} /></span></div>
            <div><small>03 / LISTOS PARA LLEGAR</small><strong>12</strong><span>Coordinar llegada <ArrowRight size={16} /></span></div>
          </section>
          <div className="ori-preview-section-heading"><div><small>01 / INDICADORES</small><h2>El pulso de la operación.</h2></div><span>ACTUALIZADO HOY ↗</span></div>
          <DashboardOverview metrics={sampleMetrics} />
          <div className="ori-preview-section-heading"><div><small>02 / FLUJO ACTIVO</small><h2>Cada caso, siguiente paso.</h2></div><span>WORKFLOW / 04 STAGES</span></div>
          <div className="ori-preview-flow">
            {[["01", "Captación", "148"], ["02", "Documentación", "24"], ["03", "Revisión legal", "08"], ["04", "Llegada", "12"]].map(([n, label, value]) => <div key={n}><small>{n} / 04</small><strong>{value}</strong><span>{label}</span></div>)}
          </div>
        </main>
      </div>
      <section className="ori-preview-review" id="review">
        <div className="ori-preview-review-intro"><span>ORI / WORKBENCH 02</span><h2>Revisión documental.</h2><p>Archivo y datos extraídos, uno junto al otro. Una composición para comprobar, corregir y decidir sin perder el contexto.</p></div>
        <div className="ori-review-panel ori-preview-review-panel">
          <div className="ori-review-heading"><span>DOCUMENTOS / REVISIÓN 01 DE 24</span><h2>Permiso de residencia.</h2><p>Ejemplo visual con datos ficticios · Revisión pendiente</p></div>
          <div className="ori-review-layout">
            <aside className="ori-review-document" aria-label="Documento ilustrativo">
              <div><span>ARCHIVO ORIGINAL</span><span>PDF / 2 PÁGINAS</span></div>
              <div className="ori-review-document-visual"><div><span>REPUBLIC OF POLAND<br />RESIDENCE PERMIT</span><CircleHelp size={63} strokeWidth={.8} /><strong>DOCUMENT<br />PREVIEW</strong><i /></div></div>
              <div>VISUALIZACIÓN PROTEGIDA / 01</div>
            </aside>
            <div className="ori-review-fields">
              <div className="ori-preview-review-status"><span><i /> EXTRACCIÓN COMPLETA</span><span>5 CAMPOS POR VERIFICAR</span></div>
              <div className="ori-preview-review-card"><small>01 / IDENTIDAD</small><div className="ori-preview-form-grid"><label>Nombre<input readOnly value="Marta" /></label><label>Apellido<input readOnly value="Kowalska" /></label><label>Fecha de nacimiento<input readOnly value="1994-05-21" /></label><label>Nacionalidad<input readOnly value="Polaca" /></label></div></div>
              <div className="ori-preview-review-card"><small>02 / DOCUMENTO</small><div className="ori-preview-form-grid"><label>Número<input readOnly value="ABC 123456" /></label><label>Vencimiento<input readOnly value="2027-11-30" /></label></div></div>
              <div className="ori-preview-review-foot"><span><Check size={15} /> Fuente visible para cada dato</span><button type="button" className="button">Confirmar revisión <ArrowRight size={16} /></button></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
