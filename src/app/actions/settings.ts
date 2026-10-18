"use server";

import { prisma } from "@/lib/prisma";
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

  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
    throw new Error("El nombre de la API key debe tener entre 1 y 120 caracteres.");
  }

  const normalizedName = name.trim();

  const { raw, hash } = generateApiKey();

  await prisma.$transaction(async (tx) => {
    const apiKey = await tx.apiKey.create({
      data: {
        organizationId: tenant.organizationId!,
        name: normalizedName,
        keyHash: hash,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "API_KEY_CREATED",
        entityType: "ApiKey",
        entityId: apiKey.id,
        details: { name: normalizedName } satisfies Prisma.InputJsonValue,
      },
    });
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

  await prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      where: {
        id: keyId,
        organizationId: tenant.organizationId!,
      },
      data: { revokedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "API_KEY_REVOKED",
        entityType: "ApiKey",
        entityId: keyId,
        details: { keyId } satisfies Prisma.InputJsonValue,
      },
    });
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

  for (const color of [data.primaryColor, data.secondaryColor]) {
    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error("Color invalido");
    }
  }

  if (data.logoUrl !== undefined) {
    const logoUrl = data.logoUrl.trim();
    if (logoUrl.length > 2048) throw new Error("URL de logo demasiado larga");
    if (logoUrl) {
      try {
        const parsed = new URL(logoUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
      } catch {
        throw new Error("URL de logo invalida");
      }
    }
  }

  await prisma.organization.update({
    where: { id: tenant.organizationId! },
    data: {
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      logoUrl: data.logoUrl?.trim() || null,
    },
  });

  revalidatePath("/ajustes/branding");
  return { success: true };
}
