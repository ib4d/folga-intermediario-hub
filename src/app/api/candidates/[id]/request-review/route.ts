import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  const candidate = await prisma.candidate.findUnique({ 
    where: { id, organizationId: orgId } 
  });
  
  if (!candidate) {
    return NextResponse.json({ error: "Candidato no encontrado en esta organización" }, { status: 404 });
  }

  // Intermediaries can only request review for their own candidates
  if (
    session.user.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== session.user.id
  ) {
    return NextResponse.json({ error: "Sin permisos sobre este candidato" }, { status: 403 });
  }

  // Change status to EN_REVISION_LEGAL
  await prisma.candidate.update({
    where: { id },
    data: { status: "EN_REVISION_LEGAL" as never },
  });
  
  // Record status history
  await prisma.statusHistory.create({
    data: {
      candidateId: id,
      organizationId: orgId,
      fromStatus: candidate.status,
      toStatus: "EN_REVISION_LEGAL" as never,
      changedBy: session.user.id,
      reason: "Revisión legal solicitada por intermediario",
    },
  });

  // Create notifications for users with LEGAL, ADMIN or SUPERADMIN roles IN THE SAME ORGANIZATION
  const membershipsToNotify = await prisma.membership.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["LEGAL", "ADMIN", "SUPERADMIN"] },
      isActive: true
    },
    select: { userId: true }
  });

  if (membershipsToNotify.length > 0) {
    await prisma.notification.createMany({
      data: membershipsToNotify.map(m => ({
        userId: m.userId,
        organizationId: orgId,
        candidateId: id,
        type: "LEGAL_REVIEW_REQUESTED",
        message: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""} necesita revisión legal. Solicitado por ${session.user.name ?? "Intermediario"}.`,
      }))
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId: orgId,
      action: "LEGAL_REVIEW_REQUESTED",
      entity: "Candidate",
      entityId: id,
      details: { requestedBy: session.user.id } as never,
    },
  });

  return NextResponse.json({ success: true });
}
