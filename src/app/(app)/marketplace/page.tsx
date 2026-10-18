import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { marketplacePlugins } from "@/plugins";
import { Info, Puzzle } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MarketplacePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "marketplace")) redirect("/sin-permisos");

  return (
    <div className="module-page-shell marketplace-page">
      <div className="marketplace-hero">
        <h1>Conectores en preparación</h1>
        <p>El catálogo actual documenta prototipos. Estas integraciones aún no se pueden instalar ni activar desde la app.</p>
      </div>

      <div className="dashboard-grid marketplace-grid">
        {marketplacePlugins.map((plugin) => (
          <div key={plugin.id} className="card marketplace-card">
            <div className="marketplace-card-top">
              <div className="marketplace-plugin-icon">
                <Puzzle size={24} />
              </div>
              <span className="status-badge marketplace-version">Prototipo · v{plugin.version}</span>
            </div>
            <h3>{plugin.name}</h3>
            <p className="marketplace-description">{plugin.description}</p>

            <div className="marketplace-card-footer">
              <div className="marketplace-verification">
                <Info size={14} /> Integración no implementada
              </div>
              <button className="button button-secondary" disabled>
                No disponible
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card marketplace-cta-card">
        <div className="marketplace-cta">
          <Info size={28} className="marketplace-cta-icon" />
          <h3>Estado del catálogo</h3>
          <p>
            Los conectores se muestran como referencia de producto. No se ha configurado aquí la conexión con WhatsApp Business ni HRappka.
          </p>
        </div>
      </div>
    </div>
  );
}
