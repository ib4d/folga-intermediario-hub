import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LegalReviewQueue from "@/components/legal/LegalReviewQueue";
import { Scale, Users, CheckCircle, XCircle } from "lucide-react";

export default async function LegalPage() {
  const session = await auth();
  if (!session || !["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const candidates = await prisma.candidate.findMany({
    where: { status: "EN_REVISION_LEGAL" },
    include: { documents: true, intermediary: true },
    orderBy: { updatedAt: "desc" },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const stats = await prisma.candidate.groupBy({
    by: ["status"],
    where: { updatedAt: { gte: startOfMonth } },
    _count: true,
  });

  const approvedThisMonth = stats.find(s => s.status === "APROBADO")?._count || 0;
  const rejectedThisMonth = stats.find(s => s.status === "RECHAZADO")?._count || 0;

  return (
    <>
      {/* Hero Header */}
      <div className="hero-section" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '900', textTransform: 'uppercase' }}>
              <Scale size={20} strokeWidth={3} />
              DEPARTAMENTO LEGAL
            </div>
            <h1 style={{ marginBottom: '0.5rem' }}>PANEL DE REVISIÓN</h1>
            <p style={{ color: 'var(--pitch-black)', fontSize: '1.1rem', margin: 0 }}>
              GESTIONE LA VALIDACIÓN DE CANDIDATOS Y DOCUMENTACIÓN OFICIAL.
            </p>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ 
              backgroundColor: 'var(--pitch-black)', 
              color: 'var(--primary)',
              padding: '1rem 1.5rem',
              border: '2px solid var(--pitch-black)',
              boxShadow: '4px 4px 0px rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', gap: '1rem',
              minWidth: '160px'
            }}>
              <Users size={28} strokeWidth={2.5} />
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>{candidates.length}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', opacity: 0.7 }}>EN COLA</div>
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#4ade80', 
              color: 'var(--pitch-black)',
              padding: '1rem 1.5rem',
              border: '2px solid var(--pitch-black)',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: '1rem',
              minWidth: '160px'
            }}>
              <CheckCircle size={28} strokeWidth={2.5} />
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>{approvedThisMonth}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', opacity: 0.7 }}>APROBADOS MES</div>
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#e63946', 
              color: 'white',
              padding: '1rem 1.5rem',
              border: '2px solid var(--pitch-black)',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: '1rem',
              minWidth: '160px'
            }}>
              <XCircle size={28} strokeWidth={2.5} />
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>{rejectedThisMonth}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', opacity: 0.7 }}>RECHAZADOS MES</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ whiteSpace: 'nowrap', fontWeight: '900', textTransform: 'uppercase' }}>CANDIDATOS PENDIENTES</h2>
          <div style={{ flex: 1, height: '2px', backgroundColor: 'var(--pitch-black)' }}></div>
        </div>
        <LegalReviewQueue initialCandidates={candidates as React.ComponentProps<typeof LegalReviewQueue>['initialCandidates']} />
      </section>
    </>
  );
}
