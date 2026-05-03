import { auth } from "@/auth";
import { Role } from "@prisma/client";

/**
 * Retrieves the current user's session and organization context.
 */
export async function getCurrentTenant() {
  const session = await auth();
  if (!session?.user) return null;

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role as Role,
    isPlatformAdmin: session.user.isPlatformAdmin,
  };
}

/**
 * Ensures the user has a valid organization context.
 * Throws an error if not found.
 */
export async function requireTenant() {
  const tenant = await getCurrentTenant();
  if (!tenant || !tenant.organizationId) {
    throw new Error("No se encontró el contexto de la organización. Por favor, inicie sesión.");
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
 * Verifies that a resource belongs to the user's current organization.
 */
export function assertSameTenant(resourceOrganizationId: string, userOrganizationId: string) {
  if (resourceOrganizationId !== userOrganizationId) {
    throw new Error("No autorizado: El recurso pertenece a otra organización.");
  }
}

/**
 * Checks if the user is a platform-level administrator.
 */
export async function requirePlatformAdmin() {
  const tenant = await getCurrentTenant();
  if (!tenant?.isPlatformAdmin) {
    throw new Error("Acceso denegado: Se requiere rol de administrador de plataforma.");
  }
  return tenant;
}
