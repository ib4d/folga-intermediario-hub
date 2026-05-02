import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Bell, CheckCircle, Clock, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    include: { candidate: true },
    take: 50
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT_UPLOADED': return <FileText size={20} />;
      case 'STATUS_CHANGED': return <Clock size={20} />;
      case 'CANDIDATE_CREATED': return <UserPlus size={20} />;
      default: return <Bell size={20} />;
    }
  };

  return (
    <div className="container">
      <div className="hero-section" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h1>Historial de Notificaciones</h1>
        <p>Seguimiento completo de eventos del sistema y cambios de estado.</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              No hay notificaciones registradas.
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} style={{ 
                display: 'flex', 
                gap: '1rem', 
                padding: '1rem', 
                borderBottom: '1px solid var(--muted)', 
                backgroundColor: n.isRead ? 'transparent' : 'rgba(252, 186, 4, 0.1)',
                alignItems: 'flex-start'
              }}>
                <div style={{ 
                  backgroundColor: 'var(--pitch-black)', 
                  color: 'var(--amber-flame)', 
                  padding: '0.5rem', 
                  display: 'flex' 
                }}>
                  {getIcon(n.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{n.message}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    Candidato: <Link href={`/candidatos/${n.candidateId}`} style={{ color: 'var(--pitch-black)', fontWeight: 'bold' }}>{n.candidate.firstName} {n.candidate.lastName}</Link>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    {n.createdAt.toLocaleString()}
                  </div>
                </div>
                {!n.isRead && <div style={{ width: '10px', height: '10px', backgroundColor: 'var(--amber-flame)', borderRadius: '50%', marginTop: '0.5rem' }}></div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
