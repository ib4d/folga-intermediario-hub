"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { analyzeDocument } from "@/lib/ocr";
import { requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documentos-candidatos";

function parseDateSafe(val: string | undefined | null): Date | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function normalizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
}

export async function uploadDocument(formData: FormData) {
  const tenant = await requireTenant();
  
  // Check monthly document limit
  await assertWithinPlanLimit(tenant.organizationId!, "documentsPerMonth");

  const file = formData.get("file") as File;
  const candidateId = formData.get("candidateId") as string;
  const docType = formData.get("type") as string;
  const docNumber = formData.get("number") as string | null;
  const issuerCountry = formData.get("issuerCountry") as string | null;
  const expiryDateStr = formData.get("expiryDate") as string | null;

  if (!file || !candidateId || !docType) {
    throw new Error("Faltan campos requeridos: file, candidateId, type");
  }

  // 1. Validate File
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type}. Use PDF, JPG, PNG o WEBP.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo excede el límite de 10MB");
  }

  // 2. Validate Candidate in this organization
  const candidate = await prisma.candidate.findFirst({ 
    where: { id: candidateId, organizationId: tenant.organizationId! } 
  });
  if (!candidate) throw new Error("Candidato no encontrado en esta organización");

  if (
    tenant.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== tenant.userId
  ) {
    throw new Error("Sin permisos sobre este candidato");
  }

  // 3. Normalize Filename and Path
  const safeFileName = normalizeFileName(file.name);
  const filePath = `${candidateId}/${docType}_${Date.now()}_${safeFileName}`.replace(/\.\./g, ""); // Prevent path injection
  
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Error de subida: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  if (docNumber) {
    const existing = await prisma.document.findFirst({
      where: { 
        candidateId, 
        number: docNumber, 
        type: docType as any,
        organizationId: tenant.organizationId!
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
      type: docType as any,
      number: docNumber || null,
      url: publicUrl,
      issuerCountry: issuerCountry || null,
      expiryDate: parseDateSafe(expiryDateStr),
      ocrStatus: "PENDING",
      candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  const ocrTargetTypes = ["PASSPORT", "KARTA_POBYTU", "PESEL", "DECYZJA_WOJEWODY"];

  if (ocrTargetTypes.includes(docType)) {
    try {
      // Check OCR limit
      await assertWithinPlanLimit(tenant.organizationId!, "ocrPerMonth");

      const ocrData = await analyzeDocument(fileBuffer, file.type);

      if (ocrData) {
        await prisma.document.update({
          where: { id: newDoc.id },
          data: {
            extractedData: ocrData as any,
            number: ocrData.documentNumber || docNumber || null,
            issuerCountry: ocrData.issuingCountry || issuerCountry || null,
            issueDate: parseDateSafe(ocrData.dateOfIssue),
            expiryDate: parseDateSafe(ocrData.dateOfExpiry),
            ocrStatus: "REVIEW_REQUIRED",
          },
        });

        // Platform Event (P7)
        await emitEvent("OCR_COMPLETED", tenant.organizationId!, {
          documentId: newDoc.id,
          candidateId,
          ocrData,
          ocrStatus: "REVIEW_REQUIRED"
        }, tenant.userId);

        await prisma.auditLog.create({
          data: {
            userId: tenant.userId,
            organizationId: tenant.organizationId!,
            action: "OCR_EXTRACTED_PENDING_REVIEW",
            entity: "Document",
            entityId: newDoc.id,
            details: { docType, documentNumber: ocrData.documentNumber, ocrSource: "AZURE" } as any,
          },
        });
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
            entity: "Document",
            entityId: newDoc.id,
            details: { docType, reason: "OCR engine returned no data" } as any,
          },
        });
      }
    } catch (ocrError) {
      console.error("[uploadDocument] OCR error:", ocrError);
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
      entity: "Document",
      entityId: newDoc.id,
      details: { url: publicUrl, type: docType } as any,
    },
  });

  // Notify INTERMEDIARIO of the upload
  if (candidate.intermediaryId) {
    await prisma.notification.create({
      data: {
        userId: candidate.intermediaryId,
        organizationId: tenant.organizationId!,
        candidateId,
        type: "DOCUMENT_UPLOADED",
        message: `Nuevo documento subido (${docType}) para ${candidate.firstName} ${candidate.lastName}`,
      }
    });
  }

  // Platform Event (P7)
  await emitEvent("DOCUMENT_UPLOADED", tenant.organizationId!, {
    documentId: newDoc.id,
    candidateId,
    type: docType
  }, tenant.userId);

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");

  return {
    success: true,
    documentId: newDoc.id,
    publicUrl,
    message: "Documento subido y enviado a revisión OCR",
  };
}

