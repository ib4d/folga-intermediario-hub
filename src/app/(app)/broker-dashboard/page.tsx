import { redirect } from "next/navigation";

import { auth } from "@/auth";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
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
    <div className="main-content">
      <h1>Broker Dashboard</h1>
      <p>KPIs operativos de leads, brokers e invoices del modulo broker.</p>
      <BrokerModuleNav />

      <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
        {[
          ["Total leads importados", metrics.totalLeads],
          ["Leads replied", metrics.repliedLeads],
          ["Leads Candidate", metrics.candidateLeads],
          ["Leads Provider", metrics.providerLeads],
          ["Brokers activos", metrics.activeBrokers],
          ["Facturas acumuladas", metrics.totalInvoices],
          ["Referrals elegibles", metrics.totalEligibleReferrals],
          ["Importe final acumulado", `PLN ${metrics.totalFinalAmount.toFixed(2)}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="card">
            <h3>{label}</h3>
            <div style={{ fontSize: "2.2rem", fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3>Periodo actual</h3>
        <p style={{ marginBottom: "0.5rem", opacity: 0.8 }}>
          Resumen del mes en curso para control operativo rapido.
        </p>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontWeight: 700 }}>
          <span>Facturas del periodo: {metrics.periodInvoices}</span>
          <span>Referrals elegibles del periodo: {metrics.periodEligibleReferrals}</span>
          <span>Importe final del periodo: PLN {metrics.periodFinalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1rem" }}>
        <div className="card">
          <h3>Leads por sourceCountrySheet</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Sheet</th><th>Total</th></tr></thead>
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

        <div className="card">
          <h3>Facturacion por broker</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Broker</th><th>Invoices</th><th>Final</th></tr></thead>
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
