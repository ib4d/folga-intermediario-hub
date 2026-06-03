type PlatformReadinessCardProps = {
  title: string;
  description?: string;
  doneLabel: string;
  nextLabel: string;
  doneItems: readonly string[];
  nextItems: readonly string[];
};

export default function PlatformReadinessCard({
  title,
  description,
  doneLabel,
  nextLabel,
  doneItems,
  nextItems,
}: PlatformReadinessCardProps) {
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
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{doneLabel}</div>
          <ul style={{ margin: "0.7rem 0 0", paddingLeft: "1.1rem", display: "grid", gap: "0.45rem" }}>
            {doneItems.map((item) => (
              <li key={item} style={{ fontSize: "0.88rem", fontWeight: 800, lineHeight: 1.45 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{nextLabel}</div>
          <ul style={{ margin: "0.7rem 0 0", paddingLeft: "1.1rem", display: "grid", gap: "0.45rem" }}>
            {nextItems.map((item) => (
              <li key={item} style={{ fontSize: "0.88rem", fontWeight: 800, lineHeight: 1.45 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
