import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import QueryPagination from "@/components/ui/QueryPagination";
import { getBrokerFilterOptions, listBrokerLeads } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerLeadsPage({
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
    sourceCountrySheet: typeof params.sourceCountrySheet === "string" ? params.sourceCountrySheet : undefined,
    leadType: typeof params.leadType === "string" ? params.leadType : undefined,
    rawStatus: typeof params.rawStatus === "string" ? params.rawStatus : undefined,
    normalizedStatus: typeof params.normalizedStatus === "string" ? params.normalizedStatus : undefined,
    flowStatus: typeof params.flowStatus === "string" ? params.flowStatus : undefined,
    emailStatus: typeof params.emailStatus === "string" ? params.emailStatus : undefined,
    query: typeof params.query === "string" ? params.query : undefined,
    page: typeof params.page === "string" ? Number(params.page) : 1,
    pageSize: typeof params.limit === "string" ? Number(params.limit) : 20,
  };

  const [leadsPage, options] = await Promise.all([
    listBrokerLeads(tenant.organizationId, filters),
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
        title="Broker Leads"
        description="Ingesta operativa desde POŚREDNICY LATAM, con foco en Guatemala."
      />

      <BrokerModuleNav />

      <form className="card module-panel dashboard-grid broker-filters-panel">
        <input
          className="input"
          type="text"
          name="query"
          placeholder="Buscar nombre, email, teléfono..."
          defaultValue={filters.query ?? ""}
        />
        <select className="input" name="sourceCountrySheet" defaultValue={filters.sourceCountrySheet ?? ""}>
          <option value="">Todas las hojas</option>
          {options.sourceCountrySheets.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" name="leadType" defaultValue={filters.leadType ?? ""}>
          <option value="">Todos los tipos</option>
          <option value="PROVIDER">Proveedor</option>
          <option value="CANDIDATE">Candidato</option>
          <option value="UNKNOWN">Sin clasificar</option>
        </select>
        <select className="input" name="rawStatus" defaultValue={filters.rawStatus ?? ""}>
          <option value="">Todos los raw status</option>
          {options.rawStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" name="normalizedStatus" defaultValue={filters.normalizedStatus ?? ""}>
          <option value="">Todos los normalized status</option>
          {options.normalizedStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" name="flowStatus" defaultValue={filters.flowStatus ?? ""}>
          <option value="">Todos los flow status</option>
          {options.flowStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className="input" name="emailStatus" defaultValue={filters.emailStatus ?? ""}>
          <option value="">Todos los email status</option>
          {options.emailStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button className="button" type="submit">
          Filtrar
        </button>
      </form>

      <div className="broker-toolbar no-print">
        <a className="button" href={`/api/brokers/leads/export?${exportParams.toString()}&format=xlsx`}>
          Exportar XLSX
        </a>
        <a className="button" href={`/api/brokers/leads/export?${exportParams.toString()}&format=csv`}>
          Exportar CSV
        </a>
      </div>

      <div className="card module-panel">
        <div className="table-container table-container--responsive">
          <table className="broker-table broker-table--leads">
            <thead>
              <tr>
                <th>Lead date</th>
                <th>Nombre completo</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Sheet</th>
                <th>Lead type</th>
                <th>Raw status</th>
                <th>Flow</th>
                <th>Email</th>
                <th>Last reply</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leadsPage.items.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.leadDate ? new Date(lead.leadDate).toLocaleDateString() : "-"}</td>
                  <td>
                    <div className="broker-lead-name">{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "-"}</div>
                    <div className="broker-lead-meta">{lead._count.contactAttempts} intentos</div>
                  </td>
                  <td>{lead.email || "-"}</td>
                  <td>{lead.phone || "-"}</td>
                  <td>{lead.city || "-"}</td>
                  <td>{lead.sourceCountrySheet}</td>
                  <td>
                    <BrokerStatusBadge value={lead.leadType} />
                  </td>
                  <td>
                    <BrokerStatusBadge value={lead.rawStatus} />
                  </td>
                  <td>
                    <BrokerStatusBadge value={lead.flowStatus} />
                  </td>
                  <td>
                    <BrokerStatusBadge value={lead.emailStatus} />
                  </td>
                  <td>{lead.lastReplyDate ? new Date(lead.lastReplyDate).toLocaleString() : "-"}</td>
                  <td className="broker-action-cell">
                    <Link href={`/brokers/leads/${lead.id}`} className="button button-secondary broker-action-button">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {leadsPage.items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="broker-empty-table-state">
                    No hay leads para estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="broker-pagination-shell">
          <QueryPagination
            label="Leads"
            pageNumber={leadsPage.pageNumber}
            totalPages={leadsPage.totalPages}
            totalItems={leadsPage.totalItems}
            pageSize={leadsPage.pageSize}
          />
        </div>
      </div>
    </div>
  );
}
