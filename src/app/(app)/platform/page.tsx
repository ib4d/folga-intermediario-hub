import { auth } from "@/auth";
import PlatformOperationalPulseCard from "@/components/PlatformOperationalPulseCard";
import PlatformReadinessCard from "@/components/PlatformReadinessCard";
import PlatformStatusCard from "@/components/PlatformStatusCard";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { getProviderStatus } from "@/lib/provider-status";
import { TRACKED_OPERATIONAL_ALERT_TYPES } from "@/lib/operational-alerts-shared";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity, Building2, FileText, Users } from "lucide-react";

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

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const providerStatus = getProviderStatus();
  const { storage, ocr } = providerStatus;

  const [orgs, stats] = await Promise.all([
    prisma.organization.findMany({
      include: {
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

  const totalUsers = await prisma.user.count();
  const totalCandidates = await prisma.candidate.count();
  const totalSubscriptions = await prisma.subscription.count();
  const activeSubscriptions = await prisma.subscription.count({
    where: { status: { in: ["active", "trialing"] } },
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
        databaseLabel={labels("platform.systemStatusDatabase")}
        databaseValue="OK"
        healthLabel={labels("platform.systemStatusHealth")}
        healthValue="OK"
        providersLabel={labels("platform.systemStatusProviders")}
        providersValue={`${storage.statusLabel} | ${ocr.statusLabel}`}
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
        ]}
        nextItems={[
          labels("platform.readinessPublicMarketing"),
          labels("platform.readinessDemoTenant"),
          labels("platform.readinessBilling"),
          labels("platform.readinessOnboarding"),
          labels("platform.readinessMultilanguage"),
          labels("platform.readinessMonitoring"),
          labels("platform.readinessRateLimiting"),
          labels("platform.readinessGdpr"),
          labels("platform.readinessWhiteLabel"),
        ]}
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
