import { Users, Database, Key, Palette, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ExportButton from "@/components/ExportButton";
import AjustesSettings from "@/components/AjustesSettings";
import InviteUserModal from "@/components/InviteUserModal";
import ProviderStatusCard from "@/components/ProviderStatusCard";
import Link from "next/link";
import { Role } from "@prisma/client";
import { requireTenant } from "@/lib/tenant";
import {
  canAccessModule,
  canInviteUsers,
  canManageMemberRole,
  canViewMemberRole,
  getAccessibleModules,
  getAppModuleLabel,
  getInvitableRoles,
  getLocalizedRolePermissionSummary,
  roleLabel,
} from "@/lib/permissions";
import { updateMemberAccessAction, updateMemberRoleAction } from "@/app/actions/user-permissions";
import { normalizeLanguage, t } from "@/lib/i18n";
import { getProviderStatus } from "@/lib/provider-status";
import { auth } from "@/auth";

type InviteRole = "ADMIN" | "INTERMEDIARIO" | "LEGAL" | "LOGISTICA";

export default async function AjustesPage() {
  const session = await auth();
  const tenant = await requireTenant();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const providerStatus = getProviderStatus();
  const { storage, availableStorage, availableOcr, manualOcrMode } = providerStatus;

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
  const currentRoleSummary = getLocalizedRolePermissionSummary(tenant.role, language);
  const accessibleModules = getAccessibleModules(tenant.role);

  const permissionReport = [
    getLocalizedRolePermissionSummary(Role.SUPERADMIN, language),
    getLocalizedRolePermissionSummary(Role.ADMIN, language),
    getLocalizedRolePermissionSummary(Role.LEGAL, language),
    getLocalizedRolePermissionSummary(Role.LOGISTICA, language),
    getLocalizedRolePermissionSummary(Role.INTERMEDIARIO, language),
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
          <h1 style={{ color: "var(--ghost-white)" }}>{labels("settings.systemTitle")}</h1>
          <p style={{ color: "var(--grey-olive)" }}>
            {labels("settings.systemDescription")}
          </p>
        </div>
        {organization && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "0.25rem" }}>{labels("settings.organization")}</div>
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
            <div style={{ fontWeight: "bold" }}>{labels("settings.branding")}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{labels("settings.logoColors")}</div>
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
            <div style={{ fontWeight: "bold" }}>{labels("settings.apiKeys")}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{labels("settings.integrations")}</div>
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
            <div style={{ fontWeight: "bold" }}>{labels("settings.billing")}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{labels("settings.planPayments")}</div>
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
                <h2 style={{ margin: 0 }}>{labels("settings.currentAccess")}</h2>
                <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontWeight: 700 }}>
                  {labels("settings.currentAccessDescription")}
                </p>
              </div>
              <span className="status-badge active">{roleLabel(tenant.role, language)}</span>
            </div>

            <div className="permission-matrix-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">{labels("settings.scope")}</div>
                <h3 style={{ marginTop: 0 }}>{currentRoleSummary.scope}</h3>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{currentRoleSummary.access}</p>
              </div>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">{labels("settings.management")}</div>
                <h3 style={{ marginTop: 0 }}>{canManageUsers ? labels("settings.manageAccess") : labels("settings.readOnly")}</h3>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{currentRoleSummary.management}</p>
              </div>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">{labels("settings.visibleUsers")}</div>
                <h3 style={{ marginTop: 0 }}>{labels("settings.allowedDirectory")}</h3>
                <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{currentRoleSummary.visibleUsers}</p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                marginTop: "1.25rem",
              }}
            >
              {[labels("settings.superadminScope"), labels("settings.adminScope"), labels("settings.operationalScope")].map((item) => (
                <div
                  key={item}
                  style={{
                    border: "1px solid var(--grey-olive)",
                    padding: "0.85rem 1rem",
                    backgroundColor: "rgba(255,255,255,0.6)",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    lineHeight: 1.45,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.85rem" }}>
                {labels("settings.enabledModules")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {accessibleModules.map((module) => (
                  <span key={module} className="status-badge active" style={{ paddingInline: "0.85rem" }}>
                    {getAppModuleLabel(module, language)}
                  </span>
                ))}
              </div>
            </div>

            <ProviderStatusCard
              title={labels("settings.providersTitle")}
              storageLabel={labels("settings.storageLabel")}
              storageValue={storage.mode === "local" ? labels("settings.storageLocal") : labels("settings.storageSupabase")}
              storageNote={
                storage.mode === "local"
                  ? labels("settings.storageLocalNote")
                  : labels("settings.storageSupabaseNote")
              }
              storageAvailableLabel={labels("settings.providersAvailable")}
              storageAvailableValue={availableStorage.map((provider) => provider.statusLabel)}
              ocrLabel={labels("settings.ocrLabel")}
              ocrValue={manualOcrMode ? labels("settings.ocrManualMode") : labels("settings.ocrAutomaticMode")}
              ocrNote={manualOcrMode ? labels("settings.ocrManualNote") : labels("settings.ocrAutomaticNote")}
              ocrAvailableLabel={labels("settings.providersAvailable")}
              ocrAvailableValue={availableOcr.map((provider) => provider.statusLabel)}
            />
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Users size={24} />
                <h2 style={{ margin: 0 }}>{canManageUsers ? labels("settings.membersTitleManage") : labels("settings.membersTitleRead")}</h2>
              </div>
              {invitableRoles.length > 0 ? (
                <InviteUserModal allowedRoles={invitableRoles} language={language} />
              ) : (
                <button className="button" disabled title={labels("settings.superadminAdminOnly")}>
                  {labels("settings.inviteUser")}
                </button>
              )}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{labels("settings.name")}</th>
                    <th>{labels("settings.email")}</th>
                    <th>{labels("settings.role")}</th>
                    <th>{labels("settings.status")}</th>
                    <th>{labels("settings.permissions")}</th>
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
                            {roleLabel(membership.role, language)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${isActive ? "active" : ""}`}>
                            {isActive ? labels("settings.active") : labels("settings.inactive")}
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
                                      {roleLabel(role, language)}
                                    </option>
                                  ))}
                                </select>
                                <button className="button button-secondary member-action-button" type="submit">
                                  {labels("settings.saveRole")}
                                </button>
                              </form>
                              <form action={updateMemberAccessAction}>
                                <input type="hidden" name="membershipId" value={membership.id} />
                                <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
                                <button className="button button-secondary member-action-button" type="submit">
                                  {isActive ? labels("settings.removeAccess") : labels("settings.enableAccess")}
                                </button>
                              </form>
                            </div>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700 }}>
                              {labels("settings.readOnly")}
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
                ? labels("settings.activeMatrixAdmin")
                : labels("settings.activeMatrixRead")}
            </div>
          </div>

          <div className="card">
            <div
              className="card-header"
              style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{labels("settings.permissionMatrix")}</h2>
                <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontWeight: 700 }}>
                  {labels("settings.permissionMatrixDescription")}
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
                <h3 style={{ marginTop: 0 }}>{roleLabel(item.role, language)}</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
                    {getAccessibleModules(item.role).map((module) => (
                      <span key={`${item.role}-${module}`} className="status-badge active" style={{ paddingInline: "0.65rem" }}>
                        {getAppModuleLabel(module, language)}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{item.access}</p>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.5, fontWeight: 800 }}>{item.management}</p>
                  <p style={{ fontSize: "0.78rem", lineHeight: 1.45, fontWeight: 700, opacity: 0.82 }}>
                    {labels("settings.visibleUsers")}: {item.visibleUsers}
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
                <h2 style={{ margin: 0 }}>{labels("settings.dataExport")}</h2>
              </div>
            </div>
            <p>{labels("settings.dataExportDescription")}</p>
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

