import { auth } from "@/auth";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { CandidateStatus, Role } from "@prisma/client";
import { canAccessCandidateByOwnership, canRequestLegalReview } from "@/lib/permissions";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = session.user.organizationId;
    const role = session.user.role as Role;

    if (!canRequestLegalReview(role)) {
      return NextResponse.json({ error: "Tu rol no puede solicitar revision legal" }, { status: 403 });
    }

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

    if (!canAccessCandidateByOwnership(role, candidate.intermediaryId, session.user.id)) {
      return NextResponse.json({ error: "Sin permisos sobre este candidato" }, { status: 403 });
    }

    const checklist = getCandidateDocumentChecklist(candidate);
    const targetStatus = CandidateStatus.EN_REVISION_LEGAL;

    if (candidate.status !== targetStatus) {
      await prisma.$transaction(async (tx) => {
        await tx.candidate.update({
          where: { id },
          data: { status: targetStatus },
        });

        await tx.statusHistory.create({
          data: {
            candidateId: id,
            organizationId,
            fromStatus: candidate.status,
            toStatus: targetStatus,
            changedById: session.user.id,
            reason: "Revision legal solicitada por intermediario",
          },
        });
      });
    }

    try {
      const membershipsToNotify = await prisma.membership.findMany({
        where: {
          organizationId,
          role: { in: [Role.LEGAL, Role.ADMIN, Role.SUPERADMIN] },
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
    } catch (error) {
      console.error("[request-review] notification fanout failed", error);
    }

    await writeAuditLog({
      userId: session.user.id,
      organizationId,
      action: "LEGAL_REVIEW_REQUESTED",
      entityType: "Candidate",
      entityId: id,
      details: {
        requestedBy: session.user.id,
        blockersAtRequest: checklist.blockers,
        missingAtRequest: checklist.missing,
        warningsAtRequest: checklist.warnings,
      },
    });

    await syncCandidateOperationalAlerts({
      candidateId: id,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      missing: checklist.missing,
      blockers: checklist.blockers,
      warnings: checklist.warnings,
    });
  } catch (error) {
    console.error("[request-review] failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo solicitar la revision legal",
      },
      { status: 500 }
    );
  }
}
