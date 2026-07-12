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
      <div className="revenue-page-header">
        <div className="revenue-page-copy">
          <h1>{labels("revenue.title")}</h1>
          <p>{labels("revenue.description")}</p>
        </div>
        <div className="revenue-page-actions">
          <button className="button button-secondary">{labels("revenue.export")}</button>
          <Link href="/leads" className="button">
            {labels("revenue.outreach")}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card revenue-metric-card">
          <div className="card-header">
            <h3>{labels("revenue.mrr")}</h3>
            <Banknote size={20} color="var(--amber-flame)" />
          </div>
          <div className="revenue-metric-value">€0</div>
          <p className="revenue-metric-copy">{labels("revenue.goal30").replace("{amount}", "€1,000")}</p>
        </div>

        <div className="card revenue-metric-card">
          <div className="card-header">
            <h3>{labels("revenue.activeLeads")}</h3>
            <Target size={20} />
          </div>
          <div className="revenue-metric-value">{leadsCount}</div>
          <p className="revenue-metric-copy">{labels("revenue.contacted").replace("{count}", String(contactedCount))}</p>
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
          <div className="revenue-funnel">
            <div className="revenue-funnel-step revenue-funnel-step--primary">
              {labels("revenue.leads")} ({leadsCount})
            </div>
            <div className="revenue-funnel-step revenue-funnel-step--secondary">
              {labels("revenue.contacted").replace("{count}", String(contactedCount))}
            </div>
            <div className="revenue-funnel-step revenue-funnel-step--tertiary">
              {labels("revenue.demos")} (0)
            </div>
            <div className="revenue-funnel-step revenue-funnel-step--quaternary">
              {labels("revenue.closures")} (0)
            </div>
          </div>
        </div>

        <div className="revenue-side-column">
          <ReferralWidget code={org?.referralCode || null} />

          <div className="card revenue-checklist-card">
            <h3>{labels("revenue.growthChecklist")}</h3>
            <ul className="revenue-checklist">
              <li className="revenue-checklist-item">
                <input type="checkbox" defaultChecked /> {labels("revenue.checklist.icp")}
              </li>
              <li className="revenue-checklist-item">
                <input type="checkbox" /> {labels("revenue.checklist.linkedin")}
              </li>
              <li className="revenue-checklist-item">
                <input type="checkbox" /> {labels("revenue.checklist.demos")}
              </li>
              <li className="revenue-checklist-item">
                <input type="checkbox" /> {labels("revenue.checklist.publish")}
              </li>
            </ul>
            <button className="button revenue-checklist-button">{labels("revenue.saveProgress")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
