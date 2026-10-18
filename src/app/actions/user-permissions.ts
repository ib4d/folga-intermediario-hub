"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAssignRole, canManageMemberRole } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { resolveOrganizationAccess } from "@/lib/organization-access";

async function getCurrentActorRole(
  tx: Prisma.TransactionClient,
  tenant: Awaited<ReturnType<typeof requireTenant>>
): Promise<Role | null> {
  const actor = await tx.user.findUnique({
    where: { id: tenant.userId },
    select: {
      organizationId: true,
      role: true,
      isActive: true,
      memberships: {
        select: { organizationId: true, role: true, isActive: true },
      },
    },
  });

  if (!actor?.isActive) return null;

  const access = resolveOrganizationAccess({
    organizationId: actor.organizationId,
    role: actor.role,
    memberships: actor.memberships,
  });

  return access?.organizationId === tenant.organizationId ? access.role : null;
}

function parseRole(value: FormDataEntryValue | null): Role | null {
  if (typeof value !== "string") return null;
  return Object.values(Role).includes(value as Role) ? (value as Role) : null;
}

function parseActiveValue(value: FormDataEntryValue | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
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

  await prisma.$transaction(async (tx) => {
    const actorRole = await getCurrentActorRole(tx, tenant);
    const currentMembership = await tx.membership.findFirst({
      where: { id: membership.id, organizationId: tenant.organizationId },
      select: { id: true, userId: true, role: true },
    });

    if (
      !actorRole ||
      !currentMembership ||
      !canManageMemberRole(actorRole, currentMembership.role, currentMembership.userId === tenant.userId) ||
      !canAssignRole(actorRole, nextRole)
    ) {
      throw new Error("No tienes permisos para modificar este usuario.");
    }

    if (currentMembership.role === Role.SUPERADMIN && nextRole !== Role.SUPERADMIN) {
      const activeSuperadminCount = await tx.membership.count({
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

    await tx.membership.update({
      where: { id: currentMembership.id },
      data: { role: nextRole },
    });
    await tx.user.update({
      where: { id: currentMembership.userId },
      data: {
        role: nextRole,
        organizationId: tenant.organizationId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        action: "USER_ROLE_UPDATED",
        entityType: "User",
        entityId: currentMembership.userId,
        details: { email: membership.user.email, fromRole: currentMembership.role, toRole: nextRole },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/ajustes");
}

export async function updateMemberAccessAction(formData: FormData) {
  const membershipId = formData.get("membershipId");
  const isActive = parseActiveValue(formData.get("isActive"));

  if (typeof membershipId !== "string" || isActive === null) {
    throw new Error("Solicitud invalida.");
  }

  const { tenant, membership } = await getManageableMembership(membershipId);

  await prisma.$transaction(async (tx) => {
    const actorRole = await getCurrentActorRole(tx, tenant);
    const currentMembership = await tx.membership.findFirst({
      where: { id: membership.id, organizationId: tenant.organizationId },
      select: { id: true, userId: true, role: true },
    });

    if (
      !actorRole ||
      !currentMembership ||
      !canManageMemberRole(actorRole, currentMembership.role, currentMembership.userId === tenant.userId)
    ) {
      throw new Error("No tienes permisos para modificar este usuario.");
    }

    if (!isActive && currentMembership.role === Role.SUPERADMIN) {
      const activeSuperadminCount = await tx.membership.count({
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

    await tx.membership.update({
      where: { id: currentMembership.id },
      data: { isActive },
    });
    await tx.user.update({
      where: { id: currentMembership.userId },
      data: { isActive },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        action: isActive ? "USER_ACCESS_ENABLED" : "USER_ACCESS_DISABLED",
        entityType: "User",
        entityId: currentMembership.userId,
        details: { email: membership.user.email, role: currentMembership.role },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/ajustes");
}
