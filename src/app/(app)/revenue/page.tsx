import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { normalizeLanguage, t } from "@/lib/i18n";
import { Calendar, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function RevenueDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "revenue")) redirect("/sin-permisos");

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);

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
    <div className="module-page-shell revenue-page-shell">
      <div className="revenue-page-header">
        <div className="revenue-page-copy">
          <h1>{labels("revenue.title")}</h1>
          <p>{labels("revenue.description")}</p>
        </div>
        <div className="revenue-page-actions">
          <Link href="/leads" className="button">
            {labels("revenue.outreach")}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card revenue-metric-card">
          <div className="card-header">
            <h3>{labels("revenue.contactedLabel")}</h3>
            <Target size={20} />
          </div>
          <div className="revenue-metric-value">{contactedCount}</div>
          <p className="revenue-metric-copy">{labels("revenue.leadToContacted")}</p>
        </div>

        <div className="card revenue-metric-card">
          <div className="card-header">
            <h3>{labels("revenue.activeLeads")}</h3>
            <TrendingUp size={20} />
          </div>
          <div className="revenue-metric-value">{leadsCount}</div>
          <p className="revenue-metric-copy">{labels("revenue.leads")}</p>
        </div>

        <div className="card revenue-metric-card">
          <div className="card-header">
            <h3>{labels("revenue.totalOutreach")}</h3>
            <Calendar size={20} />
          </div>
          <div className="revenue-metric-value">{outreachCount}</div>
          <p className="revenue-metric-copy">{labels("revenue.messagesSent")}</p>
        </div>

        <div className="card revenue-metric-card">
          <div className="card-header">
            <h3>{labels("revenue.conversion")}</h3>
            <TrendingUp size={20} color="#4ade80" />
          </div>
          <div className="revenue-metric-value">{conversionRate.toFixed(1)}%</div>
          <p className="revenue-metric-copy">{labels("revenue.leadToContacted")}</p>
        </div>
      </div>

      <div className="revenue-bottom-grid">
        <div className="card">
          <h2>{labels("revenue.salesFunnel")}</h2>
          <div className="revenue-contact-stages">
            <div className="revenue-contact-stage">
              <span>{labels("revenue.leads")}</span>
              <strong>{leadsCount}</strong>
            </div>
            <div className="revenue-contact-stage revenue-contact-stage--contacted">
              <span>{labels("revenue.contactedLabel")}</span>
              <strong>{contactedCount}</strong>
            </div>
          </div>
        </div>

        <div className="revenue-side-column">
          <div className="card revenue-availability-card">
            <p className="revenue-availability-kicker">{labels("revenue.moneyKicker")}</p>
            <h3>{labels("revenue.noRevenueTitle")}</h3>
            <p>{labels("revenue.noRevenueDescription")}</p>
            <Link href="/leads" className="button button-secondary">{labels("revenue.reviewLeads")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
