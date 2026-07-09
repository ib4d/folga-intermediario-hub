import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerInvoicePrintClient from "@/components/brokers/BrokerInvoicePrintClient";
import { getBrokerInvoiceDetail } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerInvoicePrintPage({
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
    <div className="main-content" style={{ maxWidth: 1200 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border-color: #ccc !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: "1rem" }}>
        <a className="button button-secondary" href={`/broker-invoices/${invoice.id}`}>Volver</a>
      </div>

      <h1>Factura broker · {invoice.broker.displayName}</h1>
      <p>{invoice.sourceInvoiceSheet} · {invoice.sourceFileName || "sin archivo origen"}</p>

      <BrokerInvoicePrintClient />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card print-card">
          <h3>Cabecera</h3>
          <p><strong>Periodo:</strong> {invoice.referencePeriodStart ? new Date(invoice.referencePeriodStart).toLocaleDateString() : "-"} - {invoice.referencePeriodEnd ? new Date(invoice.referencePeriodEnd).toLocaleDateString() : "-"}</p>
          <p><strong>Invoice type:</strong> {invoice.invoiceType || "-"}</p>
          <p><strong>Threshold:</strong> {invoice.minimumHoursThreshold ?? "-"}</p>
          <p><strong>Rate per person:</strong> {invoice.ratePerPersonPln ? `PLN ${Number(invoice.ratePerPersonPln).toFixed(2)}` : "-"}</p>
          <p><strong>Currency:</strong> {invoice.currency}</p>
          <p><strong>Status:</strong> {invoice.status}</p>
        </div>
        <div className="card print-card">
          <h3>Totales</h3>
          <p><strong>Eligible count:</strong> {invoice.candidateCountEligible}</p>
          <p><strong>Base total:</strong> PLN {Number(invoice.baseTotal).toFixed(2)}</p>
          <p><strong>VAT amount:</strong> PLN {Number(invoice.vatAmount).toFixed(2)}</p>
          <p><strong>Final amount:</strong> PLN {Number(invoice.finalAmount).toFixed(2)}</p>
          <p><strong>Summary warning:</strong> {invoice.summaryMismatchWarning || "-"}</p>
        </div>
        <div className="card print-card">
          <h3>Control</h3>
          <p><strong>Factura ID:</strong> {invoice.id}</p>
          <p><strong>Broker:</strong> {invoice.broker.legalOrBillingName || invoice.broker.displayName}</p>
          <p><strong>Creada:</strong> {new Date(invoice.createdAt).toLocaleString()}</p>
          <p><strong>Actualizada:</strong> {new Date(invoice.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="card print-card">
        <h3>Lineas</h3>
        <div className="table-container">
          <table>
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
                  <td>{line.eligible ? "SI" : "NO"}</td>
                  <td>{line.rateApplied ? `PLN ${Number(line.rateApplied).toFixed(2)}` : "-"}</td>
                  <td>{line.baseAmount ? `PLN ${Number(line.baseAmount).toFixed(2)}` : "-"}</td>
                  <td>{line.vatRate != null ? `${Number(line.vatRate) * 100}%` : "-"}</td>
                  <td>{line.finalAmount ? `PLN ${Number(line.finalAmount).toFixed(2)}` : "-"}</td>
                  <td>{line.notes || "-"}</td>
                </tr>
              ))}
              {invoice.lines.length === 0 ? <tr><td colSpan={10} style={{ textAlign: "center", opacity: 0.6, padding: "2rem" }}>Sin lineas importadas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
