import { auth } from "@/auth";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CandidateStatus, Prisma, Role } from "@prisma/client";
import { canAccessCandidateByOwnership, canRequestLegalReview } from "@/lib/permissions";
import { candidateAccessWhere, getCurrentTenant } from "@/lib/tenant";
import { isLogisticsSchedulableStatus } from "@/lib/logistics-policy";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const tenant = await getCurrentTenant();
    if (!session?.user?.id || !tenant) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const { id } = await params;
    const organizationId = tenant.organizationId;
    const role = tenant.role;

    if (!canRequestLegalReview(role)) {
      return NextResponse.json({ error: "Tu rol no puede solicitar revision legal" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const candidate = await prisma.candidate.findFirst({
      where: candidateAccessWhere(tenant, id),
      include: {
        documents: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidato no encontrado en esta organizacion" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (!isLogisticsSchedulableStatus(candidate.status)) {
      return NextResponse.json({ error: "No se puede solicitar revision para un candidato rechazado o retirado." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    if (!canAccessCandidateByOwnership(role, candidate.intermediaryId, session.user.id)) {
      return NextResponse.json({ error: "Sin permisos sobre este candidato" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const checklist = getCandidateDocumentChecklist(candidate);
    const targetStatus = CandidateStatus.EN_REVISION_LEGAL;

    await prisma.$transaction(async (tx) => {
      if (candidate.status !== targetStatus) {
        const updatedCount = await tx.candidate.updateMany({
          where: {
            ...candidateAccessWhere(tenant, id, { status: candidate.status }),
          },
          data: { status: targetStatus },
        });

        if (updatedCount.count !== 1) {
          throw new Error("El estado del candidato cambió durante la solicitud. Actualiza la página y vuelve a intentarlo.");
        }

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
      }

      await tx.auditLog.create({
        data: {
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
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

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

    await syncCandidateOperationalAlerts({
      candidateId: id,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      missing: checklist.missing,
      blockers: checklist.blockers,
      warnings: checklist.warnings,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[request-review] failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo solicitar la revision legal",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
