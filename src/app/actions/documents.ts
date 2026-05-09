"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { analyzeDocument } from "@/lib/ocr";
import { requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";
import { DocumentType, Prisma, Role } from "@prisma/client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documentos-candidatos";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function parseDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
}

function parseDocumentType(value: string): DocumentType {
  if (Object.values(DocumentType).includes(value as DocumentType)) {
    return value as DocumentType;
  }

  return DocumentType.OTHER;
}

function canAccessCandidate(role: Role, candidateIntermediaryId: string, userId: string): boolean {
  if (([Role.ADMIN, Role.SUPERADMIN, Role.LEGAL, Role.LOGISTICA] as Role[]).includes(role)) {
    return true;
  }

  return candidateIntermediaryId === userId;
}

function isOcrSupported(type: DocumentType): boolean {
  return type === DocumentType.PASSPORT || type === DocumentType.KARTA_POBYTU;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function uploadDocument(formData: FormData) {
  const tenant = await requireTenant();

  await assertWithinPlanLimit(tenant.organizationId!, "documentsPerMonth");

  const file = formData.get("file") as File | null;
  const candidateId = formData.get("candidateId");
  const rawType = formData.get("type");
  const docNumber = formData.get("number");
  const issuerCountry = formData.get("issuerCountry");
  const expiryDate = formData.get("expiryDate");

  if (!(file instanceof File) || typeof candidateId !== "string" || typeof rawType !== "string") {
    throw new Error("Faltan campos requeridos: file, candidateId, type");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type}. Use PDF, JPG, PNG o WEBP.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo excede el límite de 10MB");
  }

  const docType = parseDocumentType(rawType);

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  if (!candidate) throw new Error("Candidato no encontrado en esta organización");

  if (!canAccessCandidate(tenant.role, candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos sobre este candidato");
  }

  const safeFileName = normalizeFileName(file.name);
  const filePath = `${candidateId}/${docType}_${Date.now()}_${safeFileName}`.replace(/\.\./g, "");

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Error de subida: ${uploadError.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  const documentNumber =
    typeof docNumber === "string" && docNumber.trim().length > 0 ? docNumber.trim() : null;

  if (documentNumber) {
    const existing = await prisma.document.findFirst({
      where: {
        candidateId,
        number: documentNumber,
        type: docType,
        organizationId: tenant.organizationId!,
      },
    });

    if (existing) {
      return {
        success: false,
        status: "DUPLICATE_DOCUMENT",
        message: "Este documento ya existe para este candidato",
        documentId: existing.id,
      };
    }
  }

  const newDoc = await prisma.document.create({
    data: {
      type: docType,
      number: documentNumber,
      url: publicUrl,
      issuerCountry:
        typeof issuerCountry === "string" && issuerCountry.trim().length > 0
          ? issuerCountry.trim()
          : null,
      expiryDate: typeof expiryDate === "string" ? parseDateSafe(expiryDate) : null,
      ocrStatus: isOcrSupported(docType) ? "PENDING" : null,
      candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  if (isOcrSupported(docType)) {
    try {
      await assertWithinPlanLimit(tenant.organizationId!, "ocrPerMonth");

      const ocrData = await analyzeDocument(fileBuffer, file.type);

      if (ocrData) {
        await prisma.document.update({
          where: { id: newDoc.id },
          data: {
            extractedData: toInputJsonValue(ocrData),
            number: ocrData.documentNumber || documentNumber,
            issuerCountry:
              ocrData.issuingCountry ||
              (typeof issuerCountry === "string" && issuerCountry.trim().length > 0
                ? issuerCountry.trim()
                : null),
            issueDate: parseDateSafe(ocrData.dateOfIssue),
            expiryDate: parseDateSafe(ocrData.dateOfExpiry),
            ocrStatus: "REVIEW_REQUIRED",
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: tenant.userId,
            organizationId: tenant.organizationId!,
            action: "OCR_EXTRACTED_PENDING_REVIEW",
            entityType: "Document",
            entityId: newDoc.id,
            details: toInputJsonValue({
              docType,
              documentNumber: ocrData.documentNumber ?? null,
              ocrSource: "AZURE",
            }),
          },
        });

        await emitEvent(
          "OCR_COMPLETED",
          tenant.organizationId!,
          {
            documentId: newDoc.id,
            candidateId,
            ocrData,
            ocrStatus: "REVIEW_REQUIRED",
          },
          tenant.userId
        );
      } else {
        await prisma.document.update({
          where: { id: newDoc.id },
          data: { ocrStatus: "FAILED" },
        });

        await prisma.auditLog.create({
          data: {
            userId: tenant.userId,
            organizationId: tenant.organizationId!,
            action: "OCR_FAILED",
            entityType: "Document",
            entityId: newDoc.id,
            details: toInputJsonValue({
              docType,
              reason: "OCR engine returned no data",
            }),
          },
        });
      }
    } catch (error) {
      console.error("[uploadDocument] OCR error:", error);

      await prisma.document.update({
        where: { id: newDoc.id },
        data: { ocrStatus: "FAILED" },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: newDoc.id,
      details: toInputJsonValue({ url: publicUrl, type: docType }),
    },
  });

  await prisma.notification.create({
    data: {
      userId: candidate.intermediaryId,
      organizationId: tenant.organizationId!,
      candidateId,
      type: "DOCUMENT_UPLOADED",
      title: "Documento Subido",
      message: `Nuevo documento subido (${docType}) para ${candidate.firstName ?? ""} ${candidate.lastName ?? ""
        }`.trim(),
    },
  });

  await emitEvent(
    "DOCUMENT_UPLOADED",
    tenant.organizationId!,
    {
      documentId: newDoc.id,
      candidateId,
      type: docType,
    },
    tenant.userId
  );

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
  revalidatePath("/documentos");

  return {
    success: true,
    documentId: newDoc.id,
    publicUrl,
    message: isOcrSupported(docType)
      ? "Documento subido y enviado a revisión OCR"
      : "Documento subido correctamente",
  };
}

export async function verifyDocument(documentId: string) {
  const tenant = await requireTenant();

  if (!([Role.LEGAL, Role.ADMIN, Role.SUPERADMIN] as Role[]).includes(tenant.role)) {
    throw new Error("Sin permisos para verificar documentos");
  }

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      organizationId: tenant.organizationId!,
    },
  });

  if (!doc) throw new Error("Documento no encontrado");

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      isVerified: true,
      verifiedById: tenant.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "DOCUMENT_VERIFIED",
      entityType: "Document",
      entityId: documentId,
      details: toInputJsonValue({ verifiedBy: tenant.userId }),
    },
  });

  revalidatePath(`/candidatos/${updated.candidateId}`);

  return { success: true };
}

