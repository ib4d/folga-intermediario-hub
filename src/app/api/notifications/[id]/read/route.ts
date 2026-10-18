import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const tenant = await getCurrentTenant();
  if (!session?.user?.id || !tenant) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const resolvedParams = await params;

  const notification = await prisma.notification.findUnique({
    where: { 
      id: resolvedParams.id,
      organizationId: tenant.organizationId
    }
  });

  if (!notification) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const updated = await prisma.notification.updateMany({
    where: {
      id: resolvedParams.id,
      userId: session.user.id,
      organizationId: tenant.organizationId,
    },
    data: { isRead: true },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
