import { requireTenant } from "@/lib/tenant";
import { PLAN_LIMITS } from "@/lib/billing/limits";
import { CheckCircle2 } from "lucide-react";

export default async function PlansPage() {
  await requireTenant();

  const plans = [
    { name: "FREE", price: "0€", desc: "Para reclutadores individuales" },
    { name: "STARTER", price: "49€", desc: "Para pequeñas agencias" },
    { name: "PRO", price: "149€", desc: "Para agencias en crecimiento" },
    { name: "BUSINESS", price: "399€", desc: "Para grandes operaciones" },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Planes y Precios</h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.7 }}>Escala tu agencia con las herramientas adecuadas.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        {plans.map((p) => {
          const limits = PLAN_LIMITS[p.name as keyof typeof PLAN_LIMITS];

          return (
            <div key={p.name} className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              border: p.name === 'PRO' ? '2px solid var(--amber-flame)' : '1px solid var(--muted)',
              position: 'relative'
            }}>
              {p.name === 'PRO' && (
                <div style={{ 
                  position: 'absolute', 
                  top: '-12px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  backgroundColor: 'var(--amber-flame)', 
                  color: 'var(--pitch-black)', 
                  padding: '2px 12px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold' 
                }}>RECOMENDADO</div>
              )}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{p.name}</h2>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>{p.price}<span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/mes</span></div>
                <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>{p.desc}</p>
              </div>

              <div style={{ flex: 1, marginBottom: '2rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} color="var(--amber-flame)" />
                    {limits.candidates === Infinity ? 'Candidatos ilimitados' : `${limits.candidates} Candidatos`}
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} color="var(--amber-flame)" />
                    {limits.users === Infinity ? 'Usuarios ilimitados' : `${limits.users} Usuarios`}
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} color="var(--amber-flame)" />
                    {limits.ocrPerMonth === Infinity ? 'OCR ilimitado' : `${limits.ocrPerMonth} Lecturas OCR/mes`}
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} color="var(--amber-flame)" />
                    Dashboard de estadísticas
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} color="var(--amber-flame)" />
                    Soporte por email
                  </li>
                </ul>
              </div>

              <button
                className="button"
                style={{
                  width: '100%',
                  backgroundColor: p.name === 'PRO' ? 'var(--amber-flame)' : 'var(--surface)',
                  color: 'var(--pitch-black)',
                }}
              >
                {p.name === 'FREE' ? 'Plan Actual' : 'Seleccionar Plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
