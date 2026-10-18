import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentTenant } from "@/lib/tenant";
import { Role } from "@prisma/client";

export type AppRole = Role;

export async function requireSession() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const session = await requireSession();
  const tenant = await getCurrentTenant();
  if (!tenant || !allowedRoles.includes(tenant.role)) {
    redirect("/sin-permisos");
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
