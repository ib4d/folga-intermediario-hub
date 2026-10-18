import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST() {
  const session = await auth();
  const tenant = await getCurrentTenant();
  if (!session?.user?.id || !tenant) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      organizationId: tenant.organizationId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true, updated: result.count }, { headers: { "Cache-Control": "no-store" } });
}
