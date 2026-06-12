import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { canUploadCandidateDocuments, canAccessCandidateByOwnership } from "@/lib/permissions";
import { requireTenant, canAccessAllCandidates } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, resolveLocalStorageAbsolutePath } from "@/lib/providers/storage";
import { writeAuditLog } from "@/lib/audit";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getContentTypeFromFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function findDocumentForTenant(documentId: string) {
  const tenant = await requireTenant();

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      organizationId: tenant.organizationId,
      ...(canAccessAllCandidates(tenant.role) ? {} : { candidate: { intermediaryId: tenant.userId } }),
    },
    include: { candidate: true },
  });

  if (!document) {
    return {
      tenant,
      document: null,
      denialResponse: NextResponse.json({ success: false, error: "Documento no encontrado" }, { status: 404 }),
    };
  }

  if (
    !canAccessAllCandidates(tenant.role) &&
    !canAccessCandidateByOwnership(tenant.role, document.candidate.intermediaryId, tenant.userId)
  ) {
    return {
      tenant,
      document: null,
      denialResponse: NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 }),
    };
  }

  return { tenant, document, denialResponse: null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { document, denialResponse } = await findDocumentForTenant(id);

    if (!document) {
      return denialResponse!;
    }

    const storage = getStorageProvider();
    const objectPath = storage.getObjectPathFromPublicUrl(document.url);

    if ((process.env.STORAGE_PROVIDER || "supabase").trim() === "local" && objectPath) {
      const { target } = resolveLocalStorageAbsolutePath(objectPath);
      const fileBuffer = await readFile(target);
      const fileName = path.basename(objectPath);
      const asAttachment = req.nextUrl.searchParams.get("download") === "1";

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": getContentTypeFromFileName(fileName),
          "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${fileName}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    return NextResponse.redirect(document.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo abrir el documento.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, document, denialResponse } = await findDocumentForTenant(id);

    if (!canUploadCandidateDocuments(tenant.role)) {
      return NextResponse.json(
        { success: false, error: "Tu rol no puede eliminar documentos de candidatos." },
        { status: 403 }
      );
    }

    if (!document) {
      return denialResponse!;
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
