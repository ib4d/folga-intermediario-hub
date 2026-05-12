import Link from "next/link";

export default function MetricCard({
  title,
  value,
  icon,
  href,
  tone = "default",
  helper,
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  href?: string;
  tone?: "default" | "accent" | "success" | "danger";
  helper?: string;
}) {
  const backgroundColor =
    tone === "accent"
      ? "var(--amber-flame)"
      : tone === "success"
        ? "#d1fae5"
        : tone === "danger"
          ? "#fee2e2"
          : undefined;

  const content = (
    <div
      className="card"
      style={{
        backgroundColor,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="card-header">
        <h3>{title}</h3>
        {icon}
      </div>
      <div style={{ fontSize: "2.75rem", fontWeight: 900, lineHeight: 1 }}>
        {value}
      </div>
      {helper && (
        <p style={{ margin: 0, marginTop: "0.5rem", fontSize: "0.875rem" }}>
          {helper}
        </p>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}
