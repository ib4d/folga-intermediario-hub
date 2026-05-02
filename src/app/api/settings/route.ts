import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

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

  // Merge with existing settings
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { settings: true },
  });

  const current = (user?.settings as Record<string, unknown>) ?? {};
  const merged = { ...current, ...body };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { settings: merged },
  });

  return NextResponse.json({ success: true, settings: merged });
}
