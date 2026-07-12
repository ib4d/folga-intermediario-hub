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
  const invitableRoles = getInvitableRoles(tenant.role).filter((role): role is InviteRole => role !== Role.SUPERADMIN);
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
      <div className="hero-section settings-hero">
        <div className="settings-hero-copy">
          <h1>{labels("settings.systemTitle")}</h1>
          <p>{labels("settings.systemDescription")}</p>
        </div>
        {organization && (
          <div className="settings-hero-org">
            <div className="settings-hero-org-label">{labels("settings.organization")}</div>
            <div className="settings-hero-org-name">{organization.name}</div>
            <span className="settings-hero-plan-badge">{organization.plan}</span>
          </div>
        )}
      </div>

      <div className="settings-quick-links">
        {canAccessModule(tenant.role, "branding") ? (
          <Link href="/ajustes/branding" className="card settings-link-card">
            <Palette size={24} color="var(--amber-flame)" />
            <div>
              <div className="settings-link-title">{labels("settings.branding")}</div>
              <div className="settings-link-copy">{labels("settings.logoColors")}</div>
            </div>
          </Link>
        ) : null}
        {canAccessModule(tenant.role, "apiKeys") ? (
          <Link href="/ajustes/api-keys" className="card settings-link-card">
            <Key size={24} color="var(--amber-flame)" />
            <div>
              <div className="settings-link-title">{labels("settings.apiKeys")}</div>
              <div className="settings-link-copy">{labels("settings.integrations")}</div>
            </div>
          </Link>
        ) : null}
        {canAccessModule(tenant.role, "billing") ? (
          <Link href="/billing" className="card settings-link-card">
            <CreditCard size={24} color="var(--amber-flame)" />
            <div>
              <div className="settings-link-title">{labels("settings.billing")}</div>
              <div className="settings-link-copy">{labels("settings.planPayments")}</div>
            </div>
          </Link>
        ) : null}
      </div>

      <div className="settings-layout-grid">
        <div className="settings-main-stack">
          <div className="card">
            <div className="card-header settings-section-header">
              <div>
                <h2 className="settings-section-title">{labels("settings.currentAccess")}</h2>
                <p className="settings-section-copy">{labels("settings.currentAccessDescription")}</p>
              </div>
              <span className="status-badge active">{roleLabel(tenant.role, language)}</span>
            </div>

            <div className="permission-matrix-grid settings-access-grid">
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">{labels("settings.scope")}</div>
                <h3 className="settings-card-title">{currentRoleSummary.scope}</h3>
                <p className="settings-card-copy">{currentRoleSummary.access}</p>
              </div>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">{labels("settings.management")}</div>
                <h3 className="settings-card-title">
                  {canManageUsers ? labels("settings.manageAccess") : labels("settings.readOnly")}
                </h3>
                <p className="settings-card-copy">{currentRoleSummary.management}</p>
              </div>
              <div className="permission-matrix-card">
                <div className="permission-matrix-scope">{labels("settings.visibleUsers")}</div>
                <h3 className="settings-card-title">{labels("settings.allowedDirectory")}</h3>
                <p className="settings-card-copy">{currentRoleSummary.visibleUsers}</p>
              </div>
            </div>

            <div className="settings-scope-grid">
              {[labels("settings.superadminScope"), labels("settings.adminScope"), labels("settings.operationalScope")].map((item) => (
                <div key={item} className="settings-scope-card">
                  {item}
                </div>
              ))}
            </div>

            <div className="settings-enabled-modules">
              <div className="settings-enabled-modules-label">{labels("settings.enabledModules")}</div>
              <div className="settings-enabled-modules-list">
                {accessibleModules.map((module) => (
                  <span key={module} className="status-badge active settings-module-badge">
                    {getAppModuleLabel(module, language)}
                  </span>
                ))}
              </div>
            </div>

            <ProviderStatusCard
              title={labels("settings.providersTitle")}
              storageLabel={labels("settings.storageLabel")}
              storageValue={storage.mode === "local" ? labels("settings.storageLocal") : labels("settings.storageSupabase")}
              storageNote={storage.mode === "local" ? labels("settings.storageLocalNote") : labels("settings.storageSupabaseNote")}
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
            <div className="card-header settings-section-header">
              <div className="settings-header-with-icon">
                <Users size={24} />
                <h2 className="settings-section-title">
                  {canManageUsers ? labels("settings.membersTitleManage") : labels("settings.membersTitleRead")}
                </h2>
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
                    const canManage = canManageMemberRole(tenant.role, membership.role, membership.userId === tenant.userId);
                    const isActive = membership.user.isActive && membership.isActive;

                    return (
                      <tr key={membership.id}>
                        <td className="settings-member-name">{membership.user.name}</td>
                        <td>{membership.user.email}</td>
                        <td>
                          <span className={`status-badge ${membership.role === "SUPERADMIN" ? "settings-role-badge-dark" : membership.role === "LEGAL" ? "settings-role-badge-amber" : "settings-role-badge-light"}`}>
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
                            <span className="settings-readonly-note">{labels("settings.readOnly")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="settings-footer-note">
              {canManageUsers ? labels("settings.activeMatrixAdmin") : labels("settings.activeMatrixRead")}
            </div>
          </div>

          <div className="card">
            <div className="card-header settings-section-header">
              <div>
                <h2 className="settings-section-title">{labels("settings.permissionMatrix")}</h2>
                <p className="settings-section-copy">{labels("settings.permissionMatrixDescription")}</p>
              </div>
            </div>
            <div className="permission-matrix-grid">
              {permissionReport.map((item) => (
                <div
                  key={item.role}
                  className={`permission-matrix-card${item.role === Role.SUPERADMIN ? " permission-matrix-card-primary" : ""}`}
                >
                  <div className="permission-matrix-scope">{item.scope}</div>
                  <h3 className="settings-card-title">{roleLabel(item.role, language)}</h3>
                  <div className="settings-module-list">
                    {getAccessibleModules(item.role).map((module) => (
                      <span key={`${item.role}-${module}`} className="status-badge active settings-module-badge">
                        {getAppModuleLabel(module, language)}
                      </span>
                    ))}
                  </div>
                  <p className="settings-card-copy">{item.access}</p>
                  <p className="settings-card-copy settings-card-copy-strong">{item.management}</p>
                  <p className="settings-card-copy settings-card-copy-small">
                    {labels("settings.visibleUsers")}: {item.visibleUsers}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header settings-section-header">
              <div className="settings-header-with-icon">
                <Database size={24} />
                <h2 className="settings-section-title">{labels("settings.dataExport")}</h2>
              </div>
            </div>
            <p className="settings-section-copy">{labels("settings.dataExportDescription")}</p>
            <div className="settings-data-export-actions">
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
