import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

type PasswordPayload = {
  currentPassword?: unknown;
  nextPassword?: unknown;
};

function isValidPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let payload: PasswordPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud invalida" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const currentPassword = typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const nextPassword = payload.nextPassword;

  if (!isValidPassword(nextPassword)) {
    return NextResponse.json(
      { error: "La nueva contrasena debe tener entre 12 y 128 caracteres." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (currentPassword === nextPassword) {
    return NextResponse.json(
      { error: "La nueva contrasena debe ser diferente a la actual." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!user?.isActive) {
    return NextResponse.json({ error: "Usuario no autorizado" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  if (user.passwordHash) {
    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      return NextResponse.json({ error: "La contrasena actual no coincide." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
  }

  const passwordHash = await bcrypt.hash(nextPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  if (session.user.organizationId) {
    await writeAuditLog({
      userId: user.id,
      organizationId: session.user.organizationId,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
      details: {
        changedAt: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
