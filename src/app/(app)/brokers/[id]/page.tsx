import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { generateBrokerInvoiceAction, updateBrokerAction } from "@/app/actions/brokers";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import { getBrokerDetail } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) redirect("/sin-permisos");

  const { id } = await params;
  const broker = await getBrokerDetail(tenant.organizationId, id);
  if (!broker) redirect("/brokers");

  return (
    <div className="main-content">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "start" }}>
        <div>
          <h1>{broker.displayName}</h1>
          <p>{broker.legalOrBillingName || broker.displayName}</p>
        </div>
        <div className="broker-action-row no-print">
          <a className="button button-secondary" href={`/api/brokers/${broker.id}/export?format=xlsx`}>Exportar XLSX</a>
          <a className="button button-secondary" href={`/api/brokers/${broker.id}/export?format=csv`}>Exportar CSV</a>
          <a className="button button-secondary" href={`/brokers/${broker.id}/print`}>Vista impresión</a>
        </div>
      </div>
      <BrokerModuleNav />

      <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
        <div className="card"><h3>Status</h3><BrokerStatusBadge value={broker.status} /></div>
        <div className="card"><h3>Referrals</h3><div style={{ fontSize: "2rem", fontWeight: 900 }}>{broker.metrics.totalReferrals}</div></div>
        <div className="card"><h3>Elegibles</h3><div style={{ fontSize: "2rem", fontWeight: 900 }}>{broker.metrics.eligibleReferrals}</div></div>
        <div className="card"><h3>Final total</h3><div style={{ fontSize: "2rem", fontWeight: 900 }}>PLN {broker.metrics.finalAmountTotal.toFixed(2)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3>Editar broker</h3>
        <form
          action={async (formData) => {
            "use server";
            await updateBrokerAction(broker.id, formData);
          }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}
        >
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Nombre visible</span>
            <input className="input" name="displayName" defaultValue={broker.displayName} required />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Nombre legal</span>
            <input className="input" name="legalOrBillingName" defaultValue={broker.legalOrBillingName || ""} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Pais</span>
            <input className="input" name="country" defaultValue={broker.country || ""} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Ciudad</span>
            <input className="input" name="city" defaultValue={broker.city || ""} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Email</span>
            <input className="input" name="primaryEmail" defaultValue={broker.primaryEmail || ""} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Telefono</span>
            <input className="input" name="primaryPhone" defaultValue={broker.primaryPhone || ""} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Tipo</span>
            <select className="input" name="brokerType" defaultValue={broker.brokerType}>
              {["PROVIDER", "MIXED", "UNKNOWN"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Status</span>
            <select className="input" name="status" defaultValue={broker.status}>
              {["NEW", "TESTING", "ACTIVE", "LOW_PERFORMANCE", "PAUSED", "REJECTED"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Quality rating</span>
            <input className="input" name="qualityRating" type="number" min="0" max="100" step="1" defaultValue={broker.qualityRating ?? ""} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Declared supply</span>
            <input className="input" name="declaredSupplyText" defaultValue={broker.declaredSupplyText || ""} />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", gridColumn: "1 / -1" }}>
            <span>Notes</span>
            <textarea className="input" name="notes" rows={4} defaultValue={broker.notes || ""} />
          </label>
          <div style={{ gridColumn: "1 / -1" }} className="no-print">
            <button className="button" type="submit">Guardar cambios</button>
          </div>
        </form>
      </div>

      <div className="card no-print" style={{ marginBottom: "1rem" }}>
        <h3>Generar factura desde la app</h3>
        <p style={{ marginTop: 0, opacity: 0.75 }}>
          Crea o regenera un borrador mensual a partir de las referrals ya cargadas para este broker.
        </p>
        <form
          action={async (formData) => {
            "use server";
            await generateBrokerInvoiceAction(broker.id, formData);
          }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}
        >
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Periodo</span>
            <input className="input" type="month" name="period" defaultValue={new Date().toISOString().slice(0, 7)} required />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Umbral horas</span>
            <input className="input" type="number" name="minimumHoursThreshold" defaultValue={100} min="0" step="1" />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Invoice type</span>
            <input className="input" name="invoiceType" placeholder="Por persona (mínimo 100h/mes)" />
          </label>
          <div style={{ alignSelf: "end" }}>
            <button className="button" type="submit">Generar borrador</button>
          </div>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card">
          <h3>Datos generales</h3>
          <p><strong>Pais:</strong> {broker.country || "-"}</p>
          <p><strong>Ciudad:</strong> {broker.city || "-"}</p>
          <p><strong>Email:</strong> {broker.primaryEmail || "-"}</p>
          <p><strong>Telefono:</strong> {broker.primaryPhone || "-"}</p>
          <p><strong>Broker type:</strong> <BrokerStatusBadge value={broker.brokerType} /></p>
          <p><strong>Quality rating:</strong> {broker.qualityRating ?? "-"}</p>
          <p><strong>Notes:</strong> {broker.notes || "-"}</p>
        </div>
        <div className="card">
          <h3>Metricas</h3>
          <p><strong>Leads asociados:</strong> {broker.leads.length}</p>
          <p><strong>Referrals asociados:</strong> {broker.referrals.length}</p>
          <p><strong>Facturas asociadas:</strong> {broker.invoices.length}</p>
          <p><strong>Base total:</strong> PLN {broker.metrics.baseTotal.toFixed(2)}</p>
          <p><strong>Final total:</strong> PLN {broker.metrics.finalAmountTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3>Leads asociados</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Tipo</th><th>Status</th></tr></thead>
            <tbody>
              {broker.leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "-"}</td>
                  <td>{lead.email || "-"}</td>
                  <td><BrokerStatusBadge value={lead.leadType} /></td>
                  <td><BrokerStatusBadge value={lead.rawStatus} /></td>
                </tr>
              ))}
              {broker.leads.length === 0 ? <tr><td colSpan={4} style={{ textAlign: "center", opacity: 0.6 }}>Sin leads vinculados.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3>Referrals asociados</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Trabajador</th><th>Status</th><th>Horas</th><th>Threshold</th><th>Elegible</th><th>Final</th></tr></thead>
            <tbody>
              {broker.referrals.map((referral) => (
                <tr key={referral.id}>
                  <td>{referral.workerFullName}</td>
                  <td>{referral.workerStatusRaw || "-"}</td>
                  <td>{referral.hoursWorked ? Number(referral.hoursWorked).toFixed(2) : "-"}</td>
                  <td>{referral.minimumHoursThreshold ?? "-"}</td>
                  <td><BrokerStatusBadge value={referral.minimumHoursMet ? "ELIGIBLE" : "NOT_ELIGIBLE"} /></td>
                  <td>{referral.finalAmount ? `PLN ${Number(referral.finalAmount).toFixed(2)}` : "-"}</td>
                </tr>
              ))}
              {broker.referrals.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center", opacity: 0.6 }}>Sin referrals asociados.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Facturas asociadas</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Periodo</th><th>Tipo</th><th>Threshold</th><th>Elegibles</th><th>Final</th><th>Status</th></tr></thead>
            <tbody>
              {broker.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.referencePeriodStart ? new Date(invoice.referencePeriodStart).toLocaleDateString() : "-"} - {invoice.referencePeriodEnd ? new Date(invoice.referencePeriodEnd).toLocaleDateString() : "-"}</td>
                  <td>{invoice.invoiceType || "-"}</td>
                  <td>{invoice.minimumHoursThreshold ?? "-"}</td>
                  <td>{invoice.candidateCountEligible}</td>
                  <td>PLN {Number(invoice.finalAmount).toFixed(2)}</td>
                  <td><BrokerStatusBadge value={invoice.status} /></td>
                </tr>
              ))}
              {broker.invoices.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center", opacity: 0.6 }}>Sin facturas asociadas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
