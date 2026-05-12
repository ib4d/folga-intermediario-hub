import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Bell, Clock, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { parseStructuredLegalOutcome } from "@/lib/legal-outcome";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const tenant = await requireTenant();

  const notifications = await prisma.notification.findMany({
    where: {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
    },
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "STATUS_UPDATE":
        return "Estado";
      case "CANDIDATE_APPROVED":
        return "Aprobado";
      case "CANDIDATE_CREATED":
      case "NEW_CANDIDATE":
        return "Nuevo candidato";
      case "DOCUMENT_UPLOADED":
        return "Documento";
      default:
        return type.replace(/_/g, " ");
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
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.2rem' }}>
                    {getTypeLabel(n.type)}
                  </div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{n.message}</div>
                  {n.type === "STATUS_UPDATE" ? (() => {
                    const parsed = parseStructuredLegalOutcome(n.message.includes("Motivo:") ? n.message.split("Motivo:").slice(1).join("Motivo:").trim() : null);
                    return parsed?.category ? (
                      <div style={{ marginBottom: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ padding: '0.15rem 0.45rem', borderRadius: '999px', backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '0.7rem', fontWeight: 900 }}>
                          {parsed.category}
                        </span>
                        {parsed.followUpActions.slice(0, 2).map((action) => (
                          <span key={action} style={{ padding: '0.15rem 0.45rem', borderRadius: '999px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.7rem', fontWeight: 700 }}>
                            {action}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })() : null}
                  {n.candidate && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                      Candidato: <Link href={`/candidatos/${n.candidateId}`} style={{ color: 'var(--pitch-black)', fontWeight: 'bold' }}>{n.candidate.firstName} {n.candidate.lastName}</Link>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    {new Date(n.createdAt).toLocaleString()}
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
