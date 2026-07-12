import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { promoteBrokerLeadAction, updateBrokerLeadAction } from "@/app/actions/brokers";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import { getBrokerLeadDetail } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerLeadDetailPage({
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

  return (
    <div className="main-content module-page-shell">
      <PageHeader
        title={[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Broker lead"}
        description={`${lead.sourceCountrySheet} · ${lead.email || lead.phone || "Sin contacto"}`}
        actions={
          <div className="broker-detail-actions no-print">
            <a className="button button-secondary" href={`/api/brokers/leads/${lead.id}/export?format=xlsx`}>
              Exportar XLSX
            </a>
            <a className="button button-secondary" href={`/api/brokers/leads/${lead.id}/export?format=csv`}>
              Exportar CSV
            </a>
            <a className="button button-secondary" href={`/brokers/leads/${lead.id}/print`}>
              Vista de impresión
            </a>
            {lead.broker ? (
              <Link href={`/brokers/${lead.broker.id}`} className="button button-secondary">
                Ir al broker
              </Link>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await promoteBrokerLeadAction(lead.id);
                }}
              >
                <button className="button" type="submit">
                  Promover a broker
                </button>
              </form>
            )}
          </div>
        }
      />

      <BrokerModuleNav />

      <div className="card module-panel">
        <h3>Editar lead</h3>
        <form
          action={async (formData) => {
            "use server";
            await updateBrokerLeadAction(lead.id, formData);
          }}
          className="broker-lead-form-grid"
        >
          <label className="broker-detail-field">
            <span>Nombre</span>
            <input className="input" name="firstName" defaultValue={lead.firstName || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Apellido</span>
            <input className="input" name="lastName" defaultValue={lead.lastName || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Email</span>
            <input className="input" name="email" defaultValue={lead.email || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Teléfono</span>
            <input className="input" name="phone" defaultValue={lead.phone || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Ciudad</span>
            <input className="input" name="city" defaultValue={lead.city || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Supply declarado</span>
            <input className="input" name="declaredSupplyText" defaultValue={lead.declaredSupplyText || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Lead type</span>
            <select className="input" name="leadType" defaultValue={lead.leadType}>
              {["PROVIDER", "CANDIDATE", "UNKNOWN"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="broker-detail-field">
            <span>Raw status</span>
            <input className="input" name="rawStatus" defaultValue={lead.rawStatus || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Normalized status</span>
            <input className="input" name="normalizedStatus" defaultValue={lead.normalizedStatus || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Flow status</span>
            <input className="input" name="flowStatus" defaultValue={lead.flowStatus || ""} />
          </label>
          <label className="broker-detail-field">
            <span>Email status</span>
            <input className="input" name="emailStatus" defaultValue={lead.emailStatus || ""} />
          </label>
          <label className="broker-detail-field broker-lead-note-field">
            <span>Delivery error</span>
            <input className="input" name="deliveryError" defaultValue={lead.deliveryError || ""} />
          </label>
          <label className="broker-detail-field broker-lead-note-field">
            <span>Notes</span>
            <textarea className="input" name="notes" rows={4} defaultValue={lead.notes || ""} />
          </label>
          <div className="broker-detail-field broker-lead-note-field">
            <button className="button" type="submit">
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      <div className="broker-detail-grid">
        <div className="card broker-detail-card module-panel">
          <h3>Datos básicos</h3>
          <p>
            <strong>Lead date:</strong> {lead.leadDate ? new Date(lead.leadDate).toLocaleString() : "-"}
          </p>
          <p>
            <strong>Email:</strong> {lead.email || "-"}
          </p>
          <p>
            <strong>Teléfono:</strong> {lead.phone || "-"}
          </p>
          <p>
            <strong>Ciudad:</strong> {lead.city || "-"}
          </p>
          <p>
            <strong>Supply declarado:</strong> {lead.declaredSupplyText || "-"}
          </p>
          <p>
            <strong>Broker vinculado:</strong> {lead.broker?.displayName || "-"}
          </p>
        </div>

        <div className="card broker-detail-card module-panel">
          <h3>Clasificación</h3>
          <p>
            <strong>Lead type:</strong> <BrokerStatusBadge value={lead.leadType} />
          </p>
          <p>
            <strong>Raw status:</strong> <BrokerStatusBadge value={lead.rawStatus} />
          </p>
          <p>
            <strong>Normalized status:</strong> <BrokerStatusBadge value={lead.normalizedStatus} />
          </p>
          <p>
            <strong>Assigned owner:</strong> {lead.assignedOwner?.name || lead.assignedOwner?.email || "-"}
          </p>
        </div>

        <div className="card broker-detail-card module-panel">
          <h3>Automatización</h3>
          <p>
            <strong>Flow status:</strong> <BrokerStatusBadge value={lead.flowStatus} />
          </p>
          <p>
            <strong>Flow sent date:</strong> {lead.flowSentDate ? new Date(lead.flowSentDate).toLocaleString() : "-"}
          </p>
          <p>
            <strong>Email status:</strong> <BrokerStatusBadge value={lead.emailStatus} />
          </p>
          <p>
            <strong>Delivery error:</strong> {lead.deliveryError || "-"}
          </p>
          <p>
            <strong>Last reply:</strong> {lead.lastReplyDate ? new Date(lead.lastReplyDate).toLocaleString() : "-"}
          </p>
        </div>
      </div>

      <div className="card module-panel">
        <h3>Timeline de contactos</h3>
        <div className="broker-timeline-list">
          {lead.contactAttempts.map((attempt) => (
            <div key={attempt.id} className="broker-timeline-entry">
              <div className="broker-timeline-entry-header">
                <strong>Intento #{attempt.attemptNo}</strong>
                <BrokerStatusBadge value={attempt.channel} />
              </div>
              <div className="broker-timeline-entry-meta">
                <strong>Fecha:</strong> {attempt.contactDate ? new Date(attempt.contactDate).toLocaleString() : "-"}
              </div>
              <div>
                <strong>Resultado:</strong> {attempt.result || "-"}
              </div>
              <div>
                <strong>Summary:</strong> {attempt.summary || "-"}
              </div>
              <div>
                <strong>Next step:</strong> {attempt.nextStep || "-"}
              </div>
              <div>
                <strong>Next step date:</strong> {attempt.nextStepDate ? new Date(attempt.nextStepDate).toLocaleString() : "-"}
              </div>
            </div>
          ))}
          {lead.contactAttempts.length === 0 ? (
            <div className="broker-lead-empty">Sin intentos de contacto importados.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
