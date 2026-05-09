"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateApiKey(): { raw: string; hash: string } {
  const raw = `fhk_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export async function createApiKey(name: string) {
  const tenant = await requireTenant();

  if (!["ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    throw new Error("Sin permisos para crear API keys");
  }

  const { raw, hash } = generateApiKey();

  await prisma.apiKey.create({
    data: {
      organizationId: tenant.organizationId!,
      name,
      keyHash: hash,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "API_KEY_CREATED",
      entityType: "ApiKey",
      entityId: name,
      details: { name } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/ajustes");

  // Return raw key ONCE — never stored
  return { key: raw };
}

export async function revokeApiKey(keyId: string) {
  const tenant = await requireTenant();

  if (!["ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    throw new Error("Sin permisos para revocar API keys");
  }

  await prisma.apiKey.update({
    where: {
      id: keyId,
      organizationId: tenant.organizationId!,
    },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/ajustes");
  return { success: true };
}

export async function updateOrganizationBranding(data: {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}) {
  const tenant = await requireTenant();

  if (!["ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    throw new Error("Sin permisos para actualizar branding");
  }

  await prisma.organization.update({
    where: { id: tenant.organizationId! },
    data: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      logoUrl: data.logoUrl,
    },
  });

  revalidatePath("/ajustes/branding");
  return { success: true };
}
