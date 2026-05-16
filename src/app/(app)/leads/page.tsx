import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { Plus, Mail, MessageSquare, TrendingUp } from "lucide-react";
import Link from "next/link";
import OutreachRunner from "@/components/sales/OutreachRunner";
import { Prisma } from "@prisma/client";

type LeadWithOutreachCount = Prisma.LeadGetPayload<{
  include: { _count: { select: { outreaches: true } } };
}>;

export default async function LeadsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();

  const leads: LeadWithOutreachCount[] = await prisma.lead.findMany({
    where: { organizationId: tenant.organizationId! },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { outreaches: true } } }
  });

  const leadsForOutreach = leads.filter((lead) => lead.status === "NEW" && lead.email);

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Gestión de Leads (Ventas)</h1>
          <p>Usa ORI CRUIT HUB para captar más agencias y partners.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="button">
            <Plus size={20} /> Nuevo Lead
          </button>
        </div>
      </div>

      {leadsForOutreach.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <OutreachRunner leads={leadsForOutreach} />
        </div>
      )}

      <div className="dashboard-grid" style={{ marginBottom: '3rem' }}>
        <div className="card">
          <h3>Leads Totales</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{leads.length}</div>
        </div>
        <div className="card" style={{ backgroundColor: 'var(--amber-flame)' }}>
          <h3>Contactados</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{leads.filter((l) => l.status === "CONTACTED").length}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Empresa / Nombre</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Outreach</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{lead.company || "Empresa Desconocida"}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{lead.name}</div>
                  </td>
                  <td>{lead.email}</td>
                  <td>
                    <span className={`status-badge ${lead.status === 'CONTACTED' ? 'active' : lead.status === 'NEW' ? 'warning' : ''}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={14} /> {lead._count.outreaches} pasos
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/leads/${lead.id}`} className="button button-secondary" style={{ padding: '0.5rem' }}>
                        <Mail size={16} />
                      </Link>
                      <button className="button button-secondary" style={{ padding: '0.5rem' }}>
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                    No hay leads registrados aún. Empieza por añadir prospectos de LinkedIn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
