export default function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="hero-section"
      style={{
        padding: "1.5rem 2rem",
        marginBottom: "2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1.5rem",
        flexWrap: "wrap",
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem",
              fontSize: "0.75rem",
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            {icon}
            {eyebrow}
          </div>
        )}
        <h1 style={{ marginBottom: description ? "0.5rem" : 0 }}>{title}</h1>
        {description && (
          <p style={{ color: "var(--pitch-black)", margin: 0 }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
