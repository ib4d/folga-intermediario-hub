import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true, updated: result.count });
}
