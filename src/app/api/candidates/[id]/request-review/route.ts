import { auth } from "@/auth";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = session.user.organizationId;

  const candidate = await prisma.candidate.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      documents: true,
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Candidato no encontrado en esta organizacion" }, { status: 404 });
  }

  if (session.user.role === "INTERMEDIARIO" && candidate.intermediaryId !== session.user.id) {
    return NextResponse.json({ error: "Sin permisos sobre este candidato" }, { status: 403 });
  }

  const checklist = getCandidateDocumentChecklist(candidate);

  if (!checklist.isComplete) {
    return NextResponse.json(
      {
        error: `No se puede enviar a legal. Documentos faltantes: ${checklist.missing.join(", ")}`,
        missing: checklist.missing,
        blockers: checklist.blockers,
      },
      { status: 400 },
    );
  }

  if (!checklist.isReadyForLegal) {
    return NextResponse.json(
      {
        error: `No se puede enviar a legal. Bloqueos activos: ${checklist.blockers.join("; ")}`,
        missing: checklist.missing,
        blockers: checklist.blockers,
      },
      { status: 400 },
    );
  }

  await prisma.candidate.update({
    where: { id },
    data: { status: "EN_REVISION_LEGAL" as import("@prisma/client").CandidateStatus },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId: id,
      organizationId,
      fromStatus: candidate.status,
      toStatus: "EN_REVISION_LEGAL" as import("@prisma/client").CandidateStatus,
      changedById: session.user.id!,
      reason: "Revision legal solicitada por intermediario",
    },
  });

  const membershipsToNotify = await prisma.membership.findMany({
    where: {
      organizationId,
      role: { in: ["LEGAL", "ADMIN", "SUPERADMIN"] },
      isActive: true,
    },
    select: { userId: true },
  });

  if (membershipsToNotify.length > 0) {
    await prisma.notification.createMany({
      data: membershipsToNotify.map((membership) => ({
        userId: membership.userId,
        organizationId,
        candidateId: id,
        type: "LEGAL_REVIEW_REQUESTED",
        title: "Revision Legal Solicitada",
        message: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""} necesita revision legal. Solicitado por ${session.user.name ?? "Intermediario"}.`,
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId,
      action: "LEGAL_REVIEW_REQUESTED",
      entityType: "Candidate",
      entityId: id,
      details: {
        requestedBy: session.user.id,
        blockersAtRequest: checklist.blockers,
        warningsAtRequest: checklist.warnings,
      } as never,
    },
  });

  return NextResponse.json({ success: true });
}
