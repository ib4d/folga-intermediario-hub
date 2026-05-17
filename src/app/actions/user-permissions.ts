"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { canAssignRole, canManageMemberRole } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

function parseRole(value: FormDataEntryValue | null): Role | null {
  if (typeof value !== "string") return null;
  return Object.values(Role).includes(value as Role) ? (value as Role) : null;
}

async function getManageableMembership(membershipId: string) {
  const tenant = await requireTenant();
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId: tenant.organizationId,
    },
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  });

  if (!membership) {
    throw new Error("Miembro no encontrado en esta organizacion.");
  }

  const isSelf = membership.userId === tenant.userId;
  if (!canManageMemberRole(tenant.role, membership.role, isSelf)) {
    throw new Error("No tienes permisos para modificar este usuario.");
  }

  return { tenant, membership };
}

export async function updateMemberRoleAction(formData: FormData) {
  const membershipId = formData.get("membershipId");
  const nextRole = parseRole(formData.get("role"));

  if (typeof membershipId !== "string" || !nextRole) {
    throw new Error("Solicitud invalida.");
  }

  const { tenant, membership } = await getManageableMembership(membershipId);

  if (!canAssignRole(tenant.role, nextRole)) {
    throw new Error("No puedes conceder ese rol.");
  }

  if (membership.role === Role.SUPERADMIN && nextRole !== Role.SUPERADMIN) {
    const activeSuperadminCount = await prisma.membership.count({
      where: {
        organizationId: tenant.organizationId,
        role: Role.SUPERADMIN,
        isActive: true,
        user: { isActive: true },
      },
    });

    if (activeSuperadminCount <= 1) {
      throw new Error("No puedes retirar el ultimo superadmin activo.");
    }
  }

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: membership.id },
      data: { role: nextRole },
    }),
    prisma.user.update({
      where: { id: membership.userId },
      data: {
        role: nextRole,
        organizationId: tenant.organizationId,
      },
    }),
  ]);

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "USER_ROLE_UPDATED",
    entityType: "User",
    entityId: membership.userId,
    details: {
      email: membership.user.email,
      fromRole: membership.role,
      toRole: nextRole,
    },
  });

  revalidatePath("/ajustes");
}

export async function updateMemberAccessAction(formData: FormData) {
  const membershipId = formData.get("membershipId");
  const nextActiveValue = formData.get("isActive");

  if (typeof membershipId !== "string") {
    throw new Error("Solicitud invalida.");
  }

  const isActive = nextActiveValue === "true";
  const { tenant, membership } = await getManageableMembership(membershipId);

  if (!isActive && membership.role === Role.SUPERADMIN) {
    const activeSuperadminCount = await prisma.membership.count({
      where: {
        organizationId: tenant.organizationId,
        role: Role.SUPERADMIN,
        isActive: true,
        user: { isActive: true },
      },
    });

    if (activeSuperadminCount <= 1) {
      throw new Error("No puedes desactivar el ultimo superadmin activo.");
    }
  }

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: membership.id },
      data: { isActive },
    }),
    prisma.user.update({
      where: { id: membership.userId },
      data: { isActive },
    }),
  ]);

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: isActive ? "USER_ACCESS_ENABLED" : "USER_ACCESS_DISABLED",
    entityType: "User",
    entityId: membership.userId,
    details: {
      email: membership.user.email,
      role: membership.role,
    },
  });

  revalidatePath("/ajustes");
}
