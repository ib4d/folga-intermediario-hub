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
    <div className="public-auth-shell">
      <div className="public-auth-shell-grid">
        <section className="public-auth-shell-hero">
          <div className="public-auth-shell-brand">
            <Link href="/" className="public-auth-shell-brand-link">
              <span className="public-auth-shell-brand-mark" />
              ORI CRUIT HUB
            </Link>
          </div>

          <div className="public-auth-shell-content">
            <span className="badge public-auth-shell-badge">{badge}</span>
            <div className="public-auth-shell-heading">
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>

          <div className="public-auth-shell-points">
            <div className="public-auth-shell-point">
              <span className="badge public-auth-shell-point-badge">1</span>
              <span>Pipeline de candidatos, documentos, legal y logistica en una sola operacion.</span>
            </div>
            <div className="public-auth-shell-point">
              <span className="badge public-auth-shell-point-badge">2</span>
              <span>Interfaz densa y legible para trabajo diario, con menos ruido visual.</span>
            </div>
            <div className="public-auth-shell-point">
              <span className="badge public-auth-shell-point-badge">3</span>
              <span>Preparado para reclutamiento, cumplimiento, cobros y seguimiento por equipo.</span>
            </div>
          </div>
        </section>

        <section className="public-auth-shell-panel">
          <div className="card public-auth-card">
            {children}
            {footer ? <div className="public-auth-shell-footer">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
