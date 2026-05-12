import { auth } from "@/auth";
import { Prisma, Role } from "@prisma/client";

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
  if (!session?.user?.id || !session.user.organizationId) return null;

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role as Role,
    isPlatformAdmin: Boolean(session.user.isPlatformAdmin),
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
 * True for roles that can see all candidates inside their organization.
 */
export function canAccessAllCandidates(role: Role | string): boolean {
  return crossCandidateRoles.has(role as Role);
}

/**
 * Builds a candidate where clause scoped to the organization and, for
 * intermediaries, to their own candidate ownership.
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
export async function requirePlatformAdmin(): Promise<TenantContext> {
  const tenant = await getCurrentTenant();
  if (!tenant?.isPlatformAdmin) {
    throw new Error(
      "Acceso denegado: Se requiere rol de administrador de plataforma."
    );
  }
  return tenant;
}