export async function batchUploadDocuments(candidateId: string, formData: FormData) {
  const files = formData.getAll("files") as File[];
  const docType = (formData.get("docType") as string) || "OTHER";
  const results: Array<{ filename: string; success: boolean; message: string }> = [];

  for (const file of files) {
    const single = new FormData();
    single.append("file", file);
    single.append("candidateId", candidateId);
    single.append("type", docType);

    try {
      const result = await uploadDocument(single);

      results.push({
        filename: file.name,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      results.push({
        filename: file.name,
        success: false,
        message: error instanceof Error ? error.message : "Error interno",
      });
    }
  }

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/documentos");

  return { success: true, results };
}

export async function deleteDocument(documentId: string) {
  const tenant = await requireTenant();

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      organizationId: tenant.organizationId!,
    },
    include: { candidate: true },
  });

  if (!document) throw new Error("Documento no encontrado");

  if (!canAccessCandidate(tenant.role, document.candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos");
  }

  const urlParts = document.url.split(`${BUCKET}/`);

  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    await supabase.storage.from(BUCKET).remove([filePath]);
  }

  await prisma.document.delete({
    where: { id: documentId },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: documentId,
      details: toInputJsonValue({ url: document.url, type: document.type }),
    },
  });

  revalidatePath(`/candidatos/${document.candidateId}`);
  revalidatePath("/documentos");

  return { success: true };
}

export async function smartBatchUpload(formData: FormData) {
  const candidateId = formData.get("candidateId");
  const files = formData.getAll("files") as File[];

  if (typeof candidateId !== "string") {
    return {
      success: false,
      results: [],
      error: "smartBatchUpload requiere candidateId explícito. No se crean candidatos automáticamente desde OCR.",
    };
  }

  const results: Array<{ filename: string; success: boolean; message: string }> = [];

  for (const file of files) {
    const single = new FormData();
    single.append("file", file);
    single.append("candidateId", candidateId);
    single.append("type", "OTHER");

    try {
      const result = await uploadDocument(single);

      results.push({
        filename: file.name,
        success: result.success,
        message: "Documento subido. OCR no modifica candidatos automáticamente.",
      });
    } catch (error) {
      results.push({
        filename: file.name,
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/documentos");

  return { success: true, results };
}