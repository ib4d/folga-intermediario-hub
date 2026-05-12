export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
      <div style={{ fontWeight: 900, color: "var(--pitch-black)", marginBottom: "0.5rem" }}>
        {title}
      </div>
      {description && <p style={{ margin: "0 auto 1.5rem", maxWidth: "34rem" }}>{description}</p>}
      {action}
    </div>
  );
}
