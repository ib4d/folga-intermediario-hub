import { auth } from "@/auth";
import ReferralWidget from "@/components/ReferralWidget";
import { canAccessModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { normalizeLanguage, t } from "@/lib/i18n";
import { Banknote, Calendar, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function RevenueDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "revenue")) redirect("/sin-permisos");

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);

  const org = await prisma.organization.findUnique({
    where: { id: tenant.organizationId! },
    include: { subscription: true },
  });

  const leadsCount = await prisma.lead.count({
    where: { organizationId: tenant.organizationId! },
  });

  const contactedCount = await prisma.lead.count({
    where: { organizationId: tenant.organizationId!, status: "CONTACTED" },
  });

  const outreachCount = await prisma.outreach.count({
    where: { lead: { organizationId: tenant.organizationId! } },
  });

  const conversionRate = leadsCount > 0 ? (contactedCount / leadsCount) * 100 : 0;

  return (
    <div className="main-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
        <div>
          <h1>{labels("revenue.title")}</h1>
          <p>{labels("revenue.description")}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button className="button button-secondary">{labels("revenue.export")}</button>
          <Link href="/leads" className="button">
            {labels("revenue.outreach")}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3>{labels("revenue.mrr")}</h3>
            <Banknote size={20} color="var(--amber-flame)" />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>€0</div>
          <p style={{ opacity: 0.6, fontSize: "0.8rem" }}>{labels("revenue.goal30").replace("{amount}", "€1,000")}</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{labels("revenue.activeLeads")}</h3>
            <Target size={20} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{leadsCount}</div>
          <p style={{ opacity: 0.6, fontSize: "0.8rem" }}>{labels("revenue.contacted").replace("{count}", String(contactedCount))}</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{labels("revenue.totalOutreach")}</h3>
            <Calendar size={20} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{outreachCount}</div>
          <p style={{ opacity: 0.6, fontSize: "0.8rem" }}>{labels("revenue.messagesSent")}</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{labels("revenue.conversion")}</h3>
            <TrendingUp size={20} color="#4ade80" />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{conversionRate.toFixed(1)}%</div>
          <p style={{ opacity: 0.6, fontSize: "0.8rem" }}>{labels("revenue.leadToContacted")}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginTop: "2rem" }}>
        <div className="card">
          <h2>{labels("revenue.salesFunnel")}</h2>
          <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ width: "100%", height: "40px", backgroundColor: "var(--amber-flame)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
              {labels("revenue.leads")} ({leadsCount})
            </div>
            <div style={{ width: "80%", height: "40px", backgroundColor: "#f59e0b", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", opacity: 0.9 }}>
              {labels("revenue.contacted").replace("{count}", String(contactedCount))}
            </div>
            <div style={{ width: "60%", height: "40px", backgroundColor: "#d97706", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", opacity: 0.8 }}>
              {labels("revenue.demos")} (0)
            </div>
            <div style={{ width: "40%", height: "40px", backgroundColor: "#b45309", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", opacity: 0.7 }}>
              {labels("revenue.closures")} (0)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <ReferralWidget code={org?.referralCode || null} />

          <div className="card" style={{ border: "2px solid var(--pitch-black)" }}>
            <h3>{labels("revenue.growthChecklist")}</h3>
            <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="checkbox" defaultChecked /> {labels("revenue.checklist.icp")}
              </li>
              <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="checkbox" /> {labels("revenue.checklist.linkedin")}
              </li>
              <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="checkbox" /> {labels("revenue.checklist.demos")}
              </li>
              <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input type="checkbox" /> {labels("revenue.checklist.publish")}
              </li>
            </ul>
            <button className="button" style={{ width: "100%", marginTop: "2rem" }}>
              {labels("revenue.saveProgress")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
