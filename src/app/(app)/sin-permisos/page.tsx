import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { normalizeLanguage, t } from "@/lib/i18n";

export default async function SinPermisosPage() {
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

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
            {labels("forbidden.badge")}
          </p>
          <h1 style={{ marginBottom: "0.75rem" }}>{labels("forbidden.title")}</h1>
          <p style={{ margin: 0, maxWidth: "540px" }}>
            {labels("forbidden.description")}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="button">
            {labels("forbidden.backDashboard")}
          </Link>
          <Link href="/ajustes" className="button button-secondary">
            {labels("forbidden.viewProfile")}
          </Link>
        </div>
      </section>
    </div>
  );
}
