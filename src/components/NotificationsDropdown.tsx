"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

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

function getNotificationLabel(type: string) {
  switch (type) {
    case "STATUS_UPDATE":
      return "Estado";
    case "CANDIDATE_APPROVED":
      return "Aprobado";
    case "NEW_CANDIDATE":
    case "CANDIDATE_CREATED":
      return "Nuevo candidato";
    case "DOCUMENT_UPLOADED":
      return "Documento";
    default:
      return type.replace(/_/g, " ");
  }
}

export default function NotificationsDropdown() {
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
            <h3 style={{ margin: 0 }}>Notificaciones</h3>
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
                No hay notificaciones
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "none",
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: notification.isRead ? "transparent" : "var(--white-smoke)",
                    cursor: notification.isRead ? "default" : "pointer",
                    textAlign: "left",
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
                      {getNotificationLabel(notification.type)}
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
              ))
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
              Ver todas
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
