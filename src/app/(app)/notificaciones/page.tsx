import { auth } from "@/auth";
import { markNotificationAsRead, markNotificationsAsRead } from "@/app/actions/notifications";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { parseStructuredLegalOutcome } from "@/lib/legal-outcome";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { AlertTriangle, Bell, Clock, CreditCard, FileText, Truck, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type NotificationFilter = "all" | "doc-expiring" | "billing-attention" | "billing-pressure";
type NotificationStatusFilter = "all" | "unread" | "read";

function getNotificationFilterLabel(filter: NotificationFilter, labels: (key: TranslationKey) => string) {
  switch (filter) {
    case "doc-expiring":
      return labels("notifications.filterDocExpiring");
    case "billing-attention":
      return labels("notifications.filterBillingAttention");
    case "billing-pressure":
      return labels("notifications.filterBillingPressure");
    default:
      return labels("notifications.filterAll");
  }
}

function getNotificationStatusLabel(filter: NotificationStatusFilter, labels: (key: TranslationKey) => string) {
  switch (filter) {
    case "unread":
      return labels("notifications.statusUnread");
    case "read":
      return labels("notifications.statusRead");
    default:
      return labels("notifications.statusAll");
  }
}

function buildNotificationHref(typeFilter: NotificationFilter, statusFilter: NotificationStatusFilter = "all") {
  const params = new URLSearchParams();
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  const query = params.toString();
  return query ? `/notificaciones?${query}` : "/notificaciones";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);
  const tenant = await requireTenant();
  const { status, type } = await searchParams;
  const selectedFilter: NotificationFilter =
    type === "doc-expiring" || type === "billing-attention" || type === "billing-pressure" ? type : "all";
  const selectedStatus: NotificationStatusFilter =
    status === "unread" || status === "read" ? status : "all";
  const selectedTypes =
    selectedFilter === "doc-expiring"
      ? ["DOC_EXPIRING"]
      : selectedFilter === "billing-attention"
        ? ["BILLING_SUBSCRIPTION_ATTENTION"]
        : selectedFilter === "billing-pressure"
          ? ["BILLING_USAGE_PRESSURE"]
          : undefined;

  const allNotifications = await prisma.notification.findMany({
    where: {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
    },
    orderBy: { createdAt: "desc" },
    include: { candidate: true },
    take: 50,
  });

  const notifications = allNotifications.filter((notification) => {
    const matchesType = selectedTypes ? selectedTypes.includes(notification.type) : true;
    const matchesStatus =
      selectedStatus === "unread" ? !notification.isRead : selectedStatus === "read" ? notification.isRead : true;
    return matchesType && matchesStatus;
  });

  const filterCounts: Record<NotificationFilter, number> = {
    all: allNotifications.length,
    "doc-expiring": allNotifications.filter((notification) => notification.type === "DOC_EXPIRING").length,
    "billing-attention": allNotifications.filter(
      (notification) => notification.type === "BILLING_SUBSCRIPTION_ATTENTION",
    ).length,
    "billing-pressure": allNotifications.filter(
      (notification) => notification.type === "BILLING_USAGE_PRESSURE",
    ).length,
  };
  const unreadCount = allNotifications.filter((notification) => !notification.isRead).length;
  const readCount = allNotifications.length - unreadCount;
  const selectedUnreadCount = notifications.filter((notification) => !notification.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT_UPLOADED":
        return <FileText size={20} />;
      case "DOC_EXPIRING":
        return <Clock size={20} />;
      case "STATUS_CHANGED":
        return <Clock size={20} />;
      case "CANDIDATE_CREATED":
        return <UserPlus size={20} />;
      case "LOGISTICS_LEGAL_BLOCKER":
      case "LOGISTICS_DOCUMENT_BLOCKER":
      case "LOGISTICS_ARRIVAL_OVERDUE":
        return <AlertTriangle size={20} />;
      case "LOGISTICS_MISSING_TRANSPORT":
      case "LOGISTICS_MISSING_PICKUP":
      case "LOGISTICS_MISSING_ACCOMMODATION":
      case "LOGISTICS_ARRIVAL_TODAY":
        return <Truck size={20} />;
      case "BILLING_SUBSCRIPTION_ATTENTION":
        return <CreditCard size={20} />;
      case "BILLING_USAGE_PRESSURE":
        return <AlertTriangle size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "STATUS_UPDATE":
        return labels("notifications.type.status");
      case "CANDIDATE_APPROVED":
        return labels("notifications.type.approved");
      case "CANDIDATE_CREATED":
      case "NEW_CANDIDATE":
        return labels("notifications.type.newCandidate");
      case "DOCUMENT_UPLOADED":
        return labels("notifications.type.document");
      case "DOC_EXPIRING":
        return labels("notifications.type.documentExpiring");
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
      case "BILLING_SUBSCRIPTION_ATTENTION":
        return labels("notifications.type.billingAttention");
      case "BILLING_USAGE_PRESSURE":
        return labels("notifications.type.billingPressure");
      default:
        return type.replace(/_/g, " ");
    }
  };

  return (
    <div className="container">
      <div className="hero-section" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1>{labels("notifications.title")}</h1>
            <p>{labels("notifications.description")}</p>
          </div>
          <form action={markNotificationsAsRead} style={{ alignSelf: "start" }}>
            <input type="hidden" name="type" value={selectedFilter} />
            <button className="button button-secondary" disabled={selectedUnreadCount === 0} type="submit">
              {labels("notifications.markSelectedRead")} ({selectedUnreadCount})
            </button>
          </form>
        </div>
        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(["all", "doc-expiring", "billing-attention", "billing-pressure"] as NotificationFilter[]).map((filter) => (
            <Link
              key={filter}
              href={buildNotificationHref(filter, selectedStatus)}
              className={`status-badge ${selectedFilter === filter ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {getNotificationFilterLabel(filter, labels)} ({filterCounts[filter]})
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(["all", "unread", "read"] as NotificationStatusFilter[]).map((filter) => (
            <Link
              key={filter}
              href={buildNotificationHref(selectedFilter, filter)}
              className={`status-badge ${selectedStatus === filter ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {getNotificationStatusLabel(filter, labels)}
            </Link>
          ))}
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <Link href={buildNotificationHref("all")} className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card-header">
            <h3>{labels("notifications.summaryTotal")}</h3>
            <Bell size={24} />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900 }}>{allNotifications.length}</div>
        </Link>
        <Link
          href={buildNotificationHref(selectedFilter, "unread")}
          className="card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>{labels("notifications.summaryUnread")}</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900 }}>{unreadCount}</div>
        </Link>
        <Link
          href={buildNotificationHref(selectedFilter, "read")}
          className="card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>{labels("notifications.summaryRead")}</h3>
            <Bell size={24} />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900 }}>{readCount}</div>
        </Link>
        <Link
          href={buildNotificationHref("doc-expiring", selectedStatus)}
          className="card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>{labels("notifications.summaryDocExpiring")}</h3>
            <Clock size={24} />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900 }}>{filterCounts["doc-expiring"]}</div>
        </Link>
        <Link
          href={buildNotificationHref("billing-attention", selectedStatus)}
          className="card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>{labels("notifications.summaryBillingAttention")}</h3>
            <CreditCard size={24} />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900 }}>{filterCounts["billing-attention"]}</div>
        </Link>
        <Link
          href={buildNotificationHref("billing-pressure", selectedStatus)}
          className="card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>{labels("notifications.summaryBillingPressure")}</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 900 }}>{filterCounts["billing-pressure"]}</div>
        </Link>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
              {labels("notifications.empty")}
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "1rem",
                  borderBottom: "1px solid var(--muted)",
                  backgroundColor: notification.isRead ? "transparent" : "rgba(252, 186, 4, 0.1)",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    backgroundColor: "var(--pitch-black)",
                    color: "var(--amber-flame)",
                    padding: "0.5rem",
                    display: "flex",
                  }}
                >
                  {getIcon(notification.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {getTypeLabel(notification.type)}
                  </div>
                  <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>{notification.message}</div>
                  {notification.type === "STATUS_UPDATE"
                    ? (() => {
                        const parsed = parseStructuredLegalOutcome(
                          notification.message.includes("Motivo:")
                            ? notification.message.split("Motivo:").slice(1).join("Motivo:").trim()
                            : null,
                        );

                        return parsed?.category ? (
                          <div style={{ marginBottom: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            <span
                              style={{
                                padding: "0.15rem 0.45rem",
                                borderRadius: "999px",
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3",
                                fontSize: "0.7rem",
                                fontWeight: 900,
                              }}
                            >
                              {parsed.category}
                            </span>
                            {parsed.followUpActions.slice(0, 2).map((action) => (
                              <span
                                key={action}
                                style={{
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "999px",
                                  backgroundColor: "#f8fafc",
                                  border: "1px solid #cbd5e1",
                                  color: "#334155",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                }}
                              >
                                {action}
                              </span>
                            ))}
                          </div>
                        ) : null;
                      })()
                    : null}
                  {notification.candidate ? (
                    <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                      {labels("notifications.candidate")}:{" "}
                      <Link
                        href={`/candidatos/${notification.candidateId}`}
                        style={{ color: "var(--pitch-black)", fontWeight: "bold" }}
                      >
                        {notification.candidate.firstName} {notification.candidate.lastName}
                      </Link>
                    </div>
                  ) : null}
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
                {!notification.isRead ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        backgroundColor: "var(--amber-flame)",
                        borderRadius: "50%",
                        marginTop: "0.5rem",
                      }}
                    />
                    <form action={markNotificationAsRead}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button className="button button-secondary" type="submit">
                        {labels("notifications.markRead")}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
