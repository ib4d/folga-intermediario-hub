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

  const notification = await prisma.notification.findUnique({
    where: { 
      id: resolvedParams.id,
      organizationId: session.user.organizationId || undefined
    }
  });

  if (!notification) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  }

  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  await prisma.notification.update({
    where: { id: resolvedParams.id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
