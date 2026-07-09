import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import PrintActionsClient from "@/components/ui/PrintActionsClient";
import { getBrokerLeadDetail } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerLeadPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) redirect("/sin-permisos");

  const { id } = await params;
  const lead = await getBrokerLeadDetail(tenant.organizationId, id);
  if (!lead) redirect("/brokers/leads");

  const displayName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Broker lead";

  return (
    <div className="main-content" style={{ maxWidth: 1200 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border-color: #ccc !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: "1rem" }}>
        <a className="button button-secondary" href={`/brokers/leads/${lead.id}`}>
          Volver
        </a>
      </div>

      <h1>{displayName}</h1>
      <p>{lead.sourceCountrySheet} · {lead.email || lead.phone || "Sin contacto"}</p>
      <BrokerModuleNav />
      <PrintActionsClient guideLabel="Puedes guardar esta ficha como PDF desde la impresión del navegador." />

      <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
        <div className="card print-card">
          <h3>Lead type</h3>
          <BrokerStatusBadge value={lead.leadType} />
        </div>
        <div className="card print-card">
          <h3>Raw status</h3>
          <BrokerStatusBadge value={lead.rawStatus} />
        </div>
        <div className="card print-card">
          <h3>Normalized status</h3>
          <BrokerStatusBadge value={lead.normalizedStatus} />
        </div>
        <div className="card print-card">
          <h3>Flow status</h3>
          <BrokerStatusBadge value={lead.flowStatus} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <div className="card print-card">
          <h3>Datos básicos</h3>
          <p><strong>Lead date:</strong> {lead.leadDate ? new Date(lead.leadDate).toLocaleString() : "-"}</p>
          <p><strong>Email:</strong> {lead.email || "-"}</p>
          <p><strong>Teléfono:</strong> {lead.phone || "-"}</p>
          <p><strong>Ciudad:</strong> {lead.city || "-"}</p>
          <p><strong>Supply declarado:</strong> {lead.declaredSupplyText || "-"}</p>
          <p><strong>Broker vinculado:</strong> {lead.broker?.displayName || "-"}</p>
        </div>

        <div className="card print-card">
          <h3>Clasificación</h3>
          <p><strong>Lead type:</strong> <BrokerStatusBadge value={lead.leadType} /></p>
          <p><strong>Raw status:</strong> <BrokerStatusBadge value={lead.rawStatus} /></p>
          <p><strong>Normalized status:</strong> <BrokerStatusBadge value={lead.normalizedStatus} /></p>
          <p><strong>Assigned owner:</strong> {lead.assignedOwner?.name || lead.assignedOwner?.email || "-"}</p>
        </div>

        <div className="card print-card">
          <h3>Automatización</h3>
          <p><strong>Flow status:</strong> <BrokerStatusBadge value={lead.flowStatus} /></p>
          <p><strong>Flow sent date:</strong> {lead.flowSentDate ? new Date(lead.flowSentDate).toLocaleString() : "-"}</p>
          <p><strong>Email status:</strong> <BrokerStatusBadge value={lead.emailStatus} /></p>
          <p><strong>Delivery error:</strong> {lead.deliveryError || "-"}</p>
          <p><strong>Last reply:</strong> {lead.lastReplyDate ? new Date(lead.lastReplyDate).toLocaleString() : "-"}</p>
        </div>
      </div>

      <div className="card print-card" style={{ marginTop: "1rem" }}>
        <h3>Timeline de contactos</h3>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {lead.contactAttempts.map((attempt) => (
            <div key={attempt.id} style={{ border: "1px solid rgba(0,0,0,0.08)", padding: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <strong>Intento #{attempt.attemptNo}</strong>
                <BrokerStatusBadge value={attempt.channel} />
              </div>
              <div style={{ marginTop: "0.5rem" }}><strong>Fecha:</strong> {attempt.contactDate ? new Date(attempt.contactDate).toLocaleString() : "-"}</div>
              <div><strong>Resultado:</strong> {attempt.result || "-"}</div>
              <div><strong>Summary:</strong> {attempt.summary || "-"}</div>
              <div><strong>Next step:</strong> {attempt.nextStep || "-"}</div>
              <div><strong>Next step date:</strong> {attempt.nextStepDate ? new Date(attempt.nextStepDate).toLocaleString() : "-"}</div>
            </div>
          ))}
          {lead.contactAttempts.length === 0 ? (
            <div style={{ opacity: 0.6 }}>Sin intentos de contacto importados.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
