import Link from "next/link";
import type { CSSProperties } from "react";

type PlatformStatusCardProps = {
  title: string;
  description?: string;
  databaseLabel: string;
  databaseValue: string;
  healthLabel: string;
  healthValue: string;
  providersLabel: string;
  providersValue: string;
  openHealthLabel: string;
  openProvidersLabel: string;
};

export default function PlatformStatusCard({
  title,
  description,
  databaseLabel,
  databaseValue,
  healthLabel,
  healthValue,
  providersLabel,
  providersValue,
  openHealthLabel,
  openProvidersLabel,
}: PlatformStatusCardProps) {
  const panelStyle: CSSProperties = {
    border: "1px solid rgba(0, 0, 0, 0.1)",
    background: "rgba(255, 255, 255, 0.72)",
    padding: "1rem 1.1rem",
  };

  const labelStyle: CSSProperties = {
    fontSize: "0.8rem",
    fontWeight: 800,
    textTransform: "uppercase",
  };

  const valueStyle: CSSProperties = {
    marginTop: "0.5rem",
    fontSize: "1.05rem",
    fontWeight: 900,
  };

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
        <div style={panelStyle}>
          <div style={labelStyle}>{databaseLabel}</div>
          <div style={valueStyle}>
            <span className="status-badge active" style={{ paddingInline: "0.75rem" }}>
              {databaseValue}
            </span>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={labelStyle}>{healthLabel}</div>
          <div style={valueStyle}>
            <span className="status-badge active" style={{ paddingInline: "0.75rem" }}>
              {healthValue}
            </span>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={labelStyle}>{providersLabel}</div>
          <div style={{ marginTop: "0.5rem", fontSize: "1.05rem", fontWeight: 900, lineHeight: 1.45 }}>
            {providersValue}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
        <Link href="/api/health" className="button button-secondary" style={{ textDecoration: "none" }}>
          {openHealthLabel}
        </Link>
        <Link href="/api/providers/status" className="button button-secondary" style={{ textDecoration: "none" }}>
          {openProvidersLabel}
        </Link>
      </div>
    </div>
  );
}
