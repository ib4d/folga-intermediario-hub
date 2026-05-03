"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

type Notification = {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

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
          setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
        }
      })
      .catch(console.error);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <div style={{ position: "relative" }}>
      <button 
        className="button" 
        style={{ padding: "0.5rem", position: "relative" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            backgroundColor: "var(--amber-flame)",
            color: "var(--pitch-black)",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            fontSize: "12px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--pitch-black)"
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: "0.5rem",
          width: "350px",
          backgroundColor: "var(--ghost-white)",
          border: "2px solid var(--pitch-black)",
          boxShadow: "6px 6px 0px var(--pitch-black)",
          zIndex: 50,
          maxHeight: "400px",
          overflowY: "auto"
        }}>
          <div style={{ padding: "1rem", borderBottom: "2px solid var(--pitch-black)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Notificaciones</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
          </div>
          
          <div style={{ padding: "0.5rem" }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--muted)", padding: "1rem" }}>No hay notificaciones</p>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  style={{ 
                    padding: "0.75rem", 
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: n.isRead ? "transparent" : "var(--white-smoke)",
                    cursor: n.isRead ? "default" : "pointer"
                  }}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--amber-flame)" }}>{n.type}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: n.isRead ? "normal" : "bold" }}>
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: "0.75rem", borderTop: "2px solid var(--pitch-black)", textAlign: "center" }}>
            <a href="/notificaciones" style={{ fontSize: "0.875rem", fontWeight: "bold", color: "var(--pitch-black)", textDecoration: "none" }}>Ver todas</a>
          </div>
        </div>
      )}
    </div>
  );
}
