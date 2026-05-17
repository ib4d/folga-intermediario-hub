"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/sender";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: FormDataEntryValue | null): Role | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();

  if (
    normalized === "INTERMEDIARIO" ||
    normalized === "LEGAL" ||
    normalized === "LOGISTICA" ||
    normalized === "ADMIN"
  ) {
    return normalized as Role;
  }

  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateTemporaryPassword(): string {
  return `OriCruit-${randomBytes(9).toString("base64url")}`;
}

export async function inviteUserAction(
  _prevState: {
    error: string;
    success: string;
    emailSent: boolean;
    tempPassword: string;
  },
  formData: FormData
) {
  const tenant = await requireTenant();

  if (!["SUPERADMIN", "ADMIN"].includes(tenant.role)) {
    return {
      error: "No tienes permisos para invitar usuarios.",
      success: "",
      emailSent: false,
      tempPassword: "",
    };
  }

  const name = normalizeName(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const role = normalizeRole(formData.get("role"));

  if (!name || !email || !role) {
    return {
      error: "Completa nombre, correo y rol para continuar.",
      success: "",
      emailSent: false,
      tempPassword: "",
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Introduce un correo electronico valido.",
      success: "",
      emailSent: false,
      tempPassword: "",
    };
  }

  if (role === "ADMIN" && tenant.role !== "SUPERADMIN") {
    return {
      error: "Solo un superadmin puede invitar a otro administrador.",
      success: "",
      emailSent: false,
      tempPassword: "",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: true,
    },
  });

  if (existingUser?.memberships.some((membership) => membership.organizationId === tenant.organizationId)) {
    return {
      error: "Ese correo ya pertenece a esta organizacion.",
      success: "",
      emailSent: false,
      tempPassword: "",
    };
  }

  if (existingUser && existingUser.organizationId && existingUser.organizationId !== tenant.organizationId) {
    return {
      error: "Ese correo ya esta vinculado a otra organizacion. La multi-organizacion de usuarios aun no esta lista.",
      success: "",
      emailSent: false,
      tempPassword: "",
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const invitedUser = await prisma.$transaction(async (tx) => {
    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
          organizationId: tenant.organizationId,
          isActive: true,
        },
      }));

    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          role,
          organizationId: existingUser.organizationId ?? tenant.organizationId,
          passwordHash: existingUser.passwordHash ?? passwordHash,
          isActive: true,
        },
      });
    }

    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: tenant.organizationId,
        role,
        isActive: true,
      },
    });

    return user;
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "USER_INVITED",
    entityType: "User",
    entityId: invitedUser.id,
    details: {
      email,
      role,
    },
  });

  const loginUrl = process.env.AUTH_URL || "http://localhost:3000";
  const emailResult = await sendEmail({
    to: email,
    subject: "Invitacion a ORI CRUIT HUB",
    body: [
      `Hola ${name},`,
      "",
      `Has sido invitado a ORI CRUIT HUB con el rol ${role}.`,
      `Accede en: ${loginUrl}/login`,
      `Correo: ${email}`,
      `Contrasena temporal: ${temporaryPassword}`,
      "",
      "Te recomendamos cambiar la contrasena despues del primer acceso.",
    ].join("\n"),
  });

  revalidatePath("/ajustes");

  if (emailResult.success) {
    return {
      error: "",
      success: `Usuario creado e invitacion enviada a ${email}.`,
      emailSent: true,
      tempPassword: "",
    };
  }

  return {
    error: "",
    success: "Usuario creado, pero el correo no pudo enviarse desde la plataforma. Comparte estas credenciales de forma manual.",
    emailSent: false,
    tempPassword: temporaryPassword,
  };
}
