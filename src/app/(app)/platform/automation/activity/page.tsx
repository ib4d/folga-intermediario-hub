import { auth } from "@/auth";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity } from "lucide-react";
import Link from "next/link";

type AutomationActivityFilter = "all" | "doc-expiring" | "billing-attention" | "plan-pressure";

function getActivityTriggerLabel(type: string, labels: (key: TranslationKey) => string) {
  switch (type) {
    case "DOC_EXPIRING":
      return labels("platform.automationTriggerDocExpiring");
    case "BILLING_SUBSCRIPTION_ATTENTION":
      return labels("platform.automationTriggerBillingAttention");
    case "BILLING_USAGE_PRESSURE":
      return labels("platform.automationTriggerPlanPressure");
    default:
      return type.replace(/_/g, " ");
  }
}

function getActivityStatusLabel(isRead: boolean, labels: (key: TranslationKey) => string) {
  return isRead ? labels("platform.inactive") : labels("platform.active");
}

function getDisplayCandidateName(firstName?: string | null, lastName?: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim();
}

function getActivityFilterLabel(filter: AutomationActivityFilter, labels: (key: TranslationKey) => string) {
  switch (filter) {
    case "doc-expiring":
      return labels("platform.automationActivityFilterDocExpiring");
    case "billing-attention":
      return labels("platform.automationActivityFilterBillingAttention");
    case "plan-pressure":
      return labels("platform.automationActivityFilterPlanPressure");
    default:
      return labels("platform.automationActivityFilterAll");
  }
}

function buildFilterHref(filter: AutomationActivityFilter) {
  return filter === "all" ? "/platform/automation/activity" : `/platform/automation/activity?type=${filter}`;
}

function buildNotificationsHref(filter: AutomationActivityFilter) {
  switch (filter) {
    case "doc-expiring":
      return "/notificaciones?type=doc-expiring";
    case "billing-attention":
      return "/notificaciones?type=billing-attention";
    case "plan-pressure":
      return "/notificaciones?type=billing-pressure";
    default:
      return "/notificaciones";
  }
}

function buildWorkflowHrefFromActivityType(type: string) {
  switch (type) {
    case "DOC_EXPIRING":
      return "/platform/automation?trigger=doc-expiring";
    case "BILLING_SUBSCRIPTION_ATTENTION":
      return "/platform/automation?trigger=billing-attention";
    case "BILLING_USAGE_PRESSURE":
      return "/platform/automation?trigger=plan-pressure";
    default:
      return "/platform/automation";
  }
}

export default async function PlatformAutomationActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  const { type } = await searchParams;
  const selectedFilter: AutomationActivityFilter =
    type === "doc-expiring" || type === "billing-attention" || type === "plan-pressure" ? type : "all";
  const selectedActivityTypes =
    selectedFilter === "doc-expiring"
      ? ["DOC_EXPIRING"]
      : selectedFilter === "billing-attention"
        ? ["BILLING_SUBSCRIPTION_ATTENTION"]
        : selectedFilter === "plan-pressure"
          ? ["BILLING_USAGE_PRESSURE"]
          : ["DOC_EXPIRING", "BILLING_SUBSCRIPTION_ATTENTION", "BILLING_USAGE_PRESSURE"];

  const recentActivityStart = new Date();
  recentActivityStart.setDate(recentActivityStart.getDate() - 30);

  const activities = await prisma.notification.findMany({
    where: {
      createdAt: { gte: recentActivityStart },
      type: {
        in: selectedActivityTypes,
      },
    },
    include: {
      organization: {
        select: { name: true, slug: true },
      },
      candidate: {
        select: { firstName: true, lastName: true },
      },
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalActivities = activities.length;
  const unreadActivities = activities.filter((activity) => !activity.isRead).length;
  const activitiesByType = activities.reduce<Record<string, number>>((acc, activity) => {
    acc[activity.type] = (acc[activity.type] ?? 0) + 1;
    return acc;
  }, {});

  const activityFilters: AutomationActivityFilter[] = ["all", "doc-expiring", "billing-attention", "plan-pressure"];

  return (
    <div className="automation-activity-page">
      <div className="hero-section automation-activity-hero">
        <div className="automation-activity-hero-top">
          <div>
            <h1>{labels("platform.automationActivityTitle")}</h1>
            <p>{labels("platform.automationActivityDescription")}</p>
            <div className="automation-filter-row">
              {activityFilters.map((filter) => (
                <Link key={filter} href={buildFilterHref(filter)} className={`status-badge automation-chip ${selectedFilter === filter ? "active" : ""}`}>
                  {getActivityFilterLabel(filter, labels)}
                  <span className="automation-chip-count">
                    {filter === "all"
                      ? totalActivities
                      : filter === "doc-expiring"
                        ? activitiesByType.DOC_EXPIRING ?? 0
                        : filter === "billing-attention"
                          ? activitiesByType.BILLING_SUBSCRIPTION_ATTENTION ?? 0
                          : activitiesByType.BILLING_USAGE_PRESSURE ?? 0}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="automation-activity-actions">
            <Link href="/platform/automation" className="button button-secondary automation-back-link">
              {labels("platform.automationBackToPlatform")}
            </Link>
            <Link href={buildNotificationsHref(selectedFilter)} className="button button-secondary automation-back-link">
              {labels("platform.automationOpenNotifications")}
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-grid automation-activity-metric-grid">
        <div className="card automation-activity-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationActivityTotal")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-activity-value">{totalActivities}</div>
        </div>
        <div className="card automation-activity-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationPageStatus")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-activity-value">{unreadActivities}</div>
        </div>
      </div>

      <div className="dashboard-grid automation-activity-metric-grid">
        <div className="card automation-activity-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggerDocExpiring")}</h3>
            <Activity size={20} />
          </div>
          <div className="automation-activity-subvalue">{activitiesByType.DOC_EXPIRING ?? 0}</div>
        </div>
        <div className="card automation-activity-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggerBillingAttention")}</h3>
            <Activity size={20} />
          </div>
          <div className="automation-activity-subvalue">{activitiesByType.BILLING_SUBSCRIPTION_ATTENTION ?? 0}</div>
        </div>
        <div className="card automation-activity-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggerPlanPressure")}</h3>
            <Activity size={20} />
          </div>
          <div className="automation-activity-subvalue">{activitiesByType.BILLING_USAGE_PRESSURE ?? 0}</div>
        </div>
      </div>

      <div className="card automation-activity-table-card">
        <div className="card-header">
          <h2>{labels("platform.automationActivityTitle")}</h2>
          <Activity size={20} />
        </div>
        <div className="table-container table-container--responsive">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.automationActivityType")}</th>
                <th>{labels("platform.automationActivityTrigger")}</th>
                <th>{labels("platform.automationActivityOrganization")}</th>
                <th>{labels("platform.automationActivityRecipient")}</th>
                <th>{labels("platform.automationActivityCandidate")}</th>
                <th>{labels("platform.automationPageStatus")}</th>
                <th>{labels("platform.automationPageUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="automation-activity-title-cell">
                      <div>{activity.title}</div>
                      <div className="automation-subtext">{activity.message}</div>
                    </td>
                    <td>
                      <Link href={buildWorkflowHrefFromActivityType(activity.type)} className="status-badge automation-trigger-badge">
                        {getActivityTriggerLabel(activity.type, labels)}
                      </Link>
                    </td>
                    <td>
                      {activity.organization.name}
                      <div className="automation-subtext">{activity.organization.slug}</div>
                    </td>
                    <td>{activity.user.name ?? activity.user.email ?? labels("billing.notAvailable")}</td>
                    <td>
                      {activity.candidate && activity.candidateId ? (
                        <div className="automation-activity-candidate-stack">
                          <Link href={`/candidatos/${activity.candidateId}`} className="automation-activity-candidate-link">
                            {getDisplayCandidateName(activity.candidate.firstName, activity.candidate.lastName) || labels("billing.notAvailable")}
                          </Link>
                          <Link href={`/candidatos/${activity.candidateId}`} className="button button-secondary automation-activity-button">
                            {labels("documents.openCandidate")}
                          </Link>
                        </div>
                      ) : (
                        labels("billing.notAvailable")
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${activity.isRead ? "" : "active"}`}>
                        {getActivityStatusLabel(activity.isRead, labels)}
                      </span>
                    </td>
                    <td>{new Date(activity.createdAt).toLocaleString(locale)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="automation-empty-state">
                    {labels("platform.automationActivityNoActivity")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
