import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });

  // Intermediaries can only request review for their own candidates
  if (
    session.user.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== session.user.id
  ) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Change status to EN_REVISION
  await prisma.candidate.update({
    where: { id },
    data: { status: "EN_REVISION" as never },
  });

  // Record status history
  await prisma.statusHistory.create({
    data: {
      candidateId: id,
      fromStatus: candidate.status,
      toStatus: "EN_REVISION" as never,
      changedBy: session.user.id,
      reason: "Revisión legal solicitada por intermediario",
    },
  });

  // Create notification for legal team
  await prisma.notification.create({
    data: {
      candidateId: id,
      type: "LEGAL_REVIEW_REQUESTED",
      message: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""} necesita revisión legal. Solicitado por ${session.user.name ?? session.user.id}.`,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "LEGAL_REVIEW_REQUESTED",
      entity: "Candidate",
      entityId: id,
      details: { requestedBy: session.user.id } as never,
    },
  });

  return NextResponse.json({ success: true });
}
