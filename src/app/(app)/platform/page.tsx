import { auth } from "@/auth";
import { getPlanLimits } from "@/lib/billing/limits";
import PlatformAutomationCard from "@/components/PlatformAutomationCard";
import PlatformOperationalPulseCard from "@/components/PlatformOperationalPulseCard";
import PlatformReadinessCard from "@/components/PlatformReadinessCard";
import PlatformStatusCard from "@/components/PlatformStatusCard";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { getRuntimeMetadata } from "@/lib/operational-status";
import { getProviderStatus } from "@/lib/provider-status";
import { TRACKED_OPERATIONAL_ALERT_TYPES } from "@/lib/operational-alerts-shared";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity, Building2, FileText, Users } from "lucide-react";
import Link from "next/link";

function getOperationalAlertTypeLabel(type: string, labels: (key: TranslationKey) => string) {
  switch (type) {
    case "LOGISTICS_MISSING_TRANSPORT":
      return labels("notifications.type.transport");
    case "LOGISTICS_MISSING_PICKUP":
      return labels("notifications.type.pickup");
    case "LOGISTICS_MISSING_ACCOMMODATION":
      return labels("notifications.type.accommodation");
    case "LOGISTICS_LEGAL_BLOCKER":
      return labels("notifications.type.legalBlock");
    case "LOGISTICS_DOCUMENT_BLOCKER":
      return labels("notifications.type.documentBlock");
    case "LOGISTICS_ARRIVAL_OVERDUE":
      return labels("notifications.type.arrivalOverdue");
    case "LOGISTICS_ARRIVAL_TODAY":
      return labels("notifications.type.arrivalToday");
    default:
      return type.replace(/_/g, " ");
  }
}

function getBillingAttentionStatusLabel(status: string, labels: (key: TranslationKey) => string) {
  switch (status) {
    case "missing":
      return labels("billing.subscriptionAttentionStatusMissing");
    case "past_due":
      return labels("billing.subscriptionAttentionStatusPastDue");
    case "canceled":
      return labels("billing.subscriptionAttentionStatusCanceled");
    case "unpaid":
      return labels("billing.subscriptionAttentionStatusUnpaid");
    case "incomplete":
    case "incomplete_expired":
      return labels("billing.subscriptionAttentionStatusIncomplete");
    default:
      return labels("billing.subscriptionAttentionStatusUnknown");
  }
}

function getAutomationTriggerLabel(triggerType: string, labels: (key: TranslationKey) => string) {
  switch (triggerType) {
    case "DOC_EXPIRING_DETECTED":
      return labels("platform.automationTriggerDocExpiring");
    case "BILLING_ATTENTION_DETECTED":
      return labels("platform.automationTriggerBillingAttention");
    case "PLAN_PRESSURE_DETECTED":
      return labels("platform.automationTriggerPlanPressure");
    default:
      return triggerType.replace(/_/g, " ");
  }
}

