import { auth } from "@/auth";
import { normalizeLanguage, t } from "@/lib/i18n";
import { parseStructuredLegalOutcome } from "@/lib/legal-outcome";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { AlertTriangle, Bell, Clock, FileText, Truck, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);
  const tenant = await requireTenant();

  const notifications = await prisma.notification.findMany({
    where: {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
    },
    orderBy: { createdAt: "desc" },
    include: { candidate: true },
    take: 50,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT_UPLOADED":
        return <FileText size={20} />;
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
  };

  return (
    <div className="container">
      <div className="hero-section" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <h1>{labels("notifications.title")}</h1>
        <p>{labels("notifications.description")}</p>
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
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: "var(--amber-flame)",
                      borderRadius: "50%",
                      marginTop: "0.5rem",
                    }}
                  />
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
