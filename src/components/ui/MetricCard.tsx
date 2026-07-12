import Link from "next/link";

export default function MetricCard({
  title,
  value,
  icon,
  href,
  tone = "default",
  helper,
  className,
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  href?: string;
  tone?: "default" | "accent" | "success" | "danger";
  helper?: string;
  className?: string;
}) {
  const backgroundColor =
    tone === "accent"
      ? "metric-card-tone-accent"
      : tone === "success"
        ? "metric-card-tone-success"
        : tone === "danger"
          ? "metric-card-tone-danger"
          : "";

  const content = (
    <article className={`card metric-card ${backgroundColor} ${className ?? ""}`.trim()}>
      <div className="card-header">
        <h3>{title}</h3>
        {icon}
      </div>
      <div className="metric-card-value">
        {value}
      </div>
      {helper && (
        <p className="metric-card-helper">
          {helper}
        </p>
      )}
    </article>
  );

  if (!href) return content;

  return (
    <Link href={href} className="metric-card-link" aria-label={title}>
      {content}
    </Link>
  );
}
