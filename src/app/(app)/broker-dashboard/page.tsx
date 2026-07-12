import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import { getBrokerDashboardMetrics } from "@/lib/brokers/queries";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

export default async function BrokerDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) redirect("/sin-permisos");

  const metrics = await getBrokerDashboardMetrics(tenant.organizationId);

  return (
    <div className="main-content module-page-shell">
      <PageHeader
        title="Broker Dashboard"
        description="KPIs operativos de leads, brokers e invoices del módulo broker."
      />
      <BrokerModuleNav />

      <div className="card module-panel">
        <div className="page-section-header">
          <div className="page-section-copy">
            <h2 className="page-section-title">Resumen operativo</h2>
            <p className="page-section-description">
              Vista rápida del volumen comercial, la actividad de leads y el importe acumulado del módulo.
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          <MetricCard title="Total leads importados" value={metrics.totalLeads} />
          <MetricCard title="Leads replied" value={metrics.repliedLeads} tone="success" />
          <MetricCard title="Leads Candidate" value={metrics.candidateLeads} tone="accent" />
          <MetricCard title="Leads Provider" value={metrics.providerLeads} tone="accent" />
          <MetricCard title="Brokers activos" value={metrics.activeBrokers} tone="success" />
          <MetricCard title="Facturas acumuladas" value={metrics.totalInvoices} />
          <MetricCard title="Referrals elegibles" value={metrics.totalEligibleReferrals} tone="success" />
          <MetricCard title="Importe final acumulado" value={`PLN ${metrics.totalFinalAmount.toFixed(2)}`} tone="accent" />
        </div>
      </div>

      <div className="card module-panel">
        <h3>Periodo actual</h3>
        <p className="broker-summary-copy">Resumen del mes en curso para control operativo rápido.</p>
        <div className="broker-period-summary">
          <span>Facturas del periodo: {metrics.periodInvoices}</span>
          <span>Referrals elegibles del periodo: {metrics.periodEligibleReferrals}</span>
          <span>Importe final del periodo: PLN {metrics.periodFinalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="broker-detail-grid">
        <div className="card module-panel">
          <h3>Leads por sourceCountrySheet</h3>
          <div className="table-container table-container--responsive">
            <table className="broker-table">
              <thead>
                <tr>
                  <th>Sheet</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {metrics.leadsBySheet.map((item) => (
                  <tr key={item.sourceCountrySheet}>
                    <td>{item.sourceCountrySheet}</td>
                    <td>{item._count._all}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card module-panel">
          <h3>Facturación por broker</h3>
          <div className="table-container table-container--responsive">
            <table className="broker-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Invoices</th>
                  <th>Final</th>
                </tr>
              </thead>
              <tbody>
                {metrics.invoicesByBroker.map((item) => (
                  <tr key={item.brokerId}>
                    <td>{item.brokerName}</td>
                    <td>{item.invoiceCount}</td>
                    <td>PLN {item.finalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
