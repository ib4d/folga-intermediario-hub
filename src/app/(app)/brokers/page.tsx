import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, FileSpreadsheet, HandCoins, Users } from "lucide-react";

import { auth } from "@/auth";
import BrokerImportForms from "@/components/brokers/BrokerImportForms";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import QueryPagination from "@/components/ui/QueryPagination";
import { canAccessModule } from "@/lib/permissions";
import { listBrokers } from "@/lib/brokers/queries";
import { requireTenant } from "@/lib/tenant";

export default async function BrokersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) redirect("/sin-permisos");

  const params = await searchParams;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);
  const limit = Math.max(1, Number(typeof params.limit === "string" ? params.limit : 20) || 20);

  const brokersPage = await listBrokers(tenant.organizationId, { page, pageSize: limit });
  const brokers = brokersPage.items;
  const exportParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return (
    <div className="main-content">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h1>Broker Hub</h1>
          <p>Consolidación de intermediarios, leads, referrals y facturación operativa.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/brokers/leads" className="button">Ver leads</Link>
          <Link href="/broker-invoices" className="button button-secondary">Ver facturas</Link>
        </div>
      </div>

      <BrokerModuleNav />

      <div className="dashboard-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="card">
          <div className="card-header"><h3>Brokers</h3><BriefcaseBusiness size={18} /></div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{brokers.length}</div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Activos</h3><Users size={18} /></div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{brokers.filter((item) => item.status === "ACTIVE").length}</div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Referrals acumulados</h3><HandCoins size={18} /></div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>
            {brokers.reduce((sum, item) => sum + item._count.referrals, 0)}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Facturacion acumulada</h3><FileSpreadsheet size={18} /></div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>
            PLN {brokers.reduce((sum, item) => sum + item.accumulatedBilling, 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <BrokerImportForms />
      </div>

      <div className="broker-toolbar no-print">
        <a className="button" href={`/api/brokers/export?${exportParams.toString()}&format=xlsx`}>Exportar XLSX</a>
        <a className="button" href={`/api/brokers/export?${exportParams.toString()}&format=csv`}>Exportar CSV</a>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="broker-table">
            <thead>
              <tr>
                <th>Broker</th>
                <th>País</th>
                <th>Ciudad</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Referrals</th>
                <th>Facturación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {brokers.map((broker) => (
                <tr key={broker.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{broker.displayName}</div>
                    <div style={{ opacity: 0.65, fontSize: "0.8rem" }}>{broker.legalOrBillingName || "-"}</div>
                  </td>
                  <td>{broker.country || "-"}</td>
                  <td>{broker.city || "-"}</td>
                  <td>{broker.primaryEmail || "-"}</td>
                  <td>{broker.primaryPhone || "-"}</td>
                  <td><BrokerStatusBadge value={broker.status} /></td>
                  <td>{broker.qualityRating ?? "-"}</td>
                  <td>{broker._count.referrals}</td>
                  <td>PLN {broker.accumulatedBilling.toFixed(2)}</td>
                  <td className="broker-action-cell">
                    <Link href={`/brokers/${broker.id}`} className="button button-secondary broker-action-button" style={{ textDecoration: "none" }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {brokers.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", opacity: 0.6, padding: "2rem" }}>
                    No hay brokers consolidados todavía. Importa leads o facturación y promueve los leads válidos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <QueryPagination
            label="Brokers"
            pageNumber={brokersPage.pageNumber}
            totalPages={brokersPage.totalPages}
            totalItems={brokersPage.totalItems}
            pageSize={brokersPage.pageSize}
          />
        </div>
      </div>
    </div>
  );
}
