import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, FileSpreadsheet, HandCoins, Users } from "lucide-react";

import { auth } from "@/auth";
import BrokerImportForms from "@/components/brokers/BrokerImportForms";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import QueryPagination from "@/components/ui/QueryPagination";
import { listBrokers } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

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
  const [brokerStatuses, referralCount, invoiceTotals] = await Promise.all([
    prisma.broker.groupBy({
      by: ["status"],
      where: { organizationId: tenant.organizationId },
      _count: { _all: true },
    }),
    prisma.workerReferral.count({ where: { organizationId: tenant.organizationId } }),
    prisma.brokerInvoice.aggregate({
      where: { organizationId: tenant.organizationId },
      _sum: { finalAmount: true },
    }),
  ]);
  const activeBrokerCount = brokerStatuses.find((entry) => entry.status === "ACTIVE")?._count._all ?? 0;
  const exportParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return (
    <div className="module-page-shell brokers-page-shell">
      <PageHeader
        eyebrow="NETWORK / BROKERS"
        title="Broker Hub"
        description="Consolidación de intermediarios, leads, referrals y facturación operativa."
        actions={
          <>
            <Link href="/brokers/leads" className="button">
              Ver leads
            </Link>
            <Link href="/broker-invoices" className="button button-secondary">
              Ver facturas
            </Link>
          </>
        }
      />

      <BrokerModuleNav />

      <div className="dashboard-grid">
        <div className="card module-panel module-panel--tight">
          <div className="card-header">
            <h3>Brokers</h3>
            <BriefcaseBusiness size={18} />
          </div>
          <div className="broker-metric-value">{brokersPage.totalItems}</div>
        </div>
        <div className="card module-panel module-panel--tight">
          <div className="card-header">
            <h3>Activos</h3>
            <Users size={18} />
          </div>
          <div className="broker-metric-value">{activeBrokerCount}</div>
        </div>
        <div className="card module-panel module-panel--tight">
          <div className="card-header">
            <h3>Referrals acumulados</h3>
            <HandCoins size={18} />
          </div>
          <div className="broker-metric-value">{referralCount}</div>
        </div>
        <div className="card module-panel module-panel--tight">
          <div className="card-header">
            <h3>Facturación acumulada</h3>
            <FileSpreadsheet size={18} />
          </div>
          <div className="broker-metric-value">
            PLN {Number(invoiceTotals._sum.finalAmount ?? 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="broker-toolbar no-print">
        <a className="button" href={`/api/brokers/export?${exportParams.toString()}&format=xlsx`}>
          Exportar XLSX
        </a>
        <a className="button" href={`/api/brokers/export?${exportParams.toString()}&format=csv`}>
          Exportar CSV
        </a>
      </div>

      <div className="card module-panel">
        <div className="page-section-header broker-directory-header">
          <div className="page-section-copy">
            <h2 className="page-section-title">Directorio de brokers</h2>
            <p className="page-section-description">{brokersPage.totalItems} intermediarios registrados en esta organización.</p>
          </div>
          <span className="broker-directory-page-count">{brokers.length} visibles · página {brokersPage.pageNumber} de {brokersPage.totalPages}</span>
        </div>
        {brokers.length === 0 ? (
          <div className="broker-empty-workspace">
            <div className="broker-empty-workspace-index">DIRECTORIO / 00</div>
            <p>No hay brokers consolidados todavía. Importa leads o facturación y promueve los leads válidos.</p>
            <Link href="#broker-import" className="button button-secondary">
              Ir a importación
            </Link>
          </div>
        ) : (
          <div className="table-container table-container--responsive">
            <table className="broker-table broker-table--brokers">
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
                      <div className="broker-name-primary">{broker.displayName}</div>
                      <div className="broker-name-secondary">{broker.legalOrBillingName || "-"}</div>
                    </td>
                    <td>{broker.country || "-"}</td>
                    <td>{broker.city || "-"}</td>
                    <td>{broker.primaryEmail || "-"}</td>
                    <td>{broker.primaryPhone || "-"}</td>
                    <td>
                      <BrokerStatusBadge value={broker.status} />
                    </td>
                    <td>{broker.qualityRating ?? "-"}</td>
                    <td>{broker._count.referrals}</td>
                    <td>PLN {broker.accumulatedBilling.toFixed(2)}</td>
                    <td className="broker-action-cell">
                      <Link href={`/brokers/${broker.id}`} className="button button-secondary broker-action-button">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="broker-pagination-shell">
          <QueryPagination
            label="Brokers"
            pageNumber={brokersPage.pageNumber}
            totalPages={brokersPage.totalPages}
            totalItems={brokersPage.totalItems}
            pageSize={brokersPage.pageSize}
          />
        </div>
      </div>

      <div id="broker-import" className="module-panel broker-import-panel">
        <BrokerImportForms />
      </div>
    </div>
  );
}
