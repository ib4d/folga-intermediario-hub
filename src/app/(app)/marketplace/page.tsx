import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { marketplacePlugins } from "@/plugins";
import { Puzzle, ShieldCheck, Zap } from "lucide-react";

export default async function MarketplacePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "marketplace")) redirect("/sin-permisos");

  return (
    <div className="main-content">
      <div style={{ marginBottom: '2rem' }}>
        <h1>ORI-OS Marketplace</h1>
        <p>Extiende las capacidades de ORI CRUIT HUB con plugins y agentes de terceros.</p>
      </div>

      <div className="dashboard-grid">
        {marketplacePlugins.map(plugin => (
          <div key={plugin.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--amber-flame)', borderRadius: '8px' }}>
                  <Puzzle size={24} />
                </div>
                <span className="status-badge" style={{ fontSize: '0.7rem' }}>v{plugin.version}</span>
              </div>
              <h3>{plugin.name}</h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                {plugin.description}
              </p>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', opacity: 0.6 }}>
                <ShieldCheck size={14} color="#4ade80" /> Verificado
              </div>
              <button 
                className={`button ${plugin.isEnabled ? 'button-secondary' : ''}`}
                style={{ fontSize: '0.8rem' }}
                disabled={plugin.isEnabled}
              >
                {plugin.isEnabled ? "Instalado" : "Instalar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '3rem', border: '1px dashed var(--pitch-black)', backgroundColor: 'transparent' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Zap size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>¿Eres Desarrollador?</h3>
          <p style={{ maxWidth: '500px', margin: '0.5rem auto' }}>
            Crea tus propios plugins usando el SDK de ORI-OS y monetiza tus integraciones en nuestro marketplace.
          </p>
          <button className="button button-secondary" style={{ marginTop: '1rem' }}>
            Leer Documentación del SDK
          </button>
        </div>
      </div>
    </div>
  );
}
