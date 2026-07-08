import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import { getBrokerFilterOptions, listBrokerInvoices } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) redirect("/sin-permisos");

  const params = await searchParams;
  const filters = {
    status: typeof params.status === "string" ? params.status : undefined,
    brokerId: typeof params.brokerId === "string" ? params.brokerId : undefined,
    threshold: typeof params.threshold === "string" ? params.threshold : undefined,
    period: typeof params.period === "string" ? params.period : undefined,
  };

  const [invoices, options] = await Promise.all([
    listBrokerInvoices(tenant.organizationId, filters),
    getBrokerFilterOptions(tenant.organizationId),
  ]);

  return (
    <div className="main-content">
      <h1>Broker Invoices</h1>
      <p>Control mensual por intermediario, periodo y umbral de elegibilidad.</p>
      <BrokerModuleNav />

      <form className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <select className="input" name="brokerId" defaultValue={filters.brokerId ?? ""}>
          <option value="">Todos los brokers</option>
          {options.brokers.map((broker) => <option key={broker.id} value={broker.id}>{broker.displayName}</option>)}
        </select>
        <select className="input" name="status" defaultValue={filters.status ?? ""}>
          <option value="">Todos los estados</option>
          {["DRAFT", "READY", "SENT", "PAID", "DISPUTED"].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select className="input" name="threshold" defaultValue={filters.threshold ?? ""}>
          <option value="">Todos los thresholds</option>
          <option value="100">100h</option>
          <option value="200">200h</option>
        </select>
        <input className="input" type="text" name="period" placeholder="Filtrar por periodo u hoja" defaultValue={filters.period ?? ""} />
        <button className="button" type="submit">Filtrar</button>
      </form>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Broker</th>
                <th>Periodo</th>
                <th>Invoice type</th>
                <th>Threshold</th>
                <th>Elegibles</th>
                <th>Base</th>
                <th>VAT</th>
                <th>Final</th>
                <th>Status</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.broker.displayName}</td>
                  <td>{invoice.referencePeriodStart ? new Date(invoice.referencePeriodStart).toLocaleDateString() : "-"} - {invoice.referencePeriodEnd ? new Date(invoice.referencePeriodEnd).toLocaleDateString() : "-"}</td>
                  <td>{invoice.invoiceType || "-"}</td>
                  <td>{invoice.minimumHoursThreshold ?? "-"}</td>
                  <td>{invoice.candidateCountEligible}</td>
                  <td>PLN {Number(invoice.baseTotal).toFixed(2)}</td>
                  <td>PLN {Number(invoice.vatAmount).toFixed(2)}</td>
                  <td>PLN {Number(invoice.finalAmount).toFixed(2)}</td>
                  <td><BrokerStatusBadge value={invoice.status} /></td>
                  <td>
                    <Link href={`/broker-invoices/${invoice.id}`} className="button button-secondary" style={{ textDecoration: "none" }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 ? <tr><td colSpan={10} style={{ textAlign: "center", opacity: 0.6, padding: "2rem" }}>No hay facturas para estos filtros.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
