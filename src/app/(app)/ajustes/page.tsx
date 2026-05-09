import { Users, Database, Key, Palette, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ExportButton from "@/components/ExportButton";
import AjustesSettings from "@/components/AjustesSettings";
import InviteUserModal from "@/components/InviteUserModal";
import Link from "next/link";

export default async function AjustesPage() {
  const session = await auth();

  const users = await prisma.membership.findMany({
    where: { organizationId: session?.user?.organizationId || "" },
    include: { user: { select: { name: true, email: true, isActive: true } } },
    orderBy: { role: "asc" },
  });

  const organization = session?.user?.organizationId
    ? await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true, plan: true, slug: true },
      })
    : null;

  return (
    <>
      <div
        className="hero-section"
        style={{
          padding: "2rem",
          backgroundColor: "var(--pitch-black)",
          color: "var(--ghost-white)",
          borderBottom: "2px solid var(--grey-olive)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 style={{ color: "var(--ghost-white)" }}>Ajustes del Sistema</h1>
          <p style={{ color: "var(--grey-olive)" }}>
            Configuración de usuarios, notificaciones y exportación de datos.
          </p>
        </div>
        {organization && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.25rem" }}>Organización</div>
            <div style={{ fontWeight: "bold", fontSize: "1.125rem" }}>{organization.name}</div>
            <span
              style={{
                display: "inline-block",
                backgroundColor: "var(--amber-flame)",
                color: "var(--pitch-black)",
                padding: "2px 8px",
                border: "2px solid var(--pitch-black)",
                fontSize: "0.75rem",
                fontWeight: "900",
                marginTop: "0.25rem",
                boxShadow: "2px 2px 0px var(--pitch-black)"
              }}
            >
              {organization.plan}
            </span>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          padding: "1.5rem 0",
        }}
      >
        <Link
          href="/ajustes/branding"
          className="card"
          style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}
        >
          <Palette size={24} color="var(--amber-flame)" />
          <div>
            <div style={{ fontWeight: "bold" }}>Branding</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Logo y colores</div>
          </div>
        </Link>
        <Link
          href="/ajustes/api-keys"
          className="card"
          style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}
        >
          <Key size={24} color="var(--amber-flame)" />
          <div>
            <div style={{ fontWeight: "bold" }}>API Keys</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Integraciones</div>
          </div>
        </Link>
        <Link
          href="/billing"
          className="card"
          style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}
        >
          <CreditCard size={24} color="var(--amber-flame)" />
          <div>
            <div style={{ fontWeight: "bold" }}>Facturación</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Plan y pagos</div>
          </div>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="card">
            <div
              className="card-header"
              style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={24} />
                <h2 style={{ margin: 0 }}>Miembros de la Organización</h2>
              </div>
              {["SUPERADMIN", "ADMIN"].includes(session?.user?.role || "") ? (
                <InviteUserModal />
              ) : (
                <button className="button" disabled title="Solo ADMIN">
                  Invitar Usuario
                </button>
              )}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((membership) => (
                    <tr key={membership.id}>
                      <td style={{ fontWeight: "bold" }}>{membership.user.name}</td>
                      <td>{membership.user.email}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor:
                              membership.role === "SUPERADMIN"
                                ? "var(--pitch-black)"
                                : membership.role === "LEGAL"
                                ? "var(--amber-flame)"
                                : "var(--ghost-white)",
                            color:
                              membership.role === "SUPERADMIN" ? "var(--ghost-white)" : "var(--pitch-black)",
                          }}
                        >
                          {membership.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${membership.isActive ? "active" : ""}`}>
                          {membership.user.isActive && membership.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Database size={24} />
                <h2 style={{ margin: 0 }}>Exportación de Datos</h2>
              </div>
            </div>
            <p>Genera reportes para RRHH, marketing o dirección basados en la base de datos actual.</p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <ExportButton />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <AjustesSettings />
        </div>
      </div>
    </>
  );
}
