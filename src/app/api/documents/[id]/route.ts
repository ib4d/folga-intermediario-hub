import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  canAccessCandidateByOwnership,
  canUploadCandidateDocuments,
  canViewCandidateDocuments,
} from "@/lib/permissions";
import { getCurrentTenant, canAccessAllCandidates } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  getStorageProvider,
  resolveLocalStorageAbsolutePath,
  StoredObjectRemovalError,
} from "@/lib/providers/storage";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";
import { enqueueStoredObjectDeletion, processStorageDeletionJob } from "@/lib/storage-deletion-queue";

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
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return {
      tenant: null,
      document: null,
      denialResponse: NextResponse.json({ success: false, error: "Autenticacion requerida" }, { status: 401, headers: { "Cache-Control": "no-store" } }),
    };
  }

  if (!canViewCandidateDocuments(tenant.role)) {
    return {
      tenant,
      document: null,
      denialResponse: NextResponse.json({ success: false, error: "Tu rol no puede consultar documentos originales." }, { status: 403, headers: { "Cache-Control": "no-store" } }),
    };
  }

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
      denialResponse: NextResponse.json({ success: false, error: "Documento no encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } }),
    };
  }

  if (
    !canAccessAllCandidates(tenant.role) &&
    !canAccessCandidateByOwnership(tenant.role, document.candidate.intermediaryId, tenant.userId)
  ) {
    return {
      tenant,
      document: null,
      denialResponse: NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403, headers: { "Cache-Control": "no-store" } }),
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
    if (!objectPath) {
      return NextResponse.json({ success: false, error: "Documento no encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const fileName = path.basename(objectPath);
    const asAttachment = req.nextUrl.searchParams.get("download") === "1";

    if (storage.name === "local") {
      const { target } = resolveLocalStorageAbsolutePath(objectPath);
      const fileBuffer = await readFile(target);
      const safeFileName = fileName.replace(/[\r\n"\\]/g, "_");

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": getContentTypeFromFileName(fileName),
          "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-origin",
        },
      });
    }

    const signedUrl = await storage.createSignedDownloadUrl(objectPath, asAttachment ? fileName : undefined);
    if (!signedUrl) {
      return NextResponse.json({ success: false, error: "Proveedor de almacenamiento no disponible" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("[GET /api/documents/:id] document access failed", error);
    return NextResponse.json({ success: false, error: "No se pudo abrir el documento." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenant, document, denialResponse } = await findDocumentForTenant(id);

    if (!tenant) {
      return denialResponse!;
    }

    if (!document) {
      return denialResponse!;
    }

    if (!canUploadCandidateDocuments(tenant.role)) {
      return NextResponse.json(
        { success: false, error: "Tu rol no puede eliminar documentos de candidatos." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const result = await tx.document.deleteMany({
        where: {
          id: document.id,
          organizationId: tenant.organizationId,
          candidateId: document.candidateId,
          url: document.url,
          ...(tenant.role === Role.INTERMEDIARIO
            ? { candidate: { intermediaryId: tenant.userId } }
            : {}),
        },
      });

      if (result.count !== 1) {
        return { deleted: result, cleanupJobId: null };
      }

      const cleanupJobId = await enqueueStoredObjectDeletion(tx, tenant.organizationId, [document.url]);
      await tx.auditLog.create({
        data: {
          userId: tenant.userId,
          organizationId: tenant.organizationId,
          action: "DOCUMENT_DELETED",
          entityType: "Document",
          entityId: document.id,
          details: toInputJsonValue({
            type: document.type,
            storageDeletionQueued: Boolean(cleanupJobId),
            storageDeletionJobId: cleanupJobId,
          }),
        },
      });

      return { deleted: result, cleanupJobId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.deleted.count !== 1) {
      return NextResponse.json(
        { success: false, error: "El documento o su propietario cambió. Actualiza y vuelve a intentarlo." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const storageCleanup = result.cleanupJobId
      ? await processStorageDeletionJob(result.cleanupJobId)
      : "complete";

    await syncCandidateOperationalAlerts({
      candidateId: document.candidateId,
      organizationId: tenant.organizationId,
    });

    revalidatePath(`/candidatos/${document.candidateId}`);
    revalidatePath("/documentos");
    revalidatePath("/dashboard");
    revalidatePath("/logistica");
    revalidatePath("/notificaciones");

    return NextResponse.json(
      { success: true, storageCleanup },
      { status: storageCleanup === "pending" ? 202 : 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[DELETE /api/documents/:id] document deletion failed", error);
    if (error instanceof StoredObjectRemovalError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ success: false, error: "No se pudo eliminar el documento." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
