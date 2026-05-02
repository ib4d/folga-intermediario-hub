/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId") || session.user.id;

  const where: any = {};
  
  if (session.user.role === "INTERMEDIARIO") {
    where.candidate = { intermediaryId: session.user.id };
  } else if (userId && userId !== session.user.id) {
    // Si un admin pide las de un usuario específico
    where.candidate = { intermediaryId: userId };
  }

  const notifications = await prisma.notification.findMany({
    where,
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
