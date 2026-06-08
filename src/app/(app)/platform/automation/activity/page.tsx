import { auth } from "@/auth";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity } from "lucide-react";
import Link from "next/link";

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

export default async function PlatformAutomationActivityPage() {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";

  const recentActivityStart = new Date();
  recentActivityStart.setDate(recentActivityStart.getDate() - 30);

  const activities = await prisma.notification.findMany({
    where: {
      createdAt: { gte: recentActivityStart },
      type: {
        in: ["DOC_EXPIRING", "BILLING_SUBSCRIPTION_ATTENTION", "BILLING_USAGE_PRESSURE"],
      },
    },
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      candidate: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
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

  return (
    <div style={{ padding: "2rem" }}>
      <div className="hero-section" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1>{labels("platform.automationActivityTitle")}</h1>
            <p>{labels("platform.automationActivityDescription")}</p>
          </div>
          <Link href="/platform/automation" className="button button-secondary" style={{ textDecoration: "none", alignSelf: "start" }}>
            {labels("platform.automationBackToPlatform")}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationActivityTotal")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{totalActivities}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationPageStatus")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{unreadActivities}</div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggerDocExpiring")}</h3>
            <Activity size={20} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{activitiesByType.DOC_EXPIRING ?? 0}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggerBillingAttention")}</h3>
            <Activity size={20} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{activitiesByType.BILLING_SUBSCRIPTION_ATTENTION ?? 0}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggerPlanPressure")}</h3>
            <Activity size={20} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{activitiesByType.BILLING_USAGE_PRESSURE ?? 0}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{labels("platform.automationActivityTitle")}</h2>
          <Activity size={20} />
        </div>
        <div className="table-container">
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
                    <td style={{ fontWeight: "bold" }}>
                      <div>{activity.title}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{activity.message}</div>
                    </td>
                    <td>
                      <span className="status-badge active" style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}>
                        {getActivityTriggerLabel(activity.type, labels)}
                      </span>
                    </td>
                    <td>
                      {activity.organization.name}
                      <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{activity.organization.slug}</div>
                    </td>
                    <td>
                      {activity.user.name ?? activity.user.email ?? labels("billing.notAvailable")}
                    </td>
                    <td>
                      {activity.candidate && activity.candidateId ? (
                        <div style={{ display: "grid", gap: "0.35rem" }}>
                          <Link href={`/candidatos/${activity.candidateId}`} style={{ fontWeight: 700, textDecoration: "none" }}>
                            {getDisplayCandidateName(activity.candidate.firstName, activity.candidate.lastName) ||
                              labels("billing.notAvailable")}
                          </Link>
                          <Link
                            href={`/candidatos/${activity.candidateId}`}
                            className="button button-secondary"
                            style={{ textDecoration: "none", width: "fit-content", paddingInline: "0.8rem", paddingBlock: "0.45rem" }}
                          >
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
                  <td colSpan={7} style={{ color: "var(--muted-foreground)" }}>
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
