import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { normalizeLanguage, t } from "@/lib/i18n";

export default async function SinPermisosPage() {
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  return (
    <div className="forbidden-page-shell">
      <section className="card forbidden-page-card">
        <div className="forbidden-page-icon">
          <ShieldAlert size={28} strokeWidth={2.5} />
        </div>

        <div>
          <p className="forbidden-page-badge">{labels("forbidden.badge")}</p>
          <h1 className="forbidden-page-title">{labels("forbidden.title")}</h1>
          <p className="forbidden-page-copy">{labels("forbidden.description")}</p>
        </div>

        <div className="forbidden-page-actions">
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
