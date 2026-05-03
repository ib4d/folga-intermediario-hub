import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Ensures the current session has one of the required roles.
 * Throws an error if not authorized.
 */
export async function requireRole(roles: Role[]) {
  const session = await auth();

  if (!session) {
    throw new Error("No autorizado: Sesión no encontrada");
  }

  if (!roles.includes(session.user.role as Role)) {
    throw new Error(`No autorizado: Se requiere rol ${roles.join(" o ")}`);
  }

  return session;
}

/**
 * Ensures the user is either an ADMIN/SUPERADMIN or the owner of the resource.
 */
export async function requireOwnerOrAdmin(ownerId: string) {
  const session = await auth();

  if (!session) {
    throw new Error("No autorizado");
  }

  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(session.user.role);
  const isOwner = session.user.id === ownerId;

  if (!isAdmin && !isOwner) {
    throw new Error("No autorizado: No eres el propietario ni administrador");
  }

  return session;
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

  if (!roles.includes(session.user.role as Role)) {
    return { session: null, errorResponse: NextResponse.json({ error: "Prohibido" }, { status: 403 }) };
  }

  return { session, errorResponse: null };
}
