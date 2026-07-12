import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import MetricCard from "@/components/ui/MetricCard";
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

  return (
    <div className="main-content module-page-shell">
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

      <div className="card module-panel">
        <div className="page-section-header">
          <div className="page-section-copy">
            <h2 className="page-section-title broker-detail-section-title">Resumen de facturación</h2>
            <p className="page-section-description">
              Filtros por broker, estado, threshold y período. Exporta el corte actual cuando lo necesites.
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          <MetricCard title="Facturas visibles" value={invoicesPage.totalItems} />
          <MetricCard title="Páginas" value={invoicesPage.totalPages} tone="accent" />
          <MetricCard title="Página actual" value={invoicesPage.pageNumber} tone="success" />
          <MetricCard title="Límite por página" value={invoicesPage.pageSize} />
        </div>
      </div>

      <div className="card module-panel broker-filters-grid">
        <form className="dashboard-grid broker-filters-grid">
          <select className="input" name="brokerId" defaultValue={filters.brokerId ?? ""}>
            <option value="">Todos los brokers</option>
            {options.brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.displayName}
              </option>
            ))}
          </select>
          <select className="input" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos los estados</option>
            {["DRAFT", "READY", "SENT", "PAID", "DISPUTED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select className="input" name="threshold" defaultValue={filters.threshold ?? ""}>
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
        <div className="table-container table-container--responsive">
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
