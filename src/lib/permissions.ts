import { Role } from "@prisma/client";

const ADMIN_MANAGED_ROLES = [Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA] as const;
const SUPERADMIN_INVITABLE_ROLES = [Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA, Role.ADMIN] as const;

export type AppModule =
  | "dashboard"
  | "candidates"
  | "documents"
  | "logistics"
  | "legal"
  | "settings"
  | "billing"
  | "apiKeys"
  | "branding";

const MODULE_ACCESS: Record<Role, AppModule[]> = {
  [Role.SUPERADMIN]: [
    "dashboard",
    "candidates",
    "documents",
    "logistics",
    "legal",
    "settings",
    "billing",
    "apiKeys",
    "branding",
  ],
  [Role.ADMIN]: [
    "dashboard",
    "candidates",
    "documents",
    "logistics",
    "legal",
    "settings",
    "billing",
    "apiKeys",
    "branding",
  ],
  [Role.INTERMEDIARIO]: ["dashboard", "candidates", "documents", "settings"],
  [Role.LEGAL]: ["dashboard", "candidates", "documents", "legal", "settings"],
  [Role.LOGISTICA]: ["dashboard", "candidates", "logistics", "settings"],
};

export function canViewMemberRole(viewerRole: Role, targetRole: Role, isSelf = false): boolean {
  if (isSelf) return true;
  if (viewerRole === Role.SUPERADMIN) return true;
  if (viewerRole === Role.ADMIN) return ADMIN_MANAGED_ROLES.includes(targetRole as (typeof ADMIN_MANAGED_ROLES)[number]);
  return viewerRole === targetRole;
}

export function canManageMemberRole(viewerRole: Role, targetRole: Role, isSelf = false): boolean {
  if (isSelf) return false;
  if (viewerRole === Role.SUPERADMIN) return true;
  if (viewerRole === Role.ADMIN) return ADMIN_MANAGED_ROLES.includes(targetRole as (typeof ADMIN_MANAGED_ROLES)[number]);
  return false;
}

export function getInvitableRoles(viewerRole: Role): Role[] {
  if (viewerRole === Role.SUPERADMIN) return [...SUPERADMIN_INVITABLE_ROLES];
  if (viewerRole === Role.ADMIN) return [...ADMIN_MANAGED_ROLES];
  return [];
}

export function canAssignRole(viewerRole: Role, nextRole: Role): boolean {
  if (viewerRole === Role.SUPERADMIN && nextRole === Role.SUPERADMIN) return true;
  return getInvitableRoles(viewerRole).includes(nextRole);
}

export function canAccessModule(viewerRole: Role, module: AppModule): boolean {
  return MODULE_ACCESS[viewerRole]?.includes(module) ?? false;
}

export function canCreateCandidates(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO] as Role[]).includes(viewerRole);
}

export function canImportCandidates(viewerRole: Role): boolean {
  return canCreateCandidates(viewerRole);
}

export function canUploadCandidateDocuments(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO] as Role[]).includes(viewerRole);
}

export function canReviewCandidateDocuments(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.LEGAL] as Role[]).includes(viewerRole);
}

export function canRequestLegalReview(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO, Role.LOGISTICA] as Role[]).includes(viewerRole);
}

export function canMakeLegalDecision(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.LEGAL] as Role[]).includes(viewerRole);
}

export function canManageLogistics(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.LOGISTICA] as Role[]).includes(viewerRole);
}

export function canInviteUsers(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN] as Role[]).includes(viewerRole);
}

export function canDeleteCandidates(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO] as Role[]).includes(viewerRole);
}

export function canGenerateRegistrationLinks(viewerRole: Role): boolean {
  return canCreateCandidates(viewerRole);
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPERADMIN: "Superadmin",
    ADMIN: "Administrador",
    INTERMEDIARIO: "Intermediario",
    LEGAL: "Legal",
    LOGISTICA: "Logistica",
  };

  return labels[role];
}
