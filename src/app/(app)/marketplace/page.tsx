import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { marketplacePlugins } from "@/plugins";
import { Puzzle, ShieldCheck, Zap } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MarketplacePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "marketplace")) redirect("/sin-permisos");

  return (
    <div className="main-content marketplace-page">
      <div className="marketplace-hero">
        <h1>ORI-OS Marketplace</h1>
        <p>Extiende las capacidades de ORI CRUIT HUB con plugins y agentes de terceros.</p>
      </div>

      <div className="dashboard-grid marketplace-grid">
        {marketplacePlugins.map((plugin) => (
          <div key={plugin.id} className="card marketplace-card">
            <div className="marketplace-card-top">
              <div className="marketplace-plugin-icon">
                <Puzzle size={24} />
              </div>
              <span className="status-badge marketplace-version">v{plugin.version}</span>
            </div>
            <h3>{plugin.name}</h3>
            <p className="marketplace-description">{plugin.description}</p>

            <div className="marketplace-card-footer">
              <div className="marketplace-verification">
                <ShieldCheck size={14} color="#4ade80" /> Verificado
              </div>
              <button className={`button ${plugin.isEnabled ? "button-secondary" : ""}`} disabled={plugin.isEnabled}>
                {plugin.isEnabled ? "Instalado" : "Instalar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card marketplace-cta-card">
        <div className="marketplace-cta">
          <Zap size={32} className="marketplace-cta-icon" />
          <h3>¿Eres Desarrollador?</h3>
          <p>
            Crea tus propios plugins usando el SDK de ORI-OS y monetiza tus integraciones en nuestro marketplace.
          </p>
          <button className="button button-secondary marketplace-cta-button">
            Leer Documentación del SDK
          </button>
        </div>
      </div>
    </div>
  );
}
