import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import QueryPagination from "@/components/ui/QueryPagination";
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
    page: typeof params.page === "string" ? Number(params.page) : 1,
    pageSize: typeof params.limit === "string" ? Number(params.limit) : 20,
  };

  const [invoicesPage, options] = await Promise.all([
    listBrokerInvoices(tenant.organizationId, filters),
    getBrokerFilterOptions(tenant.organizationId),
  ]);

  const exportParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      exportParams.set(key, String(value));
    }
  });
  const pageFinalAmount = invoicesPage.items.reduce((sum, invoice) => sum + Number(invoice.finalAmount ?? 0), 0);
  const pageEligibleCandidates = invoicesPage.items.reduce((sum, invoice) => sum + invoice.candidateCountEligible, 0);

  return (
    <div className="main-content module-page-shell brokers-page-shell broker-invoices-page-shell">
      <PageHeader
        title="Broker Invoices"
        description="Control mensual por intermediario, período y umbral de elegibilidad."
        actions={
          <div className="broker-detail-actions no-print">
            <a className="button button-secondary" href={`/api/broker-invoices/export?${exportParams.toString()}&format=xlsx`}>
              Exportar XLSX
            </a>
            <a className="button button-secondary" href={`/api/broker-invoices/export?${exportParams.toString()}&format=csv`}>
              Exportar CSV
            </a>
          </div>
        }
      />

      <BrokerModuleNav />

      <section className="broker-invoice-summary" aria-label="Resumen de facturación">
        <div className="broker-invoice-summary-heading">
          <div>
            <p className="broker-leads-kicker">LIBRO DE FACTURAS</p>
            <h2>Resumen de facturación</h2>
            <p>Importes calculados sobre esta página de resultados.</p>
          </div>
          <span className="broker-invoice-period-count">
            Página {invoicesPage.pageNumber} de {invoicesPage.totalPages}
          </span>
        </div>
        <div className="broker-invoice-summary-metrics">
          <article>
            <span>Facturas encontradas</span>
            <strong>{invoicesPage.totalItems}</strong>
            <small>Con los filtros actuales</small>
          </article>
          <article>
            <span>Total final en página</span>
            <strong>{new Intl.NumberFormat("es-ES", { style: "currency", currency: "PLN" }).format(pageFinalAmount)}</strong>
            <small>{invoicesPage.items.length} facturas mostradas</small>
          </article>
          <article>
            <span>Candidatos elegibles en página</span>
            <strong>{pageEligibleCandidates}</strong>
            <small>Suma de las facturas mostradas</small>
          </article>
        </div>
      </section>

      <div className="card module-panel broker-filters-grid">
        <form className="dashboard-grid broker-filters-grid">
          <select className="input" name="brokerId" aria-label="Filtrar por broker" defaultValue={filters.brokerId ?? ""}>
            <option value="">Todos los brokers</option>
            {options.brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.displayName}
              </option>
            ))}
          </select>
          <select className="input" name="status" aria-label="Filtrar por estado de factura" defaultValue={filters.status ?? ""}>
            <option value="">Todos los estados</option>
            {["DRAFT", "READY", "SENT", "PAID", "DISPUTED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select className="input" name="threshold" aria-label="Filtrar por umbral" defaultValue={filters.threshold ?? ""}>
            <option value="">Todos los thresholds</option>
            <option value="100">100h</option>
            <option value="200">200h</option>
          </select>
          <input
            className="input"
            type="text"
            name="period"
            placeholder="Filtrar por período o hoja"
            defaultValue={filters.period ?? ""}
          />
          <button className="button" type="submit">
            Filtrar
          </button>
        </form>
      </div>

      <div className="card module-panel">
        <div className="table-container table-container--responsive" role="region" aria-label="Facturas de brokers" tabIndex={0}>
          <table className="broker-table broker-table--invoices">
            <thead>
              <tr>
                <th>Broker</th>
                <th>Período</th>
                <th>Tipo</th>
                <th>Threshold</th>
                <th>Elegibles</th>
                <th>Base</th>
                <th>VAT</th>
                <th>Final</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoicesPage.items.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.broker.displayName}</td>
                  <td>
                    {invoice.referencePeriodStart ? new Date(invoice.referencePeriodStart).toLocaleDateString() : "-"} -{" "}
                    {invoice.referencePeriodEnd ? new Date(invoice.referencePeriodEnd).toLocaleDateString() : "-"}
                  </td>
                  <td>{invoice.invoiceType || "-"}</td>
                  <td>{invoice.minimumHoursThreshold ?? "-"}</td>
                  <td>{invoice.candidateCountEligible}</td>
                  <td>PLN {Number(invoice.baseTotal).toFixed(2)}</td>
                  <td>PLN {Number(invoice.vatAmount).toFixed(2)}</td>
                  <td>PLN {Number(invoice.finalAmount).toFixed(2)}</td>
                  <td>
                    <BrokerStatusBadge value={invoice.status} />
                  </td>
                  <td className="broker-action-cell">
                    <Link href={`/broker-invoices/${invoice.id}`} className="button button-secondary broker-action-button">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {invoicesPage.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="broker-empty-table-state">
                    No hay facturas para estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="broker-pagination-shell">
          <QueryPagination
            label="Facturas"
            pageNumber={invoicesPage.pageNumber}
            totalPages={invoicesPage.totalPages}
            totalItems={invoicesPage.totalItems}
            pageSize={invoicesPage.pageSize}
          />
        </div>
      </div>
    </div>
  );
}
