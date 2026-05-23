import { Users, Database, Key, Palette, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ExportButton from "@/components/ExportButton";
import AjustesSettings from "@/components/AjustesSettings";
import InviteUserModal from "@/components/InviteUserModal";
import Link from "next/link";
import { Role } from "@prisma/client";
import { requireTenant } from "@/lib/tenant";
import {
  APP_MODULE_LABELS,
  ROLE_PERMISSION_SUMMARIES,
  canAccessModule,
  canInviteUsers,
  canManageMemberRole,
  canViewMemberRole,
  getAccessibleModules,
  getInvitableRoles,
  roleLabel,
} from "@/lib/permissions";
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
  const canManageUsers = canInviteUsers(tenant.role);
  const invitableRoles = getInvitableRoles(tenant.role).filter(
    (role): role is InviteRole => role !== Role.SUPERADMIN
  );
  const assignableRoles = tenant.role === Role.SUPERADMIN ? [Role.SUPERADMIN, ...invitableRoles] : invitableRoles;
  const currentRoleSummary = ROLE_PERMISSION_SUMMARIES[tenant.role];
  const accessibleModules = getAccessibleModules(tenant.role);

  const permissionReport = [
    ROLE_PERMISSION_SUMMARIES[Role.SUPERADMIN],
    ROLE_PERMISSION_SUMMARIES[Role.ADMIN],
    ROLE_PERMISSION_SUMMARIES[Role.LEGAL],
    ROLE_PERMISSION_SUMMARIES[Role.LOGISTICA],
    ROLE_PERMISSION_SUMMARIES[Role.INTERMEDIARIO],
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
            Configuracion de usuarios, notificaciones y exportacion de datos.
          </p>
        </div>
        {organization && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.25rem" }}>Organizacion</div>
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
      <div className="settings-quick-links">
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
            <div style={{ fontWeight: "bold" }}>Facturacion</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Plan y pagos</div>
          </div>
        </Link>
        ) : null}
      </div>

      <div className="settings-layout-grid">
        <div className="settings-main-stack">
          <div className="card">
            <div
              className="card-header"
              style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Tu Acceso Actual</h2>
                <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontWeight: 700 }}>
                  Resumen operativo del rol con el que estas trabajando ahora.
                </p>
              </div>
              <span className="status-badge active">{roleLabel(tenant.role)}</span>
            </div>

            <div className="permission-matrix-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">Alcance</div>
                <h3 style={{ marginTop: 0 }}>{currentRoleSummary.scope}</h3>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{currentRoleSummary.access}</p>
              </div>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">Gestion</div>
                <h3 style={{ marginTop: 0 }}>{canManageUsers ? "Puede administrar accesos" : "Solo lectura"}</h3>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{currentRoleSummary.management}</p>
              </div>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">Usuarios visibles</div>
                <h3 style={{ marginTop: 0 }}>Directorio permitido</h3>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{currentRoleSummary.visibleUsers}</p>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.85rem" }}>
                Modulos habilitados
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {accessibleModules.map((module) => (
                  <span key={module} className="status-badge active" style={{ paddingInline: "0.85rem" }}>
                    {APP_MODULE_LABELS[module]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={24} />
                <h2 style={{ margin: 0 }}>{canManageUsers ? "Miembros de la Organizacion" : "Usuarios Visibles Para Tu Rol"}</h2>
              </div>
              {invitableRoles.length > 0 ? (
                <InviteUserModal allowedRoles={invitableRoles} />
              ) : (
                <button className="button" disabled title="Solo Superadmin o Administrador">
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
                        <td className="member-management-cell">
                          {canManage ? (
                            <div className="member-management-actions">
                              <form action={updateMemberRoleAction} className="member-role-form">
                                <input type="hidden" name="membershipId" value={membership.id} />
                                <select name="role" className="select member-role-select" defaultValue={membership.role}>
                                  {assignableRoles.map((role) => (
                                    <option key={role} value={role}>
                                      {roleLabel(role)}
                                    </option>
                                  ))}
                                </select>
                                <button className="button button-secondary member-action-button" type="submit">
                                  Guardar rol
                                </button>
                              </form>
                              <form action={updateMemberAccessAction}>
                                <input type="hidden" name="membershipId" value={membership.id} />
                                <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
                                <button className="button button-secondary member-action-button" type="submit">
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
              {canManageUsers
                ? "Matriz activa: Superadmin ve y gestiona todo. Admin gestiona Legal, Logistica e Intermediarios."
                : "Vista restringida: solo puedes consultar usuarios permitidos para tu mismo rango operativo."}
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
            <div className="permission-matrix-grid">
              {permissionReport.map((item) => (
                <div
                  key={item.role}
                  className={`permission-matrix-card${item.role === Role.SUPERADMIN ? " permission-matrix-card-primary" : ""}`}
                >
                  <div
                    className="permission-matrix-scope"
                  >
                    {item.scope}
                  </div>
                  <h3 style={{ marginTop: 0 }}>{roleLabel(item.role)}</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
                    {getAccessibleModules(item.role).map((module) => (
                      <span key={`${item.role}-${module}`} className="status-badge active" style={{ paddingInline: "0.65rem" }}>
                        {APP_MODULE_LABELS[module]}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{item.access}</p>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.5, fontWeight: 800 }}>{item.management}</p>
                  <p style={{ fontSize: "0.78rem", lineHeight: 1.45, fontWeight: 700, opacity: 0.82 }}>
                    Usuarios visibles: {item.visibleUsers}
                  </p>
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
                <h2 style={{ margin: 0 }}>Exportacion de Datos</h2>
              </div>
            </div>
            <p>Genera reportes para RRHH, marketing o direccion basados en la base de datos actual.</p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <ExportButton />
            </div>
          </div>
        </div>

        <div className="settings-side-stack">
          <AjustesSettings />
        </div>
      </div>
    </>
  );
}

