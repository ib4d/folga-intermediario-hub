import { Role } from "@prisma/client";

const ADMIN_MANAGED_ROLES = [Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA] as const;
const SUPERADMIN_INVITABLE_ROLES = [Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA, Role.ADMIN] as const;

export type RolePermissionSummary = {
  role: Role;
  scope: string;
  access: string;
  management: string;
  visibleUsers: string;
};

export type AppModule =
  | "dashboard"
  | "candidates"
  | "documents"
  | "logistics"
  | "legal"
  | "settings"
  | "billing"
  | "apiKeys"
  | "branding"
  | "leads"
  | "revenue"
  | "marketplace";

export const APP_MODULE_LABELS: Record<AppModule, string> = {
  dashboard: "Dashboard",
  candidates: "Candidatos",
  documents: "Documentos",
  logistics: "Logistica",
  legal: "Legal",
  settings: "Ajustes",
  billing: "Facturacion",
  apiKeys: "API Keys",
  branding: "Branding",
  leads: "Leads",
  revenue: "Revenue",
  marketplace: "Marketplace",
};

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
    "leads",
    "revenue",
    "marketplace",
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
    "leads",
    "revenue",
    "marketplace",
  ],
  [Role.INTERMEDIARIO]: ["dashboard", "candidates", "documents", "settings"],
  [Role.LEGAL]: ["dashboard", "candidates", "documents", "legal", "settings"],
  [Role.LOGISTICA]: ["dashboard", "candidates", "logistics", "settings"],
};

export const ROLE_PERMISSION_SUMMARIES: Record<Role, RolePermissionSummary> = {
  [Role.SUPERADMIN]: {
    role: Role.SUPERADMIN,
    scope: "Todo el sistema",
    access: "Ve todos los modulos, usuarios, candidatos, documentos, legal, logistica, billing, API y auditoria.",
    management: "Puede conceder, cambiar o retirar acceso a cualquier usuario sin perder el ultimo superadmin activo.",
    visibleUsers: "Todos los usuarios de la organizacion.",
  },
  [Role.ADMIN]: {
    role: Role.ADMIN,
    scope: "Operacion de la organizacion",
    access: "Ve candidatos y modulos operativos de su organizacion; no ve ni gestiona superadmins.",
    management: "Puede invitar y gestionar Intermediario, Legal y Logistica.",
    visibleUsers: "Intermediarios, Legal y Logistica. No ve Superadmins ni otros Admin.",
  },
  [Role.INTERMEDIARIO]: {
    role: Role.INTERMEDIARIO,
    scope: "Captacion propia",
    access: "Ve sus candidatos, documentos relacionados y links de registro asociados a su cartera.",
    management: "No puede invitar usuarios ni cambiar roles.",
    visibleUsers: "Solo usuarios Intermediario de su organizacion.",
  },
  [Role.LEGAL]: {
    role: Role.LEGAL,
    scope: "Revision legal",
    access: "Ve la cola legal, candidatos en revision y documentos necesarios para decision legal.",
    management: "No puede invitar usuarios ni cambiar roles.",
    visibleUsers: "Solo usuarios Legal de su organizacion.",
  },
  [Role.LOGISTICA]: {
    role: Role.LOGISTICA,
    scope: "Llegadas y coordinacion",
    access: "Ve logistica, candidatos aprobados o listos para llegada y campos operativos de transporte/alojamiento.",
    management: "No puede invitar usuarios ni cambiar roles.",
    visibleUsers: "Solo usuarios Logistica de su organizacion.",
  },
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

export function getAccessibleModules(viewerRole: Role): AppModule[] {
  return [...(MODULE_ACCESS[viewerRole] ?? [])];
}

export function getRolePermissionSummary(role: Role): RolePermissionSummary {
  return ROLE_PERMISSION_SUMMARIES[role];
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

export function canAccessCandidateByOwnership(
  viewerRole: Role,
  candidateIntermediaryId: string,
  viewerUserId: string
): boolean {
  if (([Role.SUPERADMIN, Role.ADMIN, Role.LEGAL, Role.LOGISTICA] as Role[]).includes(viewerRole)) {
    return true;
  }

  return candidateIntermediaryId === viewerUserId;
}

export function canExportCandidates(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN] as Role[]).includes(viewerRole);
}

export function canExportLegalReview(viewerRole: Role): boolean {
  return canMakeLegalDecision(viewerRole);
}

export function canExportLogistics(viewerRole: Role): boolean {
  return canManageLogistics(viewerRole);
}

export function canViewCandidateContact(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO, Role.LOGISTICA] as Role[]).includes(viewerRole);
}

export function canViewCandidatePayment(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO] as Role[]).includes(viewerRole);
}

export function canViewCandidateLogistics(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO, Role.LOGISTICA] as Role[]).includes(viewerRole);
}

export function canViewCandidateAudit(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN] as Role[]).includes(viewerRole);
}

export function canEditCandidateNotes(viewerRole: Role): boolean {
  return ([Role.SUPERADMIN, Role.ADMIN, Role.INTERMEDIARIO, Role.LOGISTICA] as Role[]).includes(viewerRole);
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
