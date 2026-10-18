import Link from "next/link";
import {
  ArrowUpRight, BriefcaseBusiness, Car, FileText, KeyRound, Scale, Settings,
  Store, TrendingUp, Users, Wallet, Palette, BarChart3,
} from "lucide-react";
import { canAccessModule, getAppModuleLabel, type AppModule } from "@/lib/permissions";
import { normalizeLanguage } from "@/lib/i18n";

const moduleEntries: { module: AppModule; href: string; icon: typeof Users; note: string }[] = [
  { module: "candidates", href: "/candidatos", icon: Users, note: "Perfiles, estados y actividad" },
  { module: "documents", href: "/documentos", icon: FileText, note: "Archivos, extracción y revisión" },
  { module: "legal", href: "/legal", icon: Scale, note: "Cola de decisiones y seguimiento" },
  { module: "logistics", href: "/logistica", icon: Car, note: "Llegadas y coordinación operativa" },
  { module: "brokers", href: "/brokers", icon: BriefcaseBusiness, note: "Partners y cartera comercial" },
  { module: "leads", href: "/leads", icon: TrendingUp, note: "Captación y conversión" },
  { module: "revenue", href: "/revenue", icon: Wallet, note: "Ingresos y rendimiento" },
  { module: "billing", href: "/billing", icon: Wallet, note: "Plan y facturación" },
  { module: "marketplace", href: "/marketplace", icon: Store, note: "Servicios del ecosistema" },
  { module: "settings", href: "/ajustes", icon: Settings, note: "Equipo, permisos y configuración" },
  { module: "apiKeys", href: "/ajustes/api-keys", icon: KeyRound, note: "Integraciones y credenciales" },
  { module: "branding", href: "/ajustes/branding", icon: Palette, note: "Identidad del espacio" },
];

export default function DashboardModules({ role, language }: { role: string; language: string }) {
  const typedRole = role as Parameters<typeof canAccessModule>[0];
  const lang = normalizeLanguage(language);
  const modules = moduleEntries.filter((entry) => canAccessModule(typedRole, entry.module));

  return (
    <section className="dashboard-module-directory" aria-labelledby="dashboard-modules-title">
      <div className="dashboard-module-directory-head">
        <div>
          <span className="dashboard-section-kicker"><BarChart3 size={14} /> WORKSPACE / MÓDULOS</span>
          <h2 id="dashboard-modules-title">Tu espacio de trabajo</h2>
          <p>Entra directamente en cada área operativa habilitada para tu perfil.</p>
        </div>
        <span className="dashboard-module-count">{String(modules.length).padStart(2, "0")} ÁREAS</span>
      </div>
      <div className="dashboard-module-grid">
        {modules.map(({ module, href, icon: Icon, note }, index) => (
          <Link href={href} key={module} className={"dashboard-module-card dashboard-module-card-" + (index % 4)}>
            <span className="dashboard-module-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="dashboard-module-icon"><Icon size={19} strokeWidth={1.7} /></span>
            <span className="dashboard-module-copy">
              <strong>{getAppModuleLabel(module, lang)}</strong>
              <small>{note}</small>
            </span>
            <ArrowUpRight className="dashboard-module-arrow" size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
