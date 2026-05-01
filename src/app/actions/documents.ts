"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadDocument(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const file = formData.get("file") as File;
  const candidateId = formData.get("candidateId") as string;
  const docType = formData.get("type") as string;
  const docNumber = formData.get("number") as string | null;
  const expiryDateStr = formData.get("expiryDate") as string | null;
  const issuerCountry = formData.get("issuerCountry") as string | null;

  if (!file || !candidateId || !docType) {
    throw new Error("Campos obligatorios faltantes");
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documentos-candidatos";
  const filePath = `${candidateId}/${docType}_${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { 
      contentType: file.type, 
      upsert: false 
    });

  if (uploadError) throw new Error(`Error de subida: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

  const newDoc = await prisma.document.create({
    data: {
      type: docType as any,
      number: docNumber || null,
      url: publicUrl,
      issuerCountry: issuerCountry || null,
      expiryDate: expiryDateStr ? new Date(expiryDateStr) : null,
      candidateId,
    },
  });

  // Integración OCR CAPA 5
  if (["PASSPORT", "KARTA_POBYTU"].includes(docType)) {
    const { analyzePassport } = await import("@/lib/ocr");
    const ocrData = await analyzePassport(publicUrl);
    
    if (ocrData) {
      // Actualizar el documento con la data cruda del OCR
      await prisma.document.update({
        where: { id: newDoc.id },
        data: { extractedData: ocrData as any },
      });

      // Auto-completar campos del candidato si están vacíos
      const data = ocrData as any;
      const birthDate = data["DateOfBirth"]?.value as Date | undefined;
      const expDate = data["DateOfExpiration"]?.value as Date | undefined;
      const docNum = data["DocumentNumber"]?.value as string | undefined;

      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          passportNumber: docNum || undefined,
          passportExpiry: expDate || undefined,
          dateOfBirth: birthDate || undefined,
        },
      });
    }
  }

  revalidatePath(`/candidatos/${candidateId}`);
  return { success: true };
}
