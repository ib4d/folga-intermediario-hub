import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Key, Trash2, Plus } from "lucide-react";
import { canAccessModule } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function ApiKeysPage() {
  const tenant = await requireTenant();

  if (!canAccessModule(tenant.role, "apiKeys")) redirect("/sin-permisos");

  if (!["ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    return <div className="card" style={{ padding: "2rem" }}>Sin acceso a esta sección.</div>;
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      organizationId: tenant.organizationId!,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  async function createKey(formData: FormData): Promise<void> {
    "use server";
    const { createApiKey } = await import("@/app/actions/settings");
    const name = formData.get("name") as string;
    await createApiKey(name);
  }

  async function revokeKey(formData: FormData) {
    "use server";
    const { revokeApiKey } = await import("@/app/actions/settings");
    const keyId = formData.get("keyId") as string;
    await revokeApiKey(keyId);
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/ajustes" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.875rem" }}>
          ← Volver a Ajustes
        </Link>
        <h1 style={{ marginTop: "0.5rem" }}>API Keys</h1>
        <p style={{ opacity: 0.7 }}>
          Gestiona las claves de acceso a la API para integraciones externas. 
          Las claves solo se muestran una vez al crearlas.
        </p>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Crear nueva API Key</h2>
        <form action={createKey} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="keyName" style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Nombre descriptivo
            </label>
            <input
              id="keyName"
              name="name"
              type="text"
              placeholder="Ej: Integración CRM"
              required
              className="input"
              style={{ width: "100%" }}
            />
          </div>
          <button type="submit" className="button" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={16} /> Crear Key
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: "1.5rem" }}>Keys Activas</h2>
        {apiKeys.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>
            <Key size={40} style={{ marginBottom: "1rem" }} />
            <p>No hay API keys activas.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Creado</th>
                  <th>Último uso</th>
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
                      {key.lastUsedAt ? key.lastUsedAt.toLocaleDateString() : "Nunca"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <form action={revokeKey}>
                        <input type="hidden" name="keyId" value={key.id} />
                        <button
                          type="submit"
                          className="button button-secondary"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.25rem", color: "#ef4444" }}
                        >
                          <Trash2 size={12} /> Revocar
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
        <h3 style={{ color: "#92400e", marginBottom: "0.5rem" }}>Endpoints disponibles</h3>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
          <li style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>GET /api/v1/candidates — Listar candidatos</li>
          <li style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>GET /api/v1/documents — Listar documentos</li>
          <li style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>GET /api/v1/status — Estado del sistema</li>
        </ul>
        <p style={{ fontSize: "0.75rem", marginTop: "1rem", opacity: 0.7 }}>
          Incluye el header: <code>Authorization: Bearer fhk_...</code>
        </p>
      </div>
    </div>
  );
}
