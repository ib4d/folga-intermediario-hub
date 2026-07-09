import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import PrintActionsClient from "@/components/ui/PrintActionsClient";
import { getBrokerDetail } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerPrintPage({
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
    <div className="main-content" style={{ maxWidth: 1200 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border-color: #ccc !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: "1rem" }}>
        <a className="button button-secondary" href={`/brokers/${broker.id}`}>
          Volver
        </a>
      </div>

      <h1>{broker.displayName}</h1>
      <p>{broker.legalOrBillingName || broker.displayName}</p>
      <BrokerModuleNav />
      <PrintActionsClient guideLabel="Puedes guardar esta ficha como PDF desde la impresión del navegador." />

      <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
        <div className="card print-card">
          <h3>Status</h3>
          <BrokerStatusBadge value={broker.status} />
        </div>
        <div className="card print-card">
          <h3>Referrals</h3>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{broker.metrics.totalReferrals}</div>
        </div>
        <div className="card print-card">
          <h3>Elegibles</h3>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{broker.metrics.eligibleReferrals}</div>
        </div>
        <div className="card print-card">
          <h3>Total final</h3>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>PLN {broker.metrics.finalAmountTotal.toFixed(2)}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div className="card print-card">
          <h3>Datos generales</h3>
          <p><strong>País:</strong> {broker.country || "-"}</p>
          <p><strong>Ciudad:</strong> {broker.city || "-"}</p>
          <p><strong>Email:</strong> {broker.primaryEmail || "-"}</p>
          <p><strong>Teléfono:</strong> {broker.primaryPhone || "-"}</p>
          <p><strong>Broker type:</strong> {broker.brokerType || "-"}</p>
          <p><strong>Quality rating:</strong> {broker.qualityRating ?? "-"}</p>
          <p><strong>Notes:</strong> {broker.notes || "-"}</p>
        </div>
        <div className="card print-card">
          <h3>Métricas</h3>
          <p><strong>Leads asociados:</strong> {broker.leads.length}</p>
          <p><strong>Referrals asociados:</strong> {broker.referrals.length}</p>
          <p><strong>Facturas asociadas:</strong> {broker.invoices.length}</p>
          <p><strong>Base total:</strong> PLN {broker.metrics.baseTotal.toFixed(2)}</p>
          <p><strong>Total final:</strong> PLN {broker.metrics.finalAmountTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="card print-card" style={{ marginBottom: "1rem" }}>
        <h3>Leads asociados</h3>
        <div className="table-container">
          <table className="broker-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {broker.leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "-"}</td>
                  <td>{lead.email || "-"}</td>
                  <td>{lead.leadType || "-"}</td>
                  <td>{lead.rawStatus || "-"}</td>
                </tr>
              ))}
              {broker.leads.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", opacity: 0.6 }}>
                    Sin leads vinculados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card print-card" style={{ marginBottom: "1rem" }}>
        <h3>Referrals asociados</h3>
        <div className="table-container">
          <table className="broker-table">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Status</th>
                <th>Horas</th>
                <th>Threshold</th>
                <th>Elegible</th>
                <th>Final</th>
              </tr>
            </thead>
            <tbody>
              {broker.referrals.map((referral) => (
                <tr key={referral.id}>
                  <td>{referral.workerFullName}</td>
                  <td>{referral.workerStatusRaw || "-"}</td>
                  <td>{referral.hoursWorked ? Number(referral.hoursWorked).toFixed(2) : "-"}</td>
                  <td>{referral.minimumHoursThreshold ?? "-"}</td>
                  <td>{referral.minimumHoursMet ? "SI" : "NO"}</td>
                  <td>{referral.finalAmount ? `PLN ${Number(referral.finalAmount).toFixed(2)}` : "-"}</td>
                </tr>
              ))}
              {broker.referrals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", opacity: 0.6 }}>
                    Sin referrals asociados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card print-card">
        <h3>Facturas asociadas</h3>
        <div className="table-container">
          <table className="broker-table">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Tipo</th>
                <th>Threshold</th>
                <th>Elegibles</th>
                <th>Final</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {broker.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    {invoice.referencePeriodStart ? new Date(invoice.referencePeriodStart).toLocaleDateString() : "-"} -{" "}
                    {invoice.referencePeriodEnd ? new Date(invoice.referencePeriodEnd).toLocaleDateString() : "-"}
                  </td>
                  <td>{invoice.invoiceType || "-"}</td>
                  <td>{invoice.minimumHoursThreshold ?? "-"}</td>
                  <td>{invoice.candidateCountEligible}</td>
                  <td>PLN {Number(invoice.finalAmount).toFixed(2)}</td>
                  <td>{invoice.status || "-"}</td>
                </tr>
              ))}
              {broker.invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", opacity: 0.6 }}>
                    Sin facturas asociadas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
