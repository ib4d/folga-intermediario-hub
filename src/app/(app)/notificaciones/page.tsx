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

function getNotificationContextAction(
  type: string,
  candidateId: string | null,
  labels: (key: TranslationKey) => string,
) {
  if (candidateId) {
    switch (type) {
      case "CANDIDATE_APPROVED":
      case "CANDIDATE_CREATED":
      case "NEW_CANDIDATE":
      case "DOC_EXPIRING":
      case "DOCUMENT_UPLOADED":
      case "STATUS_UPDATE":
      case "LOGISTICS_LEGAL_BLOCKER":
      case "LOGISTICS_DOCUMENT_BLOCKER":
      case "LOGISTICS_MISSING_TRANSPORT":
      case "LOGISTICS_MISSING_PICKUP":
      case "LOGISTICS_MISSING_ACCOMMODATION":
      case "LOGISTICS_ARRIVAL_OVERDUE":
      case "LOGISTICS_ARRIVAL_TODAY":
        return { href: `/candidatos/${candidateId}`, label: labels("notifications.openCandidate") };
    }
  }

  switch (type) {
    case "DOC_EXPIRING":
    case "DOCUMENT_UPLOADED":
      return { href: "/documentos", label: labels("notifications.openDocuments") };
    case "STATUS_UPDATE":
    case "LOGISTICS_LEGAL_BLOCKER":
      return { href: "/legal", label: labels("notifications.openLegal") };
    case "LOGISTICS_DOCUMENT_BLOCKER":
    case "LOGISTICS_MISSING_TRANSPORT":
    case "LOGISTICS_MISSING_PICKUP":
    case "LOGISTICS_MISSING_ACCOMMODATION":
    case "LOGISTICS_ARRIVAL_OVERDUE":
    case "LOGISTICS_ARRIVAL_TODAY":
      return { href: "/logistica", label: labels("notifications.openLogistics") };
    case "BILLING_SUBSCRIPTION_ATTENTION":
    case "BILLING_USAGE_PRESSURE":
      return { href: "/billing", label: labels("notifications.openBilling") };
    default:
      return null;
  }
}

