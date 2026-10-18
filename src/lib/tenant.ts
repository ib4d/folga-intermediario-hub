import { auth } from "@/auth";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOrganizationAccess } from "@/lib/organization-access";
import { LOGISTICS_BLOCKED_STATUSES } from "@/lib/logistics-policy";

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: Role;
  isPlatformAdmin: boolean;
}

const crossCandidateRoles = new Set<Role>([
  Role.ADMIN,
  Role.SUPERADMIN,
  Role.LEGAL,
  Role.LOGISTICA,
]);

/**
 * Retrieves the current user's session and organization context.
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      organizationId: true,
      role: true,
      isActive: true,
      isPlatformAdmin: true,
      memberships: {
        select: {
          organizationId: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!user?.isActive) return null;

  const organizationAccess = resolveOrganizationAccess({
    organizationId: user.organizationId,
    role: user.role,
    memberships: user.memberships,
  });
  if (!organizationAccess?.organizationId) return null;

  // Organization deactivation is a tenant-wide access stop. It must apply to
  // every organization role; platform access is resolved independently below.
  const organization = await prisma.organization.findUnique({
    where: { id: organizationAccess.organizationId },
    select: { isActive: true },
  });
  if (!organization?.isActive) return null;

  return {
    userId: user.id,
    organizationId: organizationAccess.organizationId,
    role: organizationAccess.role,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

/**
 * Ensures the user has a valid organization context.
 * Throws an error if not found.
 */
export async function requireTenant(): Promise<TenantContext> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    throw new Error(
      "No se encontro el contexto de la organizacion. Por favor, inicie sesion."
    );
  }
  return tenant;
}

/**
 * Helper to scope Prisma queries to the current organization.
 */
export function withTenantScope<T extends { organizationId?: string }>(
  organizationId: string,
  where: T = {} as T
) {
  return {
    ...where,
    organizationId,
  };
}

/**
 * True for roles that are not limited to intermediary-owned records. A role
 * may still have workflow filters applied by candidateVisibilityWhere.
 */
export function canAccessAllCandidates(role: Role | string): boolean {
  return crossCandidateRoles.has(role as Role);
}

/**
 * Builds a candidate where clause scoped to the organization and the role's
 * visibility policy: intermediaries see their own candidates, while Logistics
 * sees active cases only.
 */
export function candidateVisibilityWhere(
  tenant: TenantContext,
  where: Prisma.CandidateWhereInput = {}
): Prisma.CandidateWhereInput {
  const clauses: Prisma.CandidateWhereInput[] = [
    { organizationId: tenant.organizationId },
  ];

  if (!canAccessAllCandidates(tenant.role)) {
    clauses.push({ intermediaryId: tenant.userId });
  }

  if (tenant.role === Role.LOGISTICA) {
    clauses.push({ status: { notIn: [...LOGISTICS_BLOCKED_STATUSES] } });
  }

  if (Object.keys(where).length > 0) {
    clauses.push(where);
  }

  return { AND: clauses };
}

/**
 * Convenience helper for checking one candidate by id with the same visibility
 * rules used by list pages.
 */
export function candidateAccessWhere(
  tenant: TenantContext,
  candidateId: string,
  where: Prisma.CandidateWhereInput = {}
): Prisma.CandidateWhereInput {
  return candidateVisibilityWhere(tenant, { ...where, id: candidateId });
}

/**
 * Verifies that a resource belongs to the user's current organization.
 */
export function assertSameTenant(
  resourceOrganizationId: string,
  userOrganizationId: string
) {
  if (resourceOrganizationId !== userOrganizationId) {
    throw new Error("No autorizado: El recurso pertenece a otra organizacion.");
  }
}

/**
 * Checks if the user is a platform-level administrator.
 */
export interface PlatformAdminContext {
  userId: string;
  isPlatformAdmin: true;
}

/**
 * Checks platform-wide authority independently from organization membership.
 */
export async function getCurrentPlatformAdmin(): Promise<PlatformAdminContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isActive: true, isPlatformAdmin: true },
  });

  if (!account?.isActive || !account.isPlatformAdmin) return null;

  return { userId: account.id, isPlatformAdmin: true };
}

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const platformAdmin = await getCurrentPlatformAdmin();
  if (!platformAdmin) {
    throw new Error(
      "Acceso denegado: Se requiere rol de administrador de plataforma."
    );
  }

  return platformAdmin;
}
