import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/security/requireRole";

export async function GET() {
  const { session, errorResponse } = await requireRoleApi(["ADMIN", "SUPERADMIN", "INTERMEDIARIO", "LEGAL", "LOGISTICA"]);
  if (errorResponse) return errorResponse;
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { 
      userId: session.user.id,
      organizationId: session.user.organizationId || undefined 
    },
    include: {
      candidate: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notifications);
}
