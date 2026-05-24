import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Key, Trash2 } from "lucide-react";
import { canAccessModule } from "@/lib/permissions";
import { redirect } from "next/navigation";
import ApiKeyCreateForm from "@/components/ApiKeyCreateForm";
import { normalizeLanguage, t } from "@/lib/i18n";
import { auth } from "@/auth";

export default async function ApiKeysPage() {
  const session = await auth();
  const tenant = await requireTenant();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  if (!canAccessModule(tenant.role, "apiKeys")) redirect("/sin-permisos");

  if (!["ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    return <div className="card" style={{ padding: "2rem" }}>Sin acceso a esta seccion.</div>;
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      organizationId: tenant.organizationId,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  async function revokeKey(formData: FormData) {
    "use server";
    const { revokeApiKey } = await import("@/app/actions/settings");
    const keyId = String(formData.get("keyId") ?? "");
    await revokeApiKey(keyId);
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "860px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/ajustes" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.875rem" }}>
          {labels("settings.backToSettings")}
        </Link>
        <h1 style={{ marginTop: "0.5rem" }}>{labels("settings.apiKeys")}</h1>
        <p style={{ opacity: 0.7 }}>
          {labels("settings.apiKeysDescription")}
        </p>
      </div>

      <ApiKeyCreateForm />

      <div className="card">
        <h2 style={{ marginBottom: "1.5rem" }}>{labels("settings.activeKeys")}</h2>
        {apiKeys.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>
            <Key size={40} style={{ marginBottom: "1rem" }} />
            <p>{labels("settings.noActiveKeys")}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{labels("settings.name")}</th>
                  <th>{labels("settings.createdAt")}</th>
                  <th>{labels("settings.lastUsedAt")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Key size={14} /> {key.name}
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>{key.createdAt.toLocaleDateString()}</td>
                    <td style={{ fontSize: "0.875rem" }}>
                      {key.lastUsedAt ? key.lastUsedAt.toLocaleDateString() : labels("settings.never")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <form action={revokeKey}>
                        <input type="hidden" name="keyId" value={key.id} />
                        <button
                          type="submit"
                          className="button button-secondary"
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            color: "#ef4444",
                          }}
                        >
                          <Trash2 size={12} /> {labels("settings.revoke")}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "2rem", backgroundColor: "#fffbeb", border: "1px solid #fbbf24" }}>
        <h3 style={{ color: "#92400e", marginBottom: "0.5rem" }}>{labels("settings.availableEndpoints")}</h3>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
          <li style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>GET /api/v1/candidates - Listar candidatos</li>
          <li style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>GET /api/v1/documents - Listar documentos</li>
          <li style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>GET /api/v1/status - Estado del sistema</li>
        </ul>
        <p style={{ fontSize: "0.75rem", marginTop: "1rem", opacity: 0.7 }}>
          {labels("settings.apiHeaderHelp")}: <code>Authorization: Bearer fhk_...</code>
        </p>
      </div>
    </div>
  );
}
