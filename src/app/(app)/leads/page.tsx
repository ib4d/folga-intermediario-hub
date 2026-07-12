import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessModule } from "@/lib/permissions";
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
  if (!canAccessModule(tenant.role, "leads")) redirect("/sin-permisos");

  const leads: LeadWithOutreachCount[] = await prisma.lead.findMany({
    where: { organizationId: tenant.organizationId! },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { outreaches: true } } },
  });

  const leadsForOutreach = leads.filter((lead) => lead.status === "NEW" && lead.email);

  return (
    <div className="main-content">
      <div className="leads-page-header">
        <div>
          <h1>Gestión de Leads (Ventas)</h1>
          <p>Usa ORI CRUIT HUB para captar más agencias y partners.</p>
        </div>
        <div className="leads-page-actions">
          <button className="button">
            <Plus size={20} /> Nuevo Lead
          </button>
        </div>
      </div>

      {leadsForOutreach.length > 0 && (
        <div className="leads-page-outreach">
          <OutreachRunner leads={leadsForOutreach} />
        </div>
      )}

      <div className="dashboard-grid leads-page-metrics">
        <div className="card">
          <h3>Leads Totales</h3>
          <div className="leads-page-metric-value">{leads.length}</div>
        </div>
        <div className="card leads-page-metric-card">
          <h3>Contactados</h3>
          <div className="leads-page-metric-value">{leads.filter((l) => l.status === "CONTACTED").length}</div>
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
                    <div className="leads-page-company">{lead.company || "Empresa desconocida"}</div>
                    <div className="leads-page-company-sub">{lead.name}</div>
                  </td>
                  <td>{lead.email}</td>
                  <td>
                    <span className={`status-badge ${lead.status === "CONTACTED" ? "active" : lead.status === "NEW" ? "warning" : ""}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    <div className="leads-page-outreach-count">
                      <TrendingUp size={14} /> {lead._count.outreaches} pasos
                    </div>
                  </td>
                  <td>
                    <div className="leads-page-row-actions">
                      <Link href={`/leads/${lead.id}`} className="button button-secondary leads-page-icon-button">
                        <Mail size={16} />
                      </Link>
                      <button className="button button-secondary leads-page-icon-button">
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="leads-page-empty">
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
