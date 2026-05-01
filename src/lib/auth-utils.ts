import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type AppRole = "SUPERADMIN" | "ADMIN" | "INTERMEDIARIO" | "LEGAL";

export async function requireSession() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const session = await requireSession();
  if (!allowedRoles.includes(session.user.role as AppRole)) {
    redirect("/sin-permisos");
  }
  return session;
}
