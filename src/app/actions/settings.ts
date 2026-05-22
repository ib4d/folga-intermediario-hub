"use server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { requireTenant } from "@/lib/tenant";
import { canAccessModule } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateApiKey(): { raw: string; hash: string } {
  const raw = `fhk_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export async function createApiKey(name: string) {
  const tenant = await requireTenant();

  if (!canAccessModule(tenant.role, "apiKeys")) {
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

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "API_KEY_CREATED",
    entityType: "ApiKey",
    entityId: name,
    details: { name } as Prisma.InputJsonValue,
  });

  revalidatePath("/ajustes");
  revalidatePath("/ajustes/api-keys");

  // Return raw key ONCE — never stored
  return { key: raw };
}

export async function createApiKeyFormAction(
  _prevState: { error: string; key: string; name: string },
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return {
      error: "Escribe un nombre descriptivo para la API key.",
      key: "",
      name: "",
    };
  }

  try {
    const result = await createApiKey(name);
    return {
      error: "",
      key: result.key,
      name,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear la API key.",
      key: "",
      name: "",
    };
  }
}

export async function revokeApiKey(keyId: string) {
  const tenant = await requireTenant();

  if (!canAccessModule(tenant.role, "apiKeys")) {
    throw new Error("Sin permisos para revocar API keys");
  }

  await prisma.apiKey.update({
    where: {
      id: keyId,
      organizationId: tenant.organizationId!,
    },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "API_KEY_REVOKED",
    entityType: "ApiKey",
    entityId: keyId,
    details: { keyId } as Prisma.InputJsonValue,
  });

  revalidatePath("/ajustes");
  revalidatePath("/ajustes/api-keys");
  return { success: true };
}

export async function updateOrganizationBranding(data: {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}) {
  const tenant = await requireTenant();

  if (!canAccessModule(tenant.role, "branding")) {
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
