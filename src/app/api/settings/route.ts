import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizeLanguage } from "@/lib/i18n";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { settings: true },
  });

  return NextResponse.json(user?.settings ?? {});
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const rawSettings =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const sanitized: Record<string, Prisma.InputJsonValue | null> = {};

  for (const key of [
    "notifyNewCandidates",
    "notifyLegalAlerts",
    "notifyExpiringDocs",
    "twoFactorEnabled",
  ]) {
    if (typeof rawSettings[key] === "boolean") {
      sanitized[key] = rawSettings[key];
    }
  }

  if (typeof rawSettings.avatarUrl === "string") {
    sanitized.avatarUrl = rawSettings.avatarUrl.trim();
  }

  if ("interfaceLanguage" in rawSettings) {
    sanitized.interfaceLanguage = normalizeLanguage(rawSettings.interfaceLanguage);
  }

  // Merge with existing settings
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { settings: true },
  });

  const current = (user?.settings as Prisma.JsonObject) ?? {};
  const merged = { ...current, ...sanitized } as Prisma.InputJsonObject;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { settings: merged },
  });

  return NextResponse.json({ success: true, settings: merged });
}
