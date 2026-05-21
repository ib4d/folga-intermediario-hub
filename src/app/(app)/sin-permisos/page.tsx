import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SinPermisosPage() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 8rem)",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <section
        className="card"
        style={{
          width: "min(100%, 680px)",
          padding: "2rem",
          display: "grid",
          gap: "1.25rem",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            display: "grid",
            placeItems: "center",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          <ShieldAlert size={28} strokeWidth={2.5} />
        </div>

        <div>
          <p
            style={{
              marginBottom: "0.55rem",
              color: "var(--muted)",
              fontSize: "0.78rem",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Acceso restringido
          </p>
          <h1 style={{ marginBottom: "0.75rem" }}>No tienes permisos para este modulo</h1>
          <p style={{ margin: 0, maxWidth: "540px" }}>
            Tu rol actual no tiene acceso a esta seccion. Si necesitas operar aqui, solicita a un administrador que ajuste tu
            rol o permisos dentro de Ajustes.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="button">
            Volver al dashboard
          </Link>
          <Link href="/ajustes" className="button button-secondary">
            Ver mi perfil
          </Link>
        </div>
      </section>
    </div>
  );
}
