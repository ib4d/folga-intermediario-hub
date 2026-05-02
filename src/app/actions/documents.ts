"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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

export async function uploadDocument(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const file = formData.get("file") as File;
  const candidateId = formData.get("candidateId") as string;
  const docType = formData.get("type") as string;
  const docNumber = formData.get("number") as string | null;
  const issuerCountry = formData.get("issuerCountry") as string | null;
  const expiryDateStr = formData.get("expiryDate") as string | null;

  if (!file || !candidateId || !docType) {
    throw new Error("Faltan campos requeridos: file, candidateId, type");
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("Candidato no encontrado");

  if (
    session.user.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== session.user.id
  ) {
    throw new Error("Sin permisos sobre este candidato");
  }

  const filePath = `${candidateId}/${docType}_${Date.now()}_${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Error de subida: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  if (docNumber) {
    const existing = await (prisma as any).document.findFirst({
      where: { candidateId, number: docNumber, type: docType as never },
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

  const newDoc = await (prisma as any).document.create({
    data: {
      type: docType as never,
      number: docNumber || null,
      url: publicUrl,
      issuerCountry: issuerCountry || null,
      expiryDate: parseDateSafe(expiryDateStr),
      ocrStatus: "PENDING",
      candidateId,
    } as any,
  });

  const ocrTargetTypes = ["PASSPORT", "KARTA_POBYTU", "PESEL", "DECYZJA_WOJEWODY"];

  if (ocrTargetTypes.includes(docType)) {
    try {
      const { analyzeDocument } = await import("@/lib/ocr");
      const ocrData = await analyzeDocument(fileBuffer, file.type);

      if (ocrData) {
        await (prisma as any).document.update({
          where: { id: newDoc.id },
          data: {
            extractedData: ocrData as never,
            number: ocrData.documentNumber || docNumber || null,
            issuerCountry: ocrData.issuingCountry || issuerCountry || null,
            issueDate: parseDateSafe(ocrData.dateOfIssue),
            expiryDate: parseDateSafe(ocrData.dateOfExpiry),
            ocrStatus: "PROCESSED",
          },
        });

        const candidateUpdateData: Record<string, unknown> = {
          ocrProcessed: true,
          ocrSource: "AZURE",
        };

        if (docType === "PASSPORT") {
          if (ocrData.firstName && !candidate.firstName)
            candidateUpdateData.firstName = ocrData.firstName;
          if (ocrData.lastName && !candidate.lastName)
            candidateUpdateData.lastName = ocrData.lastName;
          if (ocrData.dateOfBirth && !candidate.dateOfBirth)
            candidateUpdateData.dateOfBirth = parseDateSafe(ocrData.dateOfBirth);
          if (ocrData.sex && !candidate.gender)
            candidateUpdateData.gender = ocrData.sex;
          if (ocrData.nationality && !candidate.nationality)
            candidateUpdateData.nationality = ocrData.nationality;
          if (ocrData.issuingCountry && !candidate.citizenship)
            candidateUpdateData.citizenship = ocrData.issuingCountry;
          if (ocrData.placeOfBirth && !candidate.birthPlace)
            candidateUpdateData.birthPlace = ocrData.placeOfBirth;
          if (ocrData.documentNumber && !candidate.passportNumber)
            candidateUpdateData.passportNumber = ocrData.documentNumber;
          if (ocrData.dateOfExpiry && !candidate.passportExpiry)
            candidateUpdateData.passportExpiry = parseDateSafe(ocrData.dateOfExpiry);
          if (ocrData.dateOfIssue && !candidate.passportIssueDate)
            candidateUpdateData.passportIssueDate = parseDateSafe(ocrData.dateOfIssue);
        }

        if (docType === "KARTA_POBYTU") {
          if (ocrData.documentNumber && !candidate.kartaPobytuNumber)
            candidateUpdateData.kartaPobytuNumber = ocrData.documentNumber;
          if (ocrData.dateOfExpiry && !candidate.kartaPobytuExpiry)
            candidateUpdateData.kartaPobytuExpiry = parseDateSafe(ocrData.dateOfExpiry);
          if (ocrData.dateOfIssue && !candidate.kartaPobytuIssueDate)
            candidateUpdateData.kartaPobytuIssueDate = parseDateSafe(ocrData.dateOfIssue);
          if (ocrData.kartaPobytuType && !candidate.kartaPobytuType)
            candidateUpdateData.kartaPobytuType = ocrData.kartaPobytuType;
          if (ocrData.firstName && !candidate.firstName)
            candidateUpdateData.firstName = ocrData.firstName;
          if (ocrData.lastName && !candidate.lastName)
            candidateUpdateData.lastName = ocrData.lastName;
          if (ocrData.dateOfBirth && !candidate.dateOfBirth)
            candidateUpdateData.dateOfBirth = parseDateSafe(ocrData.dateOfBirth);
        }

        if (docType === "PESEL") {
          if (ocrData.documentNumber && !candidate.peselNumber)
            candidateUpdateData.peselNumber = ocrData.documentNumber;
          if (ocrData.firstName && !candidate.firstName)
            candidateUpdateData.firstName = ocrData.firstName;
          if (ocrData.lastName && !candidate.lastName)
            candidateUpdateData.lastName = ocrData.lastName;
        }

        if (docType === "DECYZJA_WOJEWODY") {
          if (ocrData.documentNumber && !candidate.voivodatoNumber)
            candidateUpdateData.voivodatoNumber = ocrData.documentNumber;
          if (ocrData.dateOfExpiry && !candidate.voivodatoExpiry)
            candidateUpdateData.voivodatoExpiry = parseDateSafe(ocrData.dateOfExpiry);
          if (ocrData.dateOfIssue && !candidate.voivodatoIssueDate)
            candidateUpdateData.voivodatoIssueDate = parseDateSafe(ocrData.dateOfIssue);
          if (ocrData.voivodatoStatus && !candidate.voivodatoStatus)
            candidateUpdateData.voivodatoStatus = ocrData.voivodatoStatus;
        }

        await (prisma as any).candidate.update({
          where: { id: candidateId },
          data: candidateUpdateData as any,
        });

        await (prisma as any).auditLog.create({
          data: {
            userId: session.user.id,
            action: "OCR_PROCESSED",
            entity: "Document",
            entityId: newDoc.id,
            details: { docType, documentNumber: ocrData.documentNumber, ocrSource: "AZURE" } as never,
          },
        });
      } else {
        await (prisma as any).document.update({
          where: { id: newDoc.id },
          data: { ocrStatus: "REVIEW_REQUIRED" } as any,
        });
        await (prisma as any).auditLog.create({
          data: {
            userId: session.user.id,
            action: "OCR_FAILED",
            entity: "Document",
            entityId: newDoc.id,
            details: { docType, reason: "Azure DI returned null" } as never,
          },
        });
      }
    } catch (ocrError) {
      console.error("[uploadDocument] OCR error:", ocrError);
      await (prisma as any).document.update({
        where: { id: newDoc.id },
        data: { ocrStatus: "FAILED" } as any,
      });
    }
  }

  await (prisma as any).auditLog.create({
    data: {
      userId: session.user.id,
      action: "DOCUMENT_UPLOADED",
      entity: "Document",
      entityId: newDoc.id,
      details: { url: publicUrl, type: docType } as never,
    },
  });

  await (prisma as any).notification.create({
    data: {
      candidateId,
      type: "DOCUMENT_UPLOADED",
      message: `Nuevo documento subido (${docType})`,
    }
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");

  return {
    success: true,
    documentId: newDoc.id,
    publicUrl,
    message: "Documento subido y OCR procesado correctamente",
  };
}




export async function verifyDocument(documentId: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    throw new Error("Sin permisos para verificar documentos");
  }

  const doc = await (prisma as any).document.update({
    where: { id: documentId },
    data: { isVerified: true, verifiedById: session.user.id } as any,
  });

  await (prisma as any).auditLog.create({
    data: {
      userId: session.user.id,
      action: "DOCUMENT_VERIFIED",
      entity: "Document",
      entityId: documentId,
      details: { verifiedBy: session.user.id } as never,
    },
  });

  revalidatePath(`/candidatos/${doc.candidateId}`);
  return { success: true };
}

export async function batchUploadDocuments(candidateId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const files = formData.getAll("files") as File[];
  const docType = (formData.get("docType") as string) || "OTHER";
  const results = [];

  for (const file of files) {
    const fileFormData = new FormData();
    fileFormData.append("file", file);
    fileFormData.append("candidateId", candidateId);
    fileFormData.append("type", docType); // use the selected type, triggers OCR for passports etc.
    
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
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { candidate: true }
  });

  if (!document) throw new Error("Documento no encontrado");

  if (session.user.role === "INTERMEDIARIO" && document.candidate.intermediaryId !== session.user.id) {
    throw new Error("Sin permisos");
  }

  // extract filepath from URL
  const urlParts = document.url.split(`${BUCKET}/`);
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    await supabase.storage.from(BUCKET).remove([filePath]);
  }

  await prisma.document.delete({ where: { id: documentId } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DOCUMENT_DELETED",
      entity: "Document",
      entityId: documentId,
      details: { url: document.url, type: document.type } as never,
    },
  });

  revalidatePath(`/candidatos/${document.candidateId}`);
  revalidatePath('/documentos');
  return { success: true };
}

export async function smartBatchUpload(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const files = formData.getAll("files") as File[];
  const results = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      // 1. Run OCR to identify content
      const ocrData = await analyzeDocument(buffer, file.type);
      
      if (!ocrData) {
        results.push({ filename: file.name, success: false, message: "No se pudo leer información (OCR)" });
        continue;
      }

      // 2. Identify candidate by Passport, PESEL or Name
      let candidate = await prisma.candidate.findFirst({
        where: {
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

      // 3. Create candidate if not found (Automatic Profile Creation)
      if (!candidate && ocrData.firstName && ocrData.lastName) {
        candidate = await prisma.candidate.create({
          data: {
            firstName: ocrData.firstName,
            lastName: ocrData.lastName,
            passportNumber: ocrData.documentType === "PASSPORT" ? ocrData.documentNumber : null,
            peselNumber: ocrData.documentType === "PESEL" ? ocrData.documentNumber : null,
            intermediaryId: session.user.id,
            status: "RECOPILANDO_DOCS",
            country: ocrData.nationality || "COL",
          }
        });
      }

      if (!candidate) {
        results.push({ filename: file.name, success: false, message: "No se pudo identificar ni crear al candidato" });
        continue;
      }

      // 4. Upload to Supabase and save Document record
      const fileExt = file.name.split('.').pop();
      const fileName = `${candidate.id}/${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, buffer, { contentType: file.type });

      if (uploadError) throw uploadError;

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${data.path}`;

      await prisma.document.create({
        data: {
          candidateId: candidate.id,
          type: (ocrData.documentType as any) || "OTHER",
          url: publicUrl,
          ocrStatus: "SUCCESS",
          extractedData: ocrData as any,
          number: ocrData.documentNumber,
          issuerCountry: ocrData.issuingCountry || ocrData.nationality,
          issueDate: parseDateSafe(ocrData.dateOfIssue),
          expiryDate: parseDateSafe(ocrData.dateOfExpiry),
        }
      });

      results.push({ filename: file.name, success: true, message: `Asignado a ${candidate.firstName} ${candidate.lastName}` });

    } catch (err: any) {
      results.push({ filename: file.name, success: false, message: err.message || "Error desconocido" });
    }
  }

  revalidatePath("/candidatos");
  revalidatePath("/documentos");
  return { success: true, results };
}