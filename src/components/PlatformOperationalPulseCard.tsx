import Link from "next/link";

type PlatformOperationalPulseCardProps = {
  title: string;
  description?: string;
  unreadLabel: string;
  unreadValue: string;
  breakdownLabel: string;
  breakdownItems: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  recentLabel: string;
  recentItems: Array<{
    id: string;
    title: string;
    href: string;
    subtitle?: string;
  }>;
  openNotificationsLabel: string;
  openDashboardLabel: string;
};

export default function PlatformOperationalPulseCard({
  title,
  description,
  unreadLabel,
  unreadValue,
  breakdownLabel,
  breakdownItems,
  recentLabel,
  recentItems,
  openNotificationsLabel,
  openDashboardLabel,
}: PlatformOperationalPulseCardProps) {
  return (
    <div className="card" style={{ marginBottom: "2rem", padding: "1.25rem 1.5rem" }}>
      <div className="card-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h2 style={{ marginBottom: "0.35rem" }}>{title}</h2>
          {description ? (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem", maxWidth: "760px" }}>
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{unreadLabel}</div>
          <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 900 }}>{unreadValue}</div>
        </div>

        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{recentLabel}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.55rem" }}>
            {recentItems.length > 0 ? (
              recentItems.map((item) => (
                <Link key={item.id} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    style={{
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      background: "rgba(255, 255, 255, 0.9)",
                      padding: "0.75rem 0.8rem",
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: "0.88rem", marginBottom: "0.15rem" }}>{item.title}</div>
                    {item.subtitle ? (
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.4 }}>
                        {item.subtitle}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 700 }}>-</div>
            )}
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{breakdownLabel}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.55rem" }}>
            {breakdownItems.length > 0 ? (
              breakdownItems.map((item) => (
                <span
                  key={item.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    border: "1px solid rgba(0, 0, 0, 0.12)",
                    background: "rgba(255, 255, 255, 0.9)",
                    padding: "0.3rem 0.55rem",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                  }}
                >
                  <span>{item.label}</span>
                  <span className="status-badge active" style={{ paddingInline: "0.45rem", fontSize: "0.68rem" }}>
                    {item.value}
                  </span>
                </span>
              ))
            ) : (
              <div style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 700 }}>-</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
        <Link href="/notificaciones" className="button button-secondary" style={{ textDecoration: "none" }}>
          {openNotificationsLabel}
        </Link>
        <Link href="/dashboard" className="button button-secondary" style={{ textDecoration: "none" }}>
          {openDashboardLabel}
        </Link>
      </div>
    </div>
  );
}
