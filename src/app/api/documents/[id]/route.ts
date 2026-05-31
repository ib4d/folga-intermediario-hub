import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { canUploadCandidateDocuments, canAccessCandidateByOwnership } from "@/lib/permissions";
import { requireTenant, canAccessAllCandidates } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/providers/storage";
import { writeAuditLog } from "@/lib/audit";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    if (!canUploadCandidateDocuments(tenant.role)) {
      return NextResponse.json(
        { success: false, error: "Tu rol no puede eliminar documentos de candidatos." },
        { status: 403 }
      );
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        organizationId: tenant.organizationId,
        ...(canAccessAllCandidates(tenant.role) ? {} : { candidate: { intermediaryId: tenant.userId } }),
      },
      include: { candidate: true },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: "Documento no encontrado" }, { status: 404 });
    }

    if (
      !canAccessAllCandidates(tenant.role) &&
      !canAccessCandidateByOwnership(tenant.role, document.candidate.intermediaryId, tenant.userId)
    ) {
      return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
    }

    await prisma.document.delete({
      where: { id: document.id },
    });

    const storage = getStorageProvider();
    const filePath = storage.getObjectPathFromPublicUrl(document.url);
    if (filePath) {
      try {
        await storage.removeObjects([filePath]);
      } catch (error) {
        console.error("[deleteDocument] storage cleanup failed", error);
      }
    }

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: document.id,
      details: toInputJsonValue({ url: document.url, type: document.type }),
    });

    await syncCandidateOperationalAlerts({
      candidateId: document.candidateId,
      organizationId: tenant.organizationId,
    });

    revalidatePath(`/candidatos/${document.candidateId}`);
    revalidatePath("/documentos");
    revalidatePath("/dashboard");
    revalidatePath("/logistica");
    revalidatePath("/notificaciones");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el documento.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
