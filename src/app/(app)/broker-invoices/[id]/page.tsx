import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { updateBrokerInvoiceAction } from "@/app/actions/brokers";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import { getBrokerInvoiceDetail } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) redirect("/sin-permisos");

  const { id } = await params;
  const invoice = await getBrokerInvoiceDetail(tenant.organizationId, id);
  if (!invoice) redirect("/broker-invoices");

  return (
    <div className="main-content module-page-shell">
      <PageHeader
        title={`Factura broker · ${invoice.broker.displayName}`}
        description={`${invoice.sourceInvoiceSheet} · ${invoice.sourceFileName || "sin archivo origen"}`}
        actions={
          <div className="broker-detail-actions no-print">
            <a className="button button-secondary" href={`/api/broker-invoices/${invoice.id}/export?format=xlsx`}>
              Exportar XLSX
            </a>
            <a className="button button-secondary" href={`/api/broker-invoices/${invoice.id}/export?format=csv`}>
              Exportar CSV
            </a>
            <Link className="button button-secondary" href={`/broker-invoices/${invoice.id}/print`}>
              Vista de impresión
            </Link>
          </div>
        }
      />

      <BrokerModuleNav />

      <div className="card module-panel">
        <div className="page-section-header">
          <div className="page-section-copy">
            <h2 className="page-section-title broker-detail-section-title">Resumen de factura</h2>
            <p className="page-section-description">
              Edita los parámetros operativos sin perder de vista el impacto contable del período.
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          <MetricCard title="Estado" value={invoice.status} />
          <MetricCard title="Elegibles" value={invoice.candidateCountEligible} />
          <MetricCard title="Base total" value={`PLN ${Number(invoice.baseTotal).toFixed(2)}`} />
          <MetricCard title="VAT total" value={`PLN ${Number(invoice.vatAmount).toFixed(2)}`} />
          <MetricCard title="Final total" value={`PLN ${Number(invoice.finalAmount).toFixed(2)}`} tone="accent" />
        </div>
      </div>

      <div className="broker-detail-grid">
        <div className="card broker-detail-card module-panel">
          <h3>Cabecera</h3>
          <p>
            <strong>Período:</strong>{" "}
            {invoice.referencePeriodStart ? new Date(invoice.referencePeriodStart).toLocaleDateString() : "-"} -{" "}
            {invoice.referencePeriodEnd ? new Date(invoice.referencePeriodEnd).toLocaleDateString() : "-"}
          </p>
          <p>
            <strong>Tipo de invoice:</strong> {invoice.invoiceType || "-"}
          </p>
          <p>
            <strong>Threshold:</strong> {invoice.minimumHoursThreshold ?? "-"}
          </p>
          <p>
            <strong>Rate per person:</strong> {invoice.ratePerPersonPln ? `PLN ${Number(invoice.ratePerPersonPln).toFixed(2)}` : "-"}
          </p>
          <p>
            <strong>Currency:</strong> {invoice.currency}
          </p>
          <p>
            <strong>Status:</strong> <BrokerStatusBadge value={invoice.status} />
          </p>
        </div>

        <div className="card broker-detail-card module-panel">
          <h3>Totales</h3>
          <p>
            <strong>Eligible count:</strong> {invoice.candidateCountEligible}
          </p>
          <p>
            <strong>Base total:</strong> PLN {Number(invoice.baseTotal).toFixed(2)}
          </p>
          <p>
            <strong>VAT amount:</strong> PLN {Number(invoice.vatAmount).toFixed(2)}
          </p>
          <p>
            <strong>Final amount:</strong> PLN {Number(invoice.finalAmount).toFixed(2)}
          </p>
          <p>
            <strong>Summary warning:</strong> {invoice.summaryMismatchWarning || "-"}
          </p>
        </div>

        <div className="card broker-detail-card module-panel">
          <h3>Editar factura</h3>
          <form
            action={async (formData) => {
              "use server";
              await updateBrokerInvoiceAction(invoice.id, formData);
            }}
            className="broker-invoice-form-grid"
          >
            <label className="broker-detail-field">
              <span>Tipo de invoice</span>
              <input className="input" name="invoiceType" defaultValue={invoice.invoiceType || ""} />
            </label>
            <label className="broker-detail-field">
              <span>Rate per person</span>
              <input
                className="input"
                name="ratePerPersonPln"
                type="number"
                step="0.01"
                min="0"
                defaultValue={invoice.ratePerPersonPln ? Number(invoice.ratePerPersonPln) : ""}
              />
            </label>
            <label className="broker-detail-field">
              <span>Estado</span>
              <select className="input" name="status" defaultValue={invoice.status}>
                {["DRAFT", "READY", "SENT", "PAID", "DISPUTED"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="broker-detail-field">
              <span>Notas</span>
              <textarea className="input" name="notes" rows={4} defaultValue={invoice.notes || ""} />
            </label>
            <button className="button" type="submit">
              Guardar cambios
            </button>
          </form>
          <div className="broker-detail-actions broker-detail-actions--stacked no-print">
            <a className="button" href={`/api/broker-invoices/${invoice.id}/export?format=xlsx`}>
              Exportar XLSX
            </a>
            <a className="button" href={`/api/broker-invoices/${invoice.id}/export?format=csv`}>
              Exportar CSV
            </a>
            <Link className="button button-secondary" href={`/broker-invoices/${invoice.id}/print`}>
              Vista de impresión
            </Link>
          </div>
        </div>
      </div>

      <div className="card module-panel">
        <h3>Líneas</h3>
        <div className="table-container table-container--responsive">
          <table className="broker-table">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Status</th>
                <th>Horas</th>
                <th>Threshold</th>
                <th>Elegible</th>
                <th>Rate</th>
                <th>Base</th>
                <th>VAT</th>
                <th>Final</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.workerFullName}</td>
                  <td>{line.workerStatusRaw || "-"}</td>
                  <td>{line.hoursWorked ? Number(line.hoursWorked).toFixed(2) : "-"}</td>
                  <td>{line.minimumHoursThreshold ?? "-"}</td>
                  <td>
                    <BrokerStatusBadge value={line.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE"} />
                  </td>
                  <td>{line.rateApplied ? `PLN ${Number(line.rateApplied).toFixed(2)}` : "-"}</td>
                  <td>{line.baseAmount ? `PLN ${Number(line.baseAmount).toFixed(2)}` : "-"}</td>
                  <td>{line.vatRate != null ? `${Number(line.vatRate) * 100}%` : "-"}</td>
                  <td>{line.finalAmount ? `PLN ${Number(line.finalAmount).toFixed(2)}` : "-"}</td>
                  <td>{line.notes || "-"}</td>
                </tr>
              ))}
              {invoice.lines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="broker-detail-empty">
                    Sin líneas importadas.
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
