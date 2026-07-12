import { auth } from "@/auth";
import ApiKeyCreateForm from "@/components/ApiKeyCreateForm";
import { canAccessModule } from "@/lib/permissions";
import { normalizeLanguage, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Key, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ApiKeysPage() {
  const session = await auth();
  const tenant = await requireTenant();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);

  if (!canAccessModule(tenant.role, "apiKeys")) redirect("/sin-permisos");

  if (!["ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    return <div className="card settings-restricted-card">Sin acceso a esta sección.</div>;
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
    <div className="settings-detail-page">
      <div className="settings-detail-header">
        <div>
          <Link href="/ajustes" className="settings-back-link">
            {labels("settings.backToSettings")}
          </Link>
          <h1>{labels("settings.apiKeys")}</h1>
          <p>{labels("settings.apiKeysDescription")}</p>
        </div>
      </div>

      <ApiKeyCreateForm />

      <div className="card settings-keys-card">
        <h2 className="settings-card-heading">{labels("settings.activeKeys")}</h2>
        {apiKeys.length === 0 ? (
          <div className="settings-empty-state">
            <Key size={40} />
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
                    <td className="settings-key-name">
                      <Key size={14} /> {key.name}
                    </td>
                    <td className="settings-key-date">{key.createdAt.toLocaleDateString()}</td>
                    <td className="settings-key-date">
                      {key.lastUsedAt ? key.lastUsedAt.toLocaleDateString() : labels("settings.never")}
                    </td>
                    <td className="settings-key-actions">
                      <form action={revokeKey}>
                        <input type="hidden" name="keyId" value={key.id} />
                        <button type="submit" className="button button-secondary settings-revoke-button">
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

      <div className="card settings-endpoints-card">
        <h3 className="settings-endpoints-title">{labels("settings.availableEndpoints")}</h3>
        <ul className="settings-endpoints-list">
          <li>GET /api/v1/candidates - Listar candidatos</li>
          <li>GET /api/v1/documents - Listar documentos</li>
          <li>GET /api/v1/status - Estado del sistema</li>
        </ul>
        <p className="settings-endpoints-copy">
          {labels("settings.apiHeaderHelp")}: <code>Authorization: Bearer fhk_...</code>
        </p>
      </div>
    </div>
  );
}
