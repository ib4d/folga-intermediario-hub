import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CreditCard, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getPlanLimits } from "@/lib/billing/limits";

export default async function BillingPage() {
  const tenant = await requireTenant();
  
  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId! },
    include: { subscription: true }
  });

  if (!organization) return null;

  const limits = getPlanLimits(organization.plan);

  const usage = await Promise.all([
    prisma.candidate.count({ where: { organizationId: tenant.organizationId! } }),
    prisma.membership.count({ where: { organizationId: tenant.organizationId!, isActive: true } }),
  ]);

  return (
    <div style={{ padding: '2rem' }}>
      <div className="hero-section" style={{ marginBottom: '2rem' }}>
        <h1>Suscripción y Facturación</h1>
        <p>Gestiona tu plan, límites y métodos de pago.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Plan Actual</h3>
            <Zap size={24} color="var(--amber-flame)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--amber-flame)', marginBottom: '1rem' }}>
            {organization.plan}
          </div>
          <Link href="/billing/plans" className="button" style={{ width: '100%' }}>Cambiar Plan</Link>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Método de Pago</h3>
            <CreditCard size={24} />
          </div>
          <div style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
            {organization.subscription?.provider ? 'Gestionado vía Stripe' : 'Sin método de pago'}
          </div>
          <button className="button button-secondary" style={{ width: '100%' }} disabled>Gestionar en Stripe</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Uso de Límites</h2>
        </div>
        <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Candidatos</span>
              <span style={{ fontWeight: 'bold' }}>{usage[0]} / {limits.candidates === Infinity ? '∞' : limits.candidates}</span>
            </div>
            <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                backgroundColor: 'var(--amber-flame)', 
                width: `${Math.min((usage[0] / limits.candidates) * 100, 100)}%` 
              }}></div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Usuarios (Miembros)</span>
              <span style={{ fontWeight: 'bold' }}>{usage[1]} / {limits.users === Infinity ? '∞' : limits.users}</span>
            </div>
            <div style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                backgroundColor: 'var(--amber-flame)', 
                width: `${Math.min((usage[1] / limits.users) * 100, 100)}%` 
              }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
