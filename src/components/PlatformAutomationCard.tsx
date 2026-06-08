import Link from "next/link";

type PlatformAutomationCardProps = {
  title: string;
  description?: string;
  workflowsLabel: string;
  workflowsValue: string;
  activeWorkflowsLabel: string;
  activeWorkflowsValue: string;
  triggersLabel: string;
  triggerItems: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  openNotificationsLabel: string;
  openDashboardLabel: string;
};

export default function PlatformAutomationCard({
  title,
  description,
  workflowsLabel,
  workflowsValue,
  activeWorkflowsLabel,
  activeWorkflowsValue,
  triggersLabel,
  triggerItems,
  openNotificationsLabel,
  openDashboardLabel,
}: PlatformAutomationCardProps) {
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
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{workflowsLabel}</div>
          <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 900 }}>{workflowsValue}</div>
        </div>

        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{activeWorkflowsLabel}</div>
          <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 900 }}>{activeWorkflowsValue}</div>
        </div>

        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{triggersLabel}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.55rem" }}>
            {triggerItems.length > 0 ? (
              triggerItems.map((item) => (
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
