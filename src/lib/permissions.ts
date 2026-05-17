import { Role } from "@prisma/client";

const ADMIN_MANAGED_ROLES = [Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA] as const;
const SUPERADMIN_INVITABLE_ROLES = [Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA, Role.ADMIN] as const;

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
