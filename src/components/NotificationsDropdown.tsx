"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { type AppLanguage, t } from "@/lib/i18n";

type Notification = {
  id: string;
  title?: string | null;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  candidateId?: string | null;
  candidate?: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

function getNotificationContextAction(type: string, candidateId?: string | null) {
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
        return `/candidatos/${candidateId}`;
    }
  }

  switch (type) {
    case "DOC_EXPIRING":
    case "DOCUMENT_UPLOADED":
      return "/documentos";
    case "STATUS_UPDATE":
    case "LOGISTICS_LEGAL_BLOCKER":
      return "/legal";
    case "LOGISTICS_DOCUMENT_BLOCKER":
    case "LOGISTICS_MISSING_TRANSPORT":
    case "LOGISTICS_MISSING_PICKUP":
    case "LOGISTICS_MISSING_ACCOMMODATION":
    case "LOGISTICS_ARRIVAL_OVERDUE":
    case "LOGISTICS_ARRIVAL_TODAY":
      return "/logistica";
    case "BILLING_SUBSCRIPTION_ATTENTION":
    case "BILLING_USAGE_PRESSURE":
      return "/billing";
    default:
      return null;
  }
}

function getNotificationLabel(type: string, language: AppLanguage) {
  switch (type) {
    case "STATUS_UPDATE":
      return t(language, "notifications.type.status");
    case "CANDIDATE_APPROVED":
      return t(language, "notifications.type.approved");
    case "NEW_CANDIDATE":
    case "CANDIDATE_CREATED":
      return t(language, "notifications.type.newCandidate");
    case "DOCUMENT_UPLOADED":
      return t(language, "notifications.type.document");
    case "DOC_EXPIRING":
      return t(language, "notifications.type.documentExpiring");
    case "LOGISTICS_MISSING_TRANSPORT":
      return t(language, "notifications.type.transport");
    case "LOGISTICS_MISSING_PICKUP":
      return t(language, "notifications.type.pickup");
    case "LOGISTICS_MISSING_ACCOMMODATION":
      return t(language, "notifications.type.accommodation");
    case "LOGISTICS_LEGAL_BLOCKER":
      return t(language, "notifications.type.legalBlock");
    case "LOGISTICS_DOCUMENT_BLOCKER":
      return t(language, "notifications.type.documentBlock");
    case "LOGISTICS_ARRIVAL_OVERDUE":
      return t(language, "notifications.type.arrivalOverdue");
    case "LOGISTICS_ARRIVAL_TODAY":
      return t(language, "notifications.type.arrivalToday");
    case "BILLING_SUBSCRIPTION_ATTENTION":
      return t(language, "notifications.type.billingAttention");
    case "BILLING_USAGE_PRESSURE":
      return t(language, "notifications.type.billingPressure");
    default:
      return type.replace(/_/g, " ");
  }
}

export default function NotificationsDropdown({ language }: { language: AppLanguage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((notification: Notification) => !notification.isRead).length);
        }
      })
      .catch(console.error);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="icon-button"
        style={{ position: "relative" }}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              backgroundColor: "var(--amber-flame)",
              color: "var(--pitch-black)",
              borderRadius: "999px",
              minWidth: "20px",
              height: "20px",
              fontSize: "12px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
              border: "1px solid var(--pitch-black)",
            }}
          >
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.5rem",
            width: "350px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            boxShadow: "0 18px 36px rgba(11, 5, 0, 0.18)",
            zIndex: 50,
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0 }}>{t(language, "notifications.title")}</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: "0.5rem" }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--muted-foreground)", padding: "1rem" }}>
                {t(language, "notifications.empty")}
              </p>
            ) : (
              notifications.map((notification) => {
                const contextHref = getNotificationContextAction(notification.type, notification.candidateId);

                return (
                  <div
                    key={notification.id}
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: notification.isRead ? "transparent" : "var(--white-smoke)",
                    }}
                  >
                    <button
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        cursor: notification.isRead ? "default" : "pointer",
                        textAlign: "left",
                        padding: 0,
                      }}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                      type="button"
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.25rem",
                          gap: "0.75rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            color: "var(--pitch-black)",
                          }}
                        >
                          {getNotificationLabel(notification.type, language)}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {notification.title ? (
                        <div style={{ marginBottom: "0.2rem", fontSize: "0.78rem", fontWeight: 800, color: "var(--pitch-black)" }}>
                          {notification.title}
                        </div>
                      ) : null}
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.875rem",
                          fontWeight: notification.isRead ? "normal" : "bold",
                        }}
                      >
                        {notification.message}
                      </p>
                      {notification.candidate ? (
                        <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                          {notification.candidate.firstName} {notification.candidate.lastName}
                        </div>
                      ) : null}
                    </button>
                    {contextHref ? (
                      <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
                        <a
                          href={contextHref}
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "var(--pitch-black)",
                            textDecoration: "none",
                          }}
                        >
                          {t(language, "notifications.openContext")}
                        </a>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
          <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
            <a
              href="/notificaciones"
              style={{
                fontSize: "0.875rem",
                fontWeight: "bold",
                color: "var(--pitch-black)",
                textDecoration: "none",
              }}
            >
              {t(language, "notifications.viewAll")}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