function buildNotificationHref(typeFilter: NotificationFilter, statusFilter: NotificationStatusFilter = "all") {
  const params = new URLSearchParams();
  if (typeFilter !== "all") params.set("type", typeFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  const query = params.toString();
  return query ? `/notificaciones?${query}` : "/notificaciones";
}

function getNotificationIcon(type: string) {
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
}

function getTypeLabel(type: string, labels: (key: TranslationKey) => string) {
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
  const selectedStatus: NotificationStatusFilter = status === "unread" || status === "read" ? status : "all";
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
    "billing-attention": allNotifications.filter((notification) => notification.type === "BILLING_SUBSCRIPTION_ATTENTION").length,
    "billing-pressure": allNotifications.filter((notification) => notification.type === "BILLING_USAGE_PRESSURE").length,
  };

  const unreadCount = allNotifications.filter((notification) => !notification.isRead).length;
  const readCount = allNotifications.length - unreadCount;
  const selectedUnreadCount = notifications.filter((notification) => !notification.isRead).length;

  const statusFilterOptions: NotificationStatusFilter[] = ["all", "unread", "read"];
  const typeFilterOptions: NotificationFilter[] = ["all", "doc-expiring", "billing-attention", "billing-pressure"];

  return (
    <div className="notifications-page">
      <div className="hero-section notifications-hero">
        <div className="notifications-hero-top">
          <div>
            <h1>{labels("notifications.title")}</h1>
            <p>{labels("notifications.description")}</p>
          </div>
          <form action={markNotificationsAsRead} className="notifications-mark-all-form">
            <input type="hidden" name="type" value={selectedFilter} />
            <button className="button button-secondary" disabled={selectedUnreadCount === 0} type="submit">
              {labels("notifications.markSelectedRead")} ({selectedUnreadCount})
            </button>
          </form>
        </div>

        <div className="notifications-filter-row">
          {typeFilterOptions.map((filter) => (
            <Link key={filter} href={buildNotificationHref(filter, selectedStatus)} className={`status-badge notifications-chip ${selectedFilter === filter ? "active" : ""}`}>
              {getNotificationFilterLabel(filter, labels)} ({filterCounts[filter]})
            </Link>
          ))}
        </div>

        <div className="notifications-filter-row notifications-filter-row--compact">
          {statusFilterOptions.map((filter) => (
            <Link key={filter} href={buildNotificationHref(selectedFilter, filter)} className={`status-badge notifications-chip ${selectedStatus === filter ? "active" : ""}`}>
              {getNotificationStatusLabel(filter, labels)}
            </Link>
          ))}
        </div>
      </div>

      <div className="dashboard-grid notifications-summary-grid">
        <Link href={buildNotificationHref("all")} className="card notifications-summary-card">
          <div className="card-header">
            <h3>{labels("notifications.summaryTotal")}</h3>
            <Bell size={24} />
          </div>
          <div className="notifications-summary-value">{allNotifications.length}</div>
        </Link>
        <Link href={buildNotificationHref(selectedFilter, "unread")} className="card notifications-summary-card">
          <div className="card-header">
            <h3>{labels("notifications.summaryUnread")}</h3>
            <AlertTriangle size={24} />
          </div>
          <div className="notifications-summary-value">{unreadCount}</div>
        </Link>
        <Link href={buildNotificationHref(selectedFilter, "read")} className="card notifications-summary-card">
          <div className="card-header">
            <h3>{labels("notifications.summaryRead")}</h3>
            <Bell size={24} />
          </div>
          <div className="notifications-summary-value">{readCount}</div>
        </Link>
        <Link href={buildNotificationHref("doc-expiring", selectedStatus)} className="card notifications-summary-card">
          <div className="card-header">
            <h3>{labels("notifications.summaryDocExpiring")}</h3>
            <Clock size={24} />
          </div>
          <div className="notifications-summary-value">{filterCounts["doc-expiring"]}</div>
        </Link>
        <Link href={buildNotificationHref("billing-attention", selectedStatus)} className="card notifications-summary-card">
          <div className="card-header">
            <h3>{labels("notifications.summaryBillingAttention")}</h3>
            <CreditCard size={24} />
          </div>
          <div className="notifications-summary-value">{filterCounts["billing-attention"]}</div>
        </Link>
        <Link href={buildNotificationHref("billing-pressure", selectedStatus)} className="card notifications-summary-card">
          <div className="card-header">
            <h3>{labels("notifications.summaryBillingPressure")}</h3>
            <AlertTriangle size={24} />
          </div>
          <div className="notifications-summary-value">{filterCounts["billing-pressure"]}</div>
        </Link>
      </div>

      <div className="card notifications-list-card">
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="notifications-empty">{labels("notifications.empty")}</div>
          ) : (
            notifications.map((notification) => {
              const contextAction = getNotificationContextAction(notification.type, notification.candidateId, labels);
              const parsed = notification.type === "STATUS_UPDATE"
                ? parseStructuredLegalOutcome(
                    notification.message.includes("Motivo:")
                      ? notification.message.split("Motivo:").slice(1).join("Motivo:").trim()
                      : null,
                  )
                : null;

              return (
                <div
                  key={notification.id}
                  className={`notifications-item ${notification.isRead ? "" : "notifications-item--unread"}`}
                >
                  <div className="notifications-item-icon">{getNotificationIcon(notification.type)}</div>
                  <div className="notifications-item-main">
                    <div className="notifications-item-type">{getTypeLabel(notification.type, labels)}</div>
                    <div className="notifications-item-message">{notification.message}</div>

                    {parsed?.category ? (
                      <div className="notifications-meta-tags">
                        <span className="notifications-meta-tag notifications-meta-tag--category">{parsed.category}</span>
                        {parsed.followUpActions.slice(0, 2).map((action) => (
                          <span key={action} className="notifications-meta-tag notifications-meta-tag--action">
                            {action}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {notification.candidate ? (
                      <div className="notifications-item-candidate">
                        {labels("notifications.candidate")}:{" "}
                        <Link href={`/candidatos/${notification.candidateId}`} className="notifications-candidate-link">
                          {notification.candidate.firstName} {notification.candidate.lastName}
                        </Link>
                      </div>
                    ) : null}

                    <div className="notifications-item-date">{new Date(notification.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="notifications-item-actions">
                    {contextAction ? (
                      <Link href={contextAction.href} className="button button-secondary notifications-action-button">
                        {contextAction.label}
                      </Link>
                    ) : null}
                    {!notification.isRead ? (
                      <>
                        <div className="notifications-unread-dot" />
                        <form action={markNotificationAsRead}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <button className="button button-secondary" type="submit">
                            {labels("notifications.markRead")}
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
