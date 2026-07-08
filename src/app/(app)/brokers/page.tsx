import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, FileSpreadsheet, HandCoins, Users } from "lucide-react";

import { auth } from "@/auth";
import BrokerImportForms from "@/components/brokers/BrokerImportForms";
import BrokerModuleNav from "@/components/brokers/BrokerModuleNav";
import BrokerStatusBadge from "@/components/brokers/BrokerStatusBadge";
import { canAccessModule } from "@/lib/permissions";
import { listBrokers } from "@/lib/brokers/queries";
import { requireTenant } from "@/lib/tenant";

export default async function BrokersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) redirect("/sin-permisos");

  const brokers = await listBrokers(tenant.organizationId);

  return (
    <div className="main-content">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h1>Broker Hub</h1>
          <p>Consolidacion de intermediarios, leads, referrals y facturacion operativa.</p>
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

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Broker</th>
                <th>Pais</th>
                <th>Ciudad</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Referrals</th>
                <th>Facturacion</th>
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
                  <td>
                    <Link href={`/brokers/${broker.id}`} className="button button-secondary" style={{ textDecoration: "none" }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {brokers.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", opacity: 0.6, padding: "2rem" }}>
                    No hay brokers consolidados todavia. Importa leads o facturacion y promueve los leads validos.
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
