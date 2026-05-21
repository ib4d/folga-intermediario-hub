import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { TrendingUp, Target, Banknote, Calendar } from "lucide-react";
import Link from "next/link";
import ReferralWidget from "@/components/ReferralWidget";

export default async function RevenueDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "revenue")) redirect("/sin-permisos");

  // 1. Revenue Metrics (MRR Estimation)
  const org = await prisma.organization.findUnique({
    where: { id: tenant.organizationId! },
    include: { subscription: true }
  });

  // 2. Lead Metrics
  const leadsCount = await prisma.lead.count({
    where: { organizationId: tenant.organizationId! }
  });

  const contactedCount = await prisma.lead.count({
    where: { organizationId: tenant.organizationId!, status: "CONTACTED" }
  });

  const outreachCount = await prisma.outreach.count({
    where: { lead: { organizationId: tenant.organizationId! } }
  });

  // 3. Conversion Pipeline
  const conversionRate = leadsCount > 0 ? (contactedCount / leadsCount) * 100 : 0;

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Revenue Engine 🚀</h1>
          <p>Métricas clave para alcanzar los primeros €10K/mes.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="button button-secondary">Exportar Reporte</button>
          <Link href="/leads" className="button">Ejecutar Outreach Diario</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3>MRR Estimado</h3>
            <Banknote size={20} color="var(--amber-flame)" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>€0</div>
          <p style={{ opacity: 0.6, fontSize: '0.8rem' }}>Meta 30 días: €1,000</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Leads Activos</h3>
            <Target size={20} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{leadsCount}</div>
          <p style={{ opacity: 0.6, fontSize: '0.8rem' }}>{contactedCount} contactados</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Outreach Total</h3>
            <Calendar size={20} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{outreachCount}</div>
          <p style={{ opacity: 0.6, fontSize: '0.8rem' }}>Mensajes enviados</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Conversión L2C</h3>
            <TrendingUp size={20} color="#4ade80" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{conversionRate.toFixed(1)}%</div>
          <p style={{ opacity: 0.6, fontSize: '0.8rem' }}>Lead to Contacted</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div className="card">
          <h2>Embudo de Ventas</h2>
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '100%', height: '40px', backgroundColor: 'var(--amber-flame)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              Leads ({leadsCount})
            </div>
            <div style={{ width: '80%', height: '40px', backgroundColor: '#f59e0b', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', opacity: 0.9 }}>
              Contactados ({contactedCount})
            </div>
            <div style={{ width: '60%', height: '40px', backgroundColor: '#d97706', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', opacity: 0.8 }}>
              Demos (0)
            </div>
            <div style={{ width: '40%', height: '40px', backgroundColor: '#b45309', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', opacity: 0.7 }}>
              Cierres (0)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <ReferralWidget code={org?.referralCode || null} />

          <div className="card" style={{ border: '2px solid var(--pitch-black)' }}>
            <h3>Checklist de Crecimiento</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="checkbox" defaultChecked /> Definir ICP (Agencias PL/DE)
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="checkbox" /> 50 Mensajes en LinkedIn
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="checkbox" /> 3 Demos agendadas
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="checkbox" /> Publicar en LinkedIn
              </li>
            </ul>
            <button className="button" style={{ width: '100%', marginTop: '2rem' }}>Guardar Progreso</button>
          </div>
        </div>
      </div>
    </div>
  );
}