function usageRatio(used: number, limit: number) {
  if (limit === Infinity) return 0;
  if (limit <= 0) return 0;
  return used / limit;
}

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const providerStatus = getProviderStatus();
  const runtime = getRuntimeMetadata();
  const { storage, ocr } = providerStatus;
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";

  const [orgs, stats] = await Promise.all([
    prisma.organization.findMany({
      include: {
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
          },
        },
        _count: {
          select: { memberships: true, candidates: true, documents: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.aggregate({
      _count: { _all: true },
    }),
  ]);

  const billingAttentionOrgs = orgs.filter((org) => {
    if (org.plan === "FREE") {
      return false;
    }

    const status = org.subscription?.status?.toLowerCase() ?? "missing";
    return !["active", "trialing"].includes(status);
  });

  const planPressureOrgs = orgs
    .map((org) => {
      const limits = getPlanLimits(org.plan);
      const candidateRatio = usageRatio(org._count.candidates, limits.candidates);
      const userRatio = usageRatio(org._count.memberships, limits.users);
      const maxRatio = Math.max(candidateRatio, userRatio);

      return {
        org,
        maxRatio,
        pressureLabel:
          candidateRatio >= userRatio
            ? `Candidatos ${org._count.candidates}/${limits.candidates === Infinity ? "∞" : limits.candidates}`
            : `Usuarios ${org._count.memberships}/${limits.users === Infinity ? "∞" : limits.users}`,
        pressureType: candidateRatio >= userRatio ? "candidates" : "users",
      };
    })
    .filter(({ org, maxRatio }) => org.plan !== "ENTERPRISE" && maxRatio >= 0.8)
    .sort((a, b) => b.maxRatio - a.maxRatio);

  const totalUsers = await prisma.user.count();
  const totalCandidates = await prisma.candidate.count();
  const totalSubscriptions = await prisma.subscription.count();
  const activeSubscriptions = await prisma.subscription.count({
    where: { status: { in: ["active", "trialing"] } },
  });
  const totalWorkflows = await prisma.workflow.count();
  const activeWorkflows = await prisma.workflow.count({
    where: { isActive: true },
  });
  const workflowByTrigger = await prisma.workflow.groupBy({
    by: ["triggerType"],
    _count: { _all: true },
  });
  const billingByPlan = await prisma.subscription.groupBy({
    by: ["plan"],
    _count: { _all: true },
  });
  const billingByStatus = await prisma.subscription.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const unreadOperationalAlerts = await prisma.notification.count({
    where: {
      type: { in: TRACKED_OPERATIONAL_ALERT_TYPES },
      isRead: false,
    },
  });
  const operationalAlertBreakdown = await prisma.notification.groupBy({
    by: ["type"],
    where: {
      type: { in: TRACKED_OPERATIONAL_ALERT_TYPES },
      isRead: false,
    },
    _count: { _all: true },
  });
  const recentOperationalAlerts = await prisma.notification.findMany({
    where: {
      type: { in: TRACKED_OPERATIONAL_ALERT_TYPES },
    },
    include: {
      candidate: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <div style={{ padding: "2rem" }}>
      <div className="hero-section" style={{ marginBottom: "2rem" }}>
        <h1>{labels("platform.title")}</h1>
        <p>{labels("platform.description")}</p>
      </div>

      <PlatformStatusCard
        title={labels("platform.systemStatusTitle")}
        description={labels("platform.systemStatusDescription")}
        items={[
          { label: labels("platform.systemStatusDatabase"), value: "OK", badge: true },
          { label: labels("platform.systemStatusHealth"), value: "OK", badge: true },
          { label: labels("platform.systemStatusProviders"), value: `${storage.statusLabel} | ${ocr.statusLabel}` },
          {
            label: labels("platform.systemStatusEmail"),
            value: `${runtime.emailProvider} | ${runtime.smtpConfigured ? labels("platform.systemStatusConfigured") : labels("platform.systemStatusPending")}`,
          },
          {
            label: labels("platform.systemStatusJobs"),
            value: `${runtime.jobProvider} | ${runtime.cronConfigured ? labels("platform.systemStatusCronReady") : labels("platform.systemStatusCronMissing")}`,
          },
          {
            label: labels("platform.systemStatusRelease"),
            value: `${runtime.version} (${runtime.release.slice(0, 12)})`,
          },
        ]}
        openHealthLabel={labels("platform.systemStatusOpenHealth")}
        openProvidersLabel={labels("platform.systemStatusOpenProviders")}
      />

      <PlatformOperationalPulseCard
        title={labels("platform.operationalPulseTitle")}
        description={labels("platform.operationalPulseDescription")}
        unreadLabel={labels("platform.operationalPulseUnread")}
        unreadValue={unreadOperationalAlerts.toString()}
        breakdownLabel={labels("platform.operationalPulseBreakdown")}
        breakdownItems={operationalAlertBreakdown
          .sort((a, b) => b._count._all - a._count._all)
          .map((item) => ({
            id: item.type,
            label: getOperationalAlertTypeLabel(item.type, labels),
            value: item._count._all.toString(),
          }))}
        recentLabel={labels("platform.operationalPulseRecent")}
        recentItems={recentOperationalAlerts.map((notification) => ({
          id: notification.id,
          title: notification.title,
          href: "/notificaciones",
          subtitle: `${notification.organization.name}${notification.candidate ? ` - ${notification.candidate.firstName} ${notification.candidate.lastName}` : ""}`,
        }))}
        openNotificationsLabel={labels("platform.operationalPulseOpenNotifications")}
        openDashboardLabel={labels("platform.operationalPulseOpenDashboard")}
      />

      <PlatformReadinessCard
        title={labels("platform.readinessTitle")}
        description={labels("platform.readinessDescription")}
        doneLabel={labels("platform.readinessDone")}
        nextLabel={labels("platform.readinessNext")}
        doneItems={[
          labels("platform.readinessSystemHardening"),
          labels("platform.readinessBackupRestore"),
          labels("platform.readinessOperationalVisibility"),
          labels("platform.readinessPublicMarketing"),
          labels("platform.readinessDemoTenant"),
          labels("platform.readinessReleaseAlignment"),
          labels("platform.readinessPilotRunbook"),
        ]}
        nextItems={[
          labels("platform.readinessBilling"),
          labels("platform.readinessOnboarding"),
          labels("platform.readinessMultilanguage"),
          labels("platform.readinessMonitoring"),
          labels("platform.readinessOcrTuning"),
          labels("platform.readinessRateLimiting"),
          labels("platform.readinessGdpr"),
          labels("platform.readinessWhiteLabel"),
        ]}
      />

      <PlatformAutomationCard
        title={labels("platform.automationTitle")}
        description={labels("platform.automationDescription")}
        workflowsLabel={labels("platform.automationWorkflows")}
        workflowsValue={totalWorkflows.toString()}
        activeWorkflowsLabel={labels("platform.automationActiveWorkflows")}
        activeWorkflowsValue={activeWorkflows.toString()}
        triggersLabel={labels("platform.automationTriggers")}
        triggerItems={workflowByTrigger
          .sort((a, b) => b._count._all - a._count._all)
          .map((item) => ({
            id: item.triggerType,
            label: getAutomationTriggerLabel(item.triggerType, labels),
            value: item._count._all.toString(),
        }))}
        openAutomationLabel={labels("platform.automationOpenWorkflows")}
        openActivityLabel={labels("platform.automationOpenActivity")}
        openNotificationsLabel={labels("platform.automationOpenNotifications")}
        openDashboardLabel={labels("platform.automationOpenDashboard")}
      />

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.organizations")}</h3>
            <Building2 size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>{stats._count._all}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.totalUsers")}</h3>
            <Users size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>{totalUsers}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.totalCandidates")}</h3>
            <FileText size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>{totalCandidates}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-header">
          <h2>{labels("platform.billingAttentionTitle")}</h2>
          <Activity size={20} />
        </div>
        <p style={{ marginTop: 0, color: "var(--muted-foreground)" }}>{labels("platform.billingAttentionDescription")}</p>
        <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{billingAttentionOrgs.length}</div>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{labels("platform.billingAttentionCount")}</div>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: "1rem", fontWeight: 900, marginBottom: "0.45rem" }}>
              {billingAttentionOrgs.length > 0 ? labels("platform.billingAttentionTenant") : labels("platform.billingAttentionNone")}
            </div>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700, lineHeight: 1.45 }}>
              {billingAttentionOrgs.length > 0
                ? labels("platform.billingAttentionDescription")
                : labels("platform.billingAttentionNone")}
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.organization")}</th>
                <th>{labels("platform.plan")}</th>
                <th>{labels("platform.subscriptionStatus")}</th>
                <th>{labels("platform.billingAttentionPeriodEnd")}</th>
              </tr>
            </thead>
            <tbody>
              {billingAttentionOrgs.length > 0 ? (
                billingAttentionOrgs.slice(0, 6).map((org) => {
                  const status = org.subscription?.status?.toLowerCase() ?? "missing";
                  return (
                    <tr key={org.id}>
                      <td style={{ fontWeight: "bold" }}>
                        {org.name}
                        <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{org.slug}</div>
                      </td>
                      <td>
                        <span
                          className="status-badge active"
                          style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}
                        >
                          {org.plan}
                        </span>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: "rgba(185, 28, 28, 0.1)", color: "#991b1b" }}
                        >
                          {getBillingAttentionStatusLabel(status, labels)}
                        </span>
                      </td>
                      <td>
                        {org.subscription?.currentPeriodEnd
                          ? org.subscription.currentPeriodEnd.toLocaleDateString(locale)
                          : labels("billing.notAvailable")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted-foreground)" }}>
                    {labels("platform.billingAttentionNone")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
          <Link href="/billing" className="button button-secondary" style={{ textDecoration: "none" }}>
            {labels("platform.billingAttentionOpenBilling")}
          </Link>
          <Link href="/billing/plans" className="button button-secondary" style={{ textDecoration: "none" }}>
            {labels("platform.billingAttentionOpenPlans")}
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-header">
          <h2>{labels("platform.planPressureTitle")}</h2>
          <Activity size={20} />
        </div>
        <p style={{ marginTop: 0, color: "var(--muted-foreground)" }}>{labels("platform.planPressureDescription")}</p>
        <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{planPressureOrgs.length}</div>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{labels("platform.planPressureCount")}</div>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: "1rem", fontWeight: 900, marginBottom: "0.45rem" }}>
              {planPressureOrgs.length > 0 ? labels("platform.planPressureTenant") : labels("platform.planPressureNone")}
            </div>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700, lineHeight: 1.45 }}>
              {planPressureOrgs.length > 0 ? labels("platform.planPressureDescription") : labels("platform.planPressureNone")}
            </div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.organization")}</th>
                <th>{labels("platform.plan")}</th>
                <th>{labels("platform.planPressureUsage")}</th>
                <th>{labels("platform.planPressureRatio")}</th>
              </tr>
            </thead>
            <tbody>
              {planPressureOrgs.length > 0 ? (
                planPressureOrgs.slice(0, 6).map(({ org, maxRatio, pressureLabel, pressureType }) => (
                  <tr key={org.id}>
                    <td style={{ fontWeight: "bold" }}>
                      {org.name}
                      <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{org.slug}</div>
                    </td>
                    <td>
                      <span
                        className="status-badge active"
                        style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}
                      >
                        {org.plan}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: pressureType === "users" ? "rgba(59, 130, 246, 0.12)" : "rgba(245, 158, 11, 0.14)", color: "var(--pitch-black)" }}
                      >
                        {pressureLabel}
                      </span>
                    </td>
                    <td>{Math.round(maxRatio * 100)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted-foreground)" }}>
                    {labels("platform.planPressureNone")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-header">
          <h2>{labels("platform.billingPulseTitle")}</h2>
          <Activity size={20} />
        </div>
        <p style={{ marginTop: 0, color: "var(--muted-foreground)" }}>{labels("platform.billingPulseDescription")}</p>
        <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{totalSubscriptions}</div>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{labels("platform.billingSubscriptions")}</div>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{activeSubscriptions}</div>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{labels("platform.billingActiveSubscriptions")}</div>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.plan")}</th>
                <th>{labels("platform.count")}</th>
              </tr>
            </thead>
            <tbody>
              {billingByPlan
                .sort((a, b) => b._count._all - a._count._all)
                .map((item) => (
                  <tr key={item.plan}>
                    <td>
                      <span
                        className="status-badge active"
                        style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}
                      >
                        {item.plan}
                      </span>
                    </td>
                    <td>{item._count._all}</td>
                  </tr>
                ))}
            </tbody>
              </table>
        </div>
        <div style={{ height: "1rem" }} />
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.subscriptionStatus")}</th>
                <th>{labels("platform.count")}</th>
              </tr>
            </thead>
            <tbody>
              {billingByStatus
                .sort((a, b) => b._count._all - a._count._all)
                .map((item) => (
                  <tr key={item.status}>
                    <td>
                      <span className="status-badge" style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--pitch-black)" }}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{item._count._all}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{labels("platform.activeTenants")}</h2>
          <Activity size={20} />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.organization")}</th>
                <th>{labels("platform.plan")}</th>
                <th>{labels("platform.status")}</th>
                <th>{labels("platform.users")}</th>
                <th>{labels("platform.candidates")}</th>
                <th>{labels("platform.documents")}</th>
                <th>{labels("platform.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td style={{ fontWeight: "bold" }}>
                    {org.name}
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{org.slug}</div>
                  </td>
                  <td>
                    <span
                      className="status-badge active"
                      style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}
                    >
                      {org.plan}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${org.isActive ? "active" : ""}`}>
                      {org.isActive ? labels("platform.active") : labels("platform.inactive")}
                    </span>
                  </td>
                  <td>{org._count.memberships}</td>
                  <td>{org._count.candidates}</td>
                  <td>{org._count.documents}</td>
                  <td>{org.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
