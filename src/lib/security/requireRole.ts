import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/tenant";

/**
 * Ensures the current session has one of the required roles.
 * Throws an error if not authorized.
 */
export async function requireRole(roles: Role[]) {
  const session = await auth();

  if (!session) {
    throw new Error("No autorizado: Sesión no encontrada");
  }

  const tenant = await getCurrentTenant();
  if (!tenant || !roles.includes(tenant.role)) {
    throw new Error(`No autorizado: Se requiere rol ${roles.join(" o ")}`);
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: tenant.role,
      organizationId: tenant.organizationId,
      isPlatformAdmin: tenant.isPlatformAdmin,
    },
  };
}

/**
 * Ensures the resource belongs to the active organization and the user is an
 * ADMIN/SUPERADMIN or the owning INTERMEDIARIO. Other roles must use an
 * explicit capability check instead of gaining access through ownership.
 */
export async function requireOwnerOrAdmin(resource: {
  ownerId: string;
  organizationId: string;
}) {
  const session = await auth();

  if (!session) {
    throw new Error("No autorizado");
  }

  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error("No autorizado");
  if (resource.organizationId !== tenant.organizationId) {
    throw new Error("No autorizado: El recurso pertenece a otra organizacion.");
  }

  const isAdmin = tenant.role === Role.ADMIN || tenant.role === Role.SUPERADMIN;
  const isOwner = tenant.role === Role.INTERMEDIARIO && session.user.id === resource.ownerId;

  if (!isAdmin && !isOwner) {
    throw new Error("No autorizado: No eres el propietario ni administrador");
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: tenant.role,
      organizationId: tenant.organizationId,
      isPlatformAdmin: tenant.isPlatformAdmin,
    },
  };
}

/**
 * API version of requireRole.
 * Returns a NextResponse if unauthorized, otherwise returns the session.
 */
export async function requireRoleApi(roles: Role[]) {
  const session = await auth();

  if (!session) {
    return { session: null, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const tenant = await getCurrentTenant();
  if (!tenant) {
    return { session: null, errorResponse: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  if (!roles.includes(tenant.role)) {
    return { session: null, errorResponse: NextResponse.json({ error: "Prohibido" }, { status: 403 }) };
  }

  return {
    session: {
      ...session,
      user: {
        ...session.user,
        role: tenant.role,
        organizationId: tenant.organizationId,
        isPlatformAdmin: tenant.isPlatformAdmin,
      },
    },
    errorResponse: null,
  };
}
