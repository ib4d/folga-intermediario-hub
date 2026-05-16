import Link from "next/link";

export default function AuthShell({
  badge,
  title,
  description,
  children,
  footer,
}: {
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        backgroundColor: "var(--ghost-white)",
        backgroundImage:
          "linear-gradient(to bottom, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0)), linear-gradient(rgba(11, 5, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 5, 0, 0.04) 1px, transparent 1px)",
        backgroundSize: "auto, 28px 28px, 28px 28px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1080px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(340px, 460px)",
          border: "1px solid var(--pitch-black)",
          boxShadow: "0 22px 48px rgba(11, 5, 0, 0.12)",
          backgroundColor: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <section
          style={{
            minHeight: "580px",
            padding: "3rem",
            backgroundColor: "var(--pitch-black)",
            color: "var(--ghost-white)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "2rem",
          }}
        >
            <div style={{ display: "grid", gap: "1.25rem" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.75rem",
                color: "inherit",
                textDecoration: "none",
                fontWeight: 900,
                letterSpacing: "0.04em",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  backgroundColor: "var(--amber-flame)",
                  border: "1px solid var(--ghost-white)",
                }}
              />
              ORI CRUIT HUB
            </Link>

            <span className="badge" style={{ width: "fit-content" }}>
              {badge}
            </span>

            <div style={{ display: "grid", gap: "0.75rem", maxWidth: "32rem" }}>
              <h1 style={{ margin: 0, color: "var(--ghost-white)" }}>{title}</h1>
              <p style={{ margin: 0, color: "rgba(251, 249, 255, 0.76)", fontSize: "1rem" }}>
                {description}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "0.85rem",
              maxWidth: "28rem",
              fontSize: "0.9rem",
              color: "rgba(251, 249, 255, 0.82)",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span className="badge" style={{ padding: "0.2rem 0.45rem" }}>
                1
              </span>
              <span>Pipeline de candidatos, documentos, legal y logistica en una sola operacion.</span>
              
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span className="badge" style={{ padding: "0.2rem 0.45rem" }}>
                2
              </span>
              <span>Interfaz densa y legible para trabajo diario, con menos ruido visual.</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span className="badge" style={{ padding: "0.2rem 0.45rem" }}>
                3
              </span>
              <span>Preparado para reclutamiento, cumplimiento, cobros y seguimiento por equipo.</span>
            </div>
          </div>
        </section>

        <section
          style={{
            padding: "2.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            backgroundColor: "var(--surface-muted)",
          }}
        >
          <div className="card" style={{ margin: 0 }}>
            {children}
            {footer ? (
              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid rgba(11, 5, 0, 0.12)",
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                }}
              >
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
