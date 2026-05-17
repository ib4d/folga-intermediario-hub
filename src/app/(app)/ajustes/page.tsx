import { Users, Database, Key, Palette, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ExportButton from "@/components/ExportButton";
import AjustesSettings from "@/components/AjustesSettings";
import InviteUserModal from "@/components/InviteUserModal";
import Link from "next/link";
import { Role } from "@prisma/client";
import { requireTenant } from "@/lib/tenant";
import { canAccessModule, canManageMemberRole, canViewMemberRole, getInvitableRoles, roleLabel } from "@/lib/permissions";
import { updateMemberAccessAction, updateMemberRoleAction } from "@/app/actions/user-permissions";

type InviteRole = "ADMIN" | "INTERMEDIARIO" | "LEGAL" | "LOGISTICA";

export default async function AjustesPage() {
  const tenant = await requireTenant();

  const memberships = await prisma.membership.findMany({
    where: { organizationId: tenant.organizationId },
    include: { user: { select: { name: true, email: true, isActive: true } } },
    orderBy: { role: "asc" },
  });
  const users = memberships.filter((membership) =>
    canViewMemberRole(tenant.role, membership.role, membership.userId === tenant.userId)
  );
  const invitableRoles = getInvitableRoles(tenant.role).filter(
    (role): role is InviteRole => role !== Role.SUPERADMIN
  );
  const assignableRoles = tenant.role === Role.SUPERADMIN ? [Role.SUPERADMIN, ...invitableRoles] : invitableRoles;

  const permissionReport = [
    {
      role: Role.SUPERADMIN,
      scope: "Todo el sistema",
      access: "Ve todos los modulos, usuarios, candidatos, documentos, legal, logistica, billing, API y auditoria.",
      management: "Puede conceder o retirar acceso a cualquier usuario y cambiar roles.",
    },
    {
      role: Role.ADMIN,
      scope: "Operacion de la organizacion",
      access: "Ve candidatos y modulos operativos de su organizacion; no ve ni gestiona superadmins.",
      management: "Puede invitar y gestionar Intermediario, Legal y Logistica.",
    },
    {
      role: Role.LEGAL,
      scope: "Revision legal",
      access: "Ve la cola legal, candidatos en revision y documentos necesarios para decision legal.",
      management: "Solo ve usuarios Legal de su organizacion.",
    },
    {
      role: Role.LOGISTICA,
      scope: "Llegadas y coordinacion",
      access: "Ve logistica, candidatos aprobados o listos para llegada y campos operativos de transporte/alojamiento.",
      management: "Solo ve usuarios Logistica de su organizacion.",
    },
    {
      role: Role.INTERMEDIARIO,
      scope: "Captacion propia",
      access: "Ve sus candidatos, documentos relacionados y links de registro asociados a su cartera.",
      management: "Solo ve usuarios Intermediario de su organizacion.",
    },
  ];

  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    select: { name: true, plan: true, slug: true },
  });

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
        {canAccessModule(tenant.role, "branding") ? (
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
        ) : null}
        {canAccessModule(tenant.role, "apiKeys") ? (
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
        ) : null}
        {canAccessModule(tenant.role, "billing") ? (
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
        ) : null}
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
              {invitableRoles.length > 0 ? (
                <InviteUserModal allowedRoles={invitableRoles} />
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
                    <th>Permisos</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((membership) => {
                    const canManage = canManageMemberRole(
                      tenant.role,
                      membership.role,
                      membership.userId === tenant.userId
                    );
                    const isActive = membership.user.isActive && membership.isActive;

                    return (
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
                            {roleLabel(membership.role)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${isActive ? "active" : ""}`}>
                            {isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          {canManage ? (
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <form action={updateMemberRoleAction} style={{ display: "flex", gap: "0.5rem" }}>
                                <input type="hidden" name="membershipId" value={membership.id} />
                                <select name="role" className="select" defaultValue={membership.role} style={{ minWidth: "150px" }}>
                                  {assignableRoles.map((role) => (
                                    <option key={role} value={role}>
                                      {roleLabel(role)}
                                    </option>
                                  ))}
                                </select>
                                <button className="button button-secondary" type="submit">
                                  Guardar rol
                                </button>
                              </form>
                              <form action={updateMemberAccessAction}>
                                <input type="hidden" name="membershipId" value={membership.id} />
                                <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
                                <button className="button button-secondary" type="submit">
                                  {isActive ? "Quitar acceso" : "Activar acceso"}
                                </button>
                              </form>
                            </div>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700 }}>
                              Solo lectura
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.85rem", fontWeight: 700 }}>
              Matriz activa: Superadmin ve y gestiona todo. Admin gestiona Legal, Logistica e Intermediarios.
              Roles operativos solo ven usuarios de su mismo rango.
            </div>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Matriz de Permisos</h2>
                <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontWeight: 700 }}>
                  Control de visibilidad y administracion por jerarquia.
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              {permissionReport.map((item) => (
                <div
                  key={item.role}
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: item.role === Role.SUPERADMIN ? "var(--pitch-black)" : "var(--background)",
                    color: item.role === Role.SUPERADMIN ? "var(--ghost-white)" : "var(--foreground)",
                    padding: "1rem",
                    minHeight: "220px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color: item.role === Role.SUPERADMIN ? "var(--primary)" : "var(--muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {item.scope}
                  </div>
                  <h3 style={{ marginTop: 0 }}>{roleLabel(item.role)}</h3>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{item.access}</p>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.5, fontWeight: 800 }}>{item.management}</p>
                </div>
              ))}
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