export async function verifyDocument(documentId: string) {
  const tenant = await requireTenant();
  
  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    throw new Error("Sin permisos para verificar documentos");
  }

  const doc = await prisma.document.update({
    where: { 
      id: documentId,
      organizationId: tenant.organizationId!
    },
    data: { isVerified: true, verifiedById: tenant.userId },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "DOCUMENT_VERIFIED",
      entity: "Document",
      entityId: documentId,
      details: { verifiedBy: tenant.userId } as any,
    },
  });

  revalidatePath(`/candidatos/${doc.candidateId}`);
  return { success: true };
}

export async function batchUploadDocuments(candidateId: string, formData: FormData) {
  // Logic remains similar as it calls uploadDocument which handles multi-tenancy
  const tenant = await requireTenant();

  const files = formData.getAll("files") as File[];
  const docType = (formData.get("docType") as string) || "OTHER";
  const results = [];

  for (const file of files) {
    const fileFormData = new FormData();
    fileFormData.append("file", file);
    fileFormData.append("candidateId", candidateId);
    fileFormData.append("type", docType);
    
    try {
      const res = await uploadDocument(fileFormData);
      results.push({ filename: file.name, success: res.success, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error interno";
      results.push({ filename: file.name, success: false, message: msg });
    }
  }

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath('/documentos');
  return { success: true, results };
}

export async function deleteDocument(documentId: string) {
  const tenant = await requireTenant();

  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId: tenant.organizationId! },
    include: { candidate: true }
  });

  if (!document) throw new Error("Documento no encontrado");

  if (tenant.role === "INTERMEDIARIO" && document.candidate.intermediaryId !== tenant.userId) {
    throw new Error("Sin permisos");
  }

  // extract filepath from URL
  const urlParts = document.url.split(`${BUCKET}/`);
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    await supabase.storage.from(BUCKET).remove([filePath]);
  }

  await prisma.document.delete({ 
    where: { id: documentId, organizationId: tenant.organizationId! } 
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "DOCUMENT_DELETED",
      entity: "Document",
      entityId: documentId,
      details: { url: document.url, type: document.type } as any,
    },
  });

  revalidatePath(`/candidatos/${document.candidateId}`);
  revalidatePath('/documentos');
  return { success: true };
}

export async function smartBatchUpload(formData: FormData) {
  const tenant = await requireTenant();

  const files = formData.getAll("files") as File[];
  const results = [];

  for (const file of files) {
    try {
      // 1. Check Limits (OCR and Documents)
      await assertWithinPlanLimit(tenant.organizationId!, "ocrPerMonth");
      await assertWithinPlanLimit(tenant.organizationId!, "documentsPerMonth");

      const buffer = Buffer.from(await file.arrayBuffer());
      // 2. Run OCR to identify content
      const ocrData = await analyzeDocument(buffer, file.type);
      
      if (!ocrData) {
        results.push({ filename: file.name, success: false, message: "No se pudo leer información (OCR)" });
        continue;
      }

      // 3. Identify candidate by Passport, PESEL or Name in this organization
      const candidate = await prisma.candidate.findFirst({
        where: {
          organizationId: tenant.organizationId!,
          OR: [
            { passportNumber: { equals: ocrData.documentNumber, not: null } },
            { peselNumber: { equals: ocrData.documentNumber, not: null } },
            {
              AND: [
                { firstName: { contains: ocrData.firstName || "", mode: 'insensitive' } },
                { lastName: { contains: ocrData.lastName || "", mode: 'insensitive' } }
              ]
            }
          ]
        }
      });

      // 4. Removed automatic candidate creation to ensure OCR safety (FIX P8.1)
      // Candidates must be created manually or via registration.

      if (!candidate) {
        results.push({ filename: file.name, success: false, message: "No se pudo identificar ni crear al candidato" });
        continue;
      }

      // 5. Upload to Supabase and save Document record
      const fileName = `${candidate.id}/${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, buffer, { contentType: file.type });

      if (uploadError) throw uploadError;

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${data.path}`;

      await prisma.document.create({
        data: {
          candidateId: candidate.id,
          organizationId: tenant.organizationId!,
          type: (ocrData.documentType as any) || "OTHER",
          url: publicUrl,
          ocrStatus: "REVIEW_REQUIRED",
          extractedData: ocrData as any,
          number: ocrData.documentNumber,
          issuerCountry: ocrData.issuingCountry || ocrData.nationality,
          issueDate: parseDateSafe(ocrData.dateOfIssue),
          expiryDate: parseDateSafe(ocrData.dateOfExpiry),
        }
      });

      results.push({ filename: file.name, success: true, message: `Asignado a ${candidate.firstName} ${candidate.lastName}` });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      results.push({ filename: file.name, success: false, message: msg });
    }
  }

  revalidatePath("/candidatos");
  revalidatePath("/documentos");
  return { success: true, results };
}