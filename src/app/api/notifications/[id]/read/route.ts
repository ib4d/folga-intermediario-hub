import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const resolvedParams = await params;

  await prisma.notification.update({
    where: { id: resolvedParams.id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
