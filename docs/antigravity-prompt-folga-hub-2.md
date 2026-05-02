Estás trabajando en el repositorio https://github.com/a-bol3/folga-intermediario-hub

Es un ATS (Applicant Tracking System) para FOLGA SP. Z O.O. con OCR automático de documentos de identidad de candidatos (pasaportes, karta pobytu, PESEL, decyzja wojewody).

Aplica TODOS los cambios siguientes de forma completa. NO hagas snippets. Entrega cada archivo completo reemplazando el existente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 0 — INSTALAR DEPENDENCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ejecuta en terminal:
npm install pdfjs-dist canvas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 1 — REEMPLAZAR: next.config.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reemplaza el contenido completo de next.config.ts con:

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@azure/ai-form-recognizer",
    "canvas",
    "tesseract.js",
    "pdfjs-dist",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        canvas: "commonjs canvas",
        "pdfjs-dist/legacy/build/pdf.js":
          "commonjs pdfjs-dist/legacy/build/pdf.js",
      });
    }
    return config;
  },
};

export default nextConfig;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 2 — REEMPLAZAR: prisma/schema.prisma
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reemplaza prisma/schema.prisma con:

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPERADMIN
  ADMIN
  INTERMEDIARIO
  LEGAL
}

enum CandidateStatus {
  RECOPILANDO_DOCS
  EN_REVISION
  DOCUMENTACION_PENDIENTE
  APROBADO
  RECHAZADO
  CONTRATADO
  RETIRADO
}

enum LocationStatus {
  EN_ORIGEN
  EN_TRANSITO
  EN_POLONIA
}

enum DocumentType {
  PASSPORT
  KARTA_POBYTU
  PESEL
  DECYZJA_WOJEWODY
  CV
  OTHER
}

enum RecruitmentSource {
  WHATSAPP
  EMAIL
  REFERRAL
  GOOGLE_ADS
  WEBSITE
  OTHER
}

model User {
  id           String      @id @default(cuid())
  email        String      @unique
  name         String?
  passwordHash String?
  role         Role        @default(INTERMEDIARIO)
  isActive     Boolean     @default(true)
  candidates   Candidate[]
  auditLogs    AuditLog[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model Candidate {
  id String @id @default(cuid())

  firstName    String?
  lastName     String?
  email        String?
  phone        String?
  gender       String?
  dateOfBirth  DateTime?
  birthPlace   String?
  birthCountry String?
  citizenship  String?
  nationality  String?
  heightCm     Int?

  country        String         @default("COL")
  locationStatus LocationStatus @default(EN_ORIGEN)

  polishAddress String?
  polishCity    String?

  passportNumber    String?
  passportIssueDate DateTime?
  passportExpiry    DateTime?
  passportBiometric Boolean?

  kartaPobytuNumber    String?
  kartaPobytuIssueDate DateTime?
  kartaPobytuExpiry    DateTime?
  kartaPobytuType      String?

  peselNumber String?

  voivodatoNumber    String?
  voivodatoIssueDate DateTime?
  voivodatoExpiry    DateTime?
  voivodatoStatus    String?

  recruitmentSource  RecruitmentSource?
  recruiterId        String?
  arrivalDate        DateTime?
  accommodation      String?
  accommodationNotes String?
  arrivalNotes       String?

  status          CandidateStatus @default(RECOPILANDO_DOCS)
  rejectionReason String?
  notes           String?

  paid400pln  Boolean   @default(false)
  paymentDate DateTime?

  gdprConsent     Boolean   @default(false)
  gdprConsentDate DateTime?

  intermediaryId String
  intermediary   User             @relation(fields: [intermediaryId], references: [id])
  documents      Document[]
  logistics      LogisticsEvent[]
  notifications  Notification[]
  statusHistory  StatusHistory[]

  selfRegistered    Boolean @default(false)
  registrationToken String? @unique

  ocrProcessed Boolean @default(false)
  ocrSource    String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Document {
  id            String       @id @default(cuid())
  type          DocumentType
  number        String?
  issuerCountry String?
  issueDate     DateTime?
  expiryDate    DateTime?
  url           String
  extractedData Json?
  isVerified    Boolean      @default(false)
  verifiedById  String?
  ocrStatus     String?

  candidateId String
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model StatusHistory {
  id          String          @id @default(cuid())
  candidateId String
  fromStatus  CandidateStatus
  toStatus    CandidateStatus
  changedBy   String?
  reason      String?
  createdAt   DateTime        @default(now())
  candidate   Candidate       @relation(fields: [candidateId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  entity    String
  entityId  String
  details   Json?
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}

model LogisticsEvent {
  id          String    @id @default(cuid())
  candidateId String
  type        String
  date        DateTime?
  notes       String?
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
}

model Notification {
  id          String    @id @default(cuid())
  candidateId String
  type        String
  message     String
  isRead      Boolean   @default(false)
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 3 — REEMPLAZAR: src/lib/ocr.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reemplaza src/lib/ocr.ts con:

import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_DI_ENDPOINT;
const key = process.env.AZURE_DI_KEY;

export interface OcrExtractedData {
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
  dateOfIssue?: string;
  sex?: string;
  nationality?: string;
  issuingCountry?: string;
  placeOfBirth?: string;
  documentType?: string;
  kartaPobytuType?: string;
  voivodatoStatus?: string;
  rawFields?: Record<string, unknown>;
}

function normalizeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  try {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

function extractFieldValue(field: unknown): string | undefined {
  if (!field) return undefined;
  const f = field as Record<string, unknown>;
  if (f.value !== undefined && f.value !== null) return String(f.value);
  if (f.content) return String(f.content);
  return undefined;
}

function mapAzureIdDocumentFields(fields: Record<string, unknown>): OcrExtractedData {
  const get = (key: string) => extractFieldValue(fields[key]);
  return {
    firstName: get("FirstName"),
    lastName: get("LastName"),
    documentNumber: get("DocumentNumber"),
    dateOfBirth: normalizeDate(get("DateOfBirth")),
    dateOfExpiry: normalizeDate(get("DateOfExpiry")),
    dateOfIssue: normalizeDate(get("DateOfIssue")),
    sex: get("Sex"),
    nationality: get("Nationality"),
    issuingCountry: get("CountryRegion") ?? get("IssuingCountry"),
    placeOfBirth: get("PlaceOfBirth"),
    documentType: get("DocumentType") ?? "PASSPORT",
    rawFields: fields as Record<string, unknown>,
  };
}

async function pdfBufferToPngBuffer(pdfBuffer: Buffer): Promise<Buffer | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const scale = 2.5;
    const viewport = page.getViewport({ scale });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCanvas } = require("canvas");
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toBuffer("image/png");
  } catch (err) {
    console.error("[OCR] PDF->PNG failed:", err);
    return null;
  }
}

export async function analyzeDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OcrExtractedData | null> {
  if (!endpoint || !key) {
    console.error("[OCR] Azure DI credentials missing");
    return null;
  }

  let processBuffer = fileBuffer;
  let processMime = mimeType;

  if (mimeType === "application/pdf" || mimeType === "application/octet-stream") {
    const pngBuffer = await pdfBufferToPngBuffer(fileBuffer);
    if (pngBuffer) {
      processBuffer = pngBuffer;
      processMime = "image/png";
    }
  }

  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const uint8Data = new Uint8Array(processBuffer);
    const poller = await client.beginAnalyzeDocument(
      "prebuilt-idDocument",
      uint8Data,
      {
        contentType: processMime as
          | "image/png"
          | "image/jpeg"
          | "image/bmp"
          | "image/tiff"
          | "application/pdf",
      }
    );
    const result = await poller.pollUntilDone();
    if (!result.documents || result.documents.length === 0) return null;
    const doc = result.documents[0];
    if (!doc.fields) return null;
    return mapAzureIdDocumentFields(doc.fields as Record<string, unknown>);
  } catch (error) {
    console.error("[OCR] analyzeDocument error:", error);
    return null;
  }
}

export async function analyzePassport(imageUrl: string): Promise<OcrExtractedData | null> {
  if (!endpoint || !key) return null;
  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const poller = await client.beginAnalyzeDocumentFromUrl("prebuilt-idDocument", imageUrl);
    const result = await poller.pollUntilDone();
    if (!result.documents?.[0]?.fields) return null;
    return mapAzureIdDocumentFields(result.documents[0].fields as Record<string, unknown>);
  } catch (error) {
    console.error("[OCR] analyzePassport URL error:", error);
    return null;
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 4 — REEMPLAZAR: src/app/actions/documents.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reemplaza src/app/actions/documents.ts con:

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
    const existing = await prisma.document.findFirst({
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

  const newDoc = await prisma.document.create({
    data: {
      type: docType as never,
      number: docNumber || null,
      url: publicUrl,
      issuerCountry: issuerCountry || null,
      expiryDate: parseDateSafe(expiryDateStr),
      ocrStatus: "PENDING",
      candidateId,
    },
  });

  const ocrTargetTypes = ["PASSPORT", "KARTA_POBYTU", "PESEL", "DECYZJA_WOJEWODY"];

  if (ocrTargetTypes.includes(docType)) {
    try {
      const { analyzeDocument } = await import("@/lib/ocr");
      const ocrData = await analyzeDocument(fileBuffer, file.type);

      if (ocrData) {
        await prisma.document.update({
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

        await prisma.candidate.update({
          where: { id: candidateId },
          data: candidateUpdateData,
        });

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "OCR_PROCESSED",
            entity: "Document",
            entityId: newDoc.id,
            details: { docType, documentNumber: ocrData.documentNumber, ocrSource: "AZURE" } as never,
          },
        });
      } else {
        await prisma.document.update({
          where: { id: newDoc.id },
          data: { ocrStatus: "REVIEW_REQUIRED" },
        });
        await prisma.auditLog.create({
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
      await prisma.document.update({
        where: { id: newDoc.id },
        data: { ocrStatus: "FAILED" },
      });
    }
  }

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");

  return {
    success: true,
    documentId: newDoc.id,
    publicUrl,
    message: "Documento subido y OCR procesado correctamente",
  };
}

export async function deleteDocument(documentId: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
  if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    throw new Error("Sin permisos para eliminar documentos");
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { candidate: true },
  });
  if (!doc) throw new Error("Documento no encontrado");

  const urlPath = new URL(doc.url).pathname;
  const storagePath = urlPath.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath(`/candidatos/${doc.candidateId}`);
  return { success: true };
}

export async function verifyDocument(documentId: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    throw new Error("Sin permisos para verificar documentos");
  }

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { isVerified: true, verifiedById: session.user.id },
  });

  await prisma.auditLog.create({
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 5 — REEMPLAZAR: src/app/actions/candidates.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reemplaza src/app/actions/candidates.ts con:

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCandidate(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const raw = Object.fromEntries(formData.entries());
  const parsed = candidateSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.create({
    data: {
      ...parsed.data,
      intermediaryId: session.user.id,
      status: "RECOPILANDO_DOCS",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CANDIDATE_CREATED",
      entity: "Candidate",
      entityId: candidate.id,
      details: { firstName: candidate.firstName, lastName: candidate.lastName } as never,
    },
  });

  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function updateCandidate(candidateId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("Candidato no encontrado");

  if (
    session.user.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== session.user.id
  ) {
    throw new Error("Sin permisos sobre este candidato");
  }

  const raw = Object.fromEntries(formData.entries());
  const updateData: Record<string, unknown> = { ...raw };

  const dateFields = [
    "dateOfBirth", "passportIssueDate", "passportExpiry",
    "kartaPobytuIssueDate", "kartaPobytuExpiry",
    "voivodatoIssueDate", "voivodatoExpiry",
    "arrivalDate", "paymentDate", "gdprConsentDate",
  ];

  for (const field of dateFields) {
    if (updateData[field] && typeof updateData[field] === "string") {
      const d = new Date(updateData[field] as string);
      updateData[field] = isNaN(d.getTime()) ? null : d;
    }
  }

  if (updateData.heightCm) {
    updateData.heightCm = parseInt(updateData.heightCm as string, 10);
  }

  if (updateData.paid400pln !== undefined) {
    updateData.paid400pln = updateData.paid400pln === "true" || updateData.paid400pln === true;
  }

  if (updateData.gdprConsent !== undefined) {
    updateData.gdprConsent = updateData.gdprConsent === "true" || updateData.gdprConsent === true;
  }

  if (updateData.passportBiometric !== undefined) {
    updateData.passportBiometric = updateData.passportBiometric === "true" || updateData.passportBiometric === true;
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CANDIDATE_UPDATED",
      entity: "Candidate",
      entityId: candidateId,
      details: { fields: Object.keys(raw) } as never,
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
  return { success: true };
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string,
  rejectionReason?: string
) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    throw new Error("Sin permisos para cambiar estado");
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("Candidato no encontrado");

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: status as never,
      rejectionReason: rejectionReason ?? null,
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: candidate.status,
      toStatus: status as never,
      changedBy: session.user.id,
      reason: rejectionReason ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "STATUS_CHANGED",
      entity: "Candidate",
      entityId: candidateId,
      details: { from: candidate.status, to: status } as never,
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
}

export async function generateRegistrationLink(candidateId: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const token = crypto.randomUUID();

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { registrationToken: token },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  return { token, url: `/registro/${token}` };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 6 — REEMPLAZAR: src/app/actions/public-registration.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reemplaza src/app/actions/public-registration.ts con:

"use server";

import { prisma } from "@/lib/prisma";
import { fullRegistrationSchema } from "@/lib/validations/candidate-registration";

function parseDateSafe(val: string | undefined | null): Date | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export async function submitCandidateRegistration(token: string, data: unknown) {
  const parsed = fullRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { registrationToken: token },
  });

  if (!candidate) {
    return { error: { _global: ["Token inválido o expirado"] } };
  }

  if (candidate.selfRegistered) {
    return { error: { _global: ["Este formulario ya fue completado"] } };
  }

  const {
    firstName, lastName, email, phone, gender, dateOfBirth, birthPlace,
    citizenship, country, passportNumber, passportExpiry, peselNumber,
    recruitmentSource, accommodation, arrivalNotes,
  } = parsed.data;

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth: parseDateSafe(dateOfBirth),
      birthPlace,
      citizenship,
      country,
      passportNumber: passportNumber || candidate.passportNumber,
      passportExpiry: parseDateSafe(passportExpiry) || candidate.passportExpiry,
      peselNumber: peselNumber || candidate.peselNumber,
      recruitmentSource: recruitmentSource as never,
      accommodation,
      arrivalNotes,
      gdprConsent: true,
      gdprConsentDate: new Date(),
      selfRegistered: true,
      status: "EN_REVISION",
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId: candidate.id,
      fromStatus: candidate.status,
      toStatus: "EN_REVISION",
      changedBy: "SELF_REGISTRATION",
      reason: "Candidato completó el formulario de autoregistro",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "SELF_REGISTRATION_COMPLETED",
      entity: "Candidate",
      entityId: candidate.id,
      details: { email, firstName, lastName } as never,
    },
  });

  return { success: true };
}

export async function getCandidateByToken(token: string) {
  return prisma.candidate.findUnique({
    where: { registrationToken: token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      selfRegistered: true,
      intermediary: { select: { name: true } },
    },
  });
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 7 — CREAR: src/lib/validations/candidate-registration.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crea el archivo src/lib/validations/candidate-registration.ts con:

import { z } from "zod";

export const fullRegistrationSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(6, "Teléfono requerido"),
  gender: z.enum(["M", "F", "UNSPECIFIED"]).default("UNSPECIFIED"),
  dateOfBirth: z.string().optional(),
  birthPlace: z.string().optional(),
  citizenship: z.string().optional(),
  country: z.string().default("COL"),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  peselNumber: z.string().optional(),
  recruitmentSource: z
    .enum(["WHATSAPP", "EMAIL", "REFERRAL", "GOOGLE_ADS", "WEBSITE", "OTHER"])
    .optional(),
  accommodation: z.string().optional(),
  arrivalNotes: z.string().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el consentimiento GDPR/RODO" }),
  }),
});

export type FullRegistrationData = z.infer<typeof fullRegistrationSchema>;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 8 — REEMPLAZAR: src/app/actions/exports.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function exportCandidatesToXLSX(): Promise<{ base64: string; filename: string } | null> {
  const session = await auth();
  if (!session) return null;
  if (!["ADMIN", "SUPERADMIN", "LEGAL"].includes(session.user.role)) return null;

  const whereClause =
    session.user.role === "INTERMEDIARIO" ? { intermediaryId: session.user.id } : {};

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: { intermediary: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = candidates.map((c) => ({
    imie: c.firstName ?? "",
    nazwisko: c.lastName ?? "",
    Pe: c.gender ?? "",
    Data_urodzenia: c.dateOfBirth ? c.dateOfBirth.toISOString().split("T")[0] : "",
    Miejsce_urodzenia: c.birthPlace ?? "",
    Obywatelstwo: c.citizenship ?? "",
    Panstwo_urodzenia: c.birthCountry ?? "",
    Narodowosc: c.nationality ?? "",
    Wzrost: c.heightCm ?? "",
    Telefon: c.phone ?? "",
    Email: c.email ?? "",
    PESEL: c.peselNumber ?? "",
    Paszport_seria_numer: c.passportNumber ?? "",
    Paszport_data_wydania: c.passportIssueDate ? c.passportIssueDate.toISOString().split("T")[0] : "",
    Paszport_data_waznosci: c.passportExpiry ? c.passportExpiry.toISOString().split("T")[0] : "",
    Paszport_biometryczny: c.passportBiometric ? "Tak" : "Nie",
    Karta_pobytu_seria_numer: c.kartaPobytuNumber ?? "",
    Karta_pobytu_data_wydania: c.kartaPobytuIssueDate ? c.kartaPobytuIssueDate.toISOString().split("T")[0] : "",
    Karta_pobytu_data_waznosci: c.kartaPobytuExpiry ? c.kartaPobytuExpiry.toISOString().split("T")[0] : "",
    Karta_pobytu_typ: c.kartaPobytuType ?? "",
    Decyzja_seria_numer: c.voivodatoNumber ?? "",
    Decyzja_data_wydania: c.voivodatoIssueDate ? c.voivodatoIssueDate.toISOString().split("T")[0] : "",
    Decyzja_data_waznosci: c.voivodatoExpiry ? c.voivodatoExpiry.toISOString().split("T")[0] : "",
    Decyzja_status: c.voivodatoStatus ?? "",
    Zrodlo_rekrutacji: c.recruitmentSource ?? "",
    Opiekun_rekrutacji: c.recruiterId ?? "",
    Data_przyjazdu: c.arrivalDate ? c.arrivalDate.toISOString().split("T")[0] : "",
    Zakwaterowanie: c.accommodation ?? "",
    Szczegoly_zakwaterowania: c.accommodationNotes ?? "",
    Uwagi_do_przyjazdu: c.arrivalNotes ?? "",
    Status_kandydata: c.status ?? "",
    Powod_rezygnacji: c.rejectionReason ?? "",
    Zaplacil_400PLN: c.paid400pln ? "Tak" : "Nie",
    Data_platnosci: c.paymentDate ? c.paymentDate.toISOString().split("T")[0] : "",
    GDPR_RODO: c.gdprConsent ? "Tak" : "Nie",
    Lokalizacja: c.locationStatus ?? "",
    Adres_polska: c.polishAddress ?? "",
    Miasto_polska: c.polishCity ?? "",
    Intermediario: c.intermediary?.name ?? "",
    OCR_przetworzone: c.ocrProcessed ? "Tak" : "Nie",
    OCR_zrodlo: c.ocrSource ?? "",
    Data_utworzenia: c.createdAt.toISOString().split("T")[0],
    Uwagi: c.notes ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Kandydaci");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const base64 = Buffer.from(buffer).toString("base64");
  const filename = `folga-candidatos-${new Date().toISOString().split("T")[0]}.xlsx`;
  return { base64, filename };
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 9 — EJECUTAR EN TERMINAL (en este orden exacto)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

npm install pdfjs-dist canvas
npx prisma generate
npx prisma migrate dev --name add_hrappka_fields_statushistory_auditlog
npm run build

Si npm run build falla con errores de tipos Prisma, ejecuta npx prisma generate nuevamente y repite npm run build.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 10 — VERIFICAR .env.local
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confirma que .env.local contiene estas variables (no las modifiques):

AZURE_DI_ENDPOINT=https://folga-doc-intelligence.cognitiveservices.azure.com
AZURE_DI_KEY=REDACTED_DUE_TO_SECURITY_REASONS
SUPABASE_STORAGE_BUCKET=documentos-candidatos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 11 — NOTAS CRÍTICAS (leer antes de ejecutar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. El SDK correcto es @azure/ai-form-recognizer. NO usar @azure/ai-document-intelligence (no existe en npm y da error 404).

2. analyzeDocument() usa beginAnalyzeDocument con buffer Uint8Array directo. NUNCA usar beginAnalyzeDocumentFromUrl para archivos subidos por el usuario — falla con InvalidContentLength cuando el archivo supera ~4MB.

3. Para PDFs escaneados: pdfBufferToPngBuffer convierte la página 1 a PNG a escala 2.5x antes de enviar a Azure DI. Esto es obligatorio porque prebuilt-idDocument no procesa PDFs de imagen escaneada directamente.

4. Los campos email y phone del candidato deben ser null cuando vienen de OCR. NO generar placeholders tipo "ocr-...@folga.local" ni "DOC-XXXXX". Esos valores causaban confusión en la UI al mostrarse como datos reales.

5. La deduplicación en uploadDocument se hace por (candidateId + number + type). Si ya existe un Document con el mismo número para ese candidato, devolver { success: false, status: "DUPLICATE_DOCUMENT" } sin crear duplicado ni lanzar excepción.

6. StatusHistory y AuditLog son modelos nuevos en el schema. Si la migración falla por conflicto de tablas existentes, ejecutar:
   npx prisma migrate dev --name fix_schema --create-only
   Revisar el SQL generado en prisma/migrations/ y luego:
   npx prisma migrate deploy

7. El bucket de Supabase Storage debe llamarse exactamente "documentos-candidatos" (o el valor de SUPABASE_STORAGE_BUCKET). Verificar que existe en el panel de Supabase antes de hacer pruebas.

8. Los campos ocrProcessed (Boolean @default(false)) y ocrSource (String?) son nuevos en Candidate. La migración los añadirá con valores por defecto para registros existentes.

9. En uploadDocument, el mapeo de campos OCR al candidato es conservador: solo escribe un campo si el candidato aún no lo tiene (condición !candidate.fieldName). Nunca sobreescribe datos ya existentes.

10. La función exportCandidatesToXLSX genera columnas con nombres en polaco alineados con HRappka (imie, nazwisko, Pe, Data_urodzenia, PESEL, Paszport_*, Karta_pobytu_*, Decyzja_*, Zrodlo_rekrutacji, Opiekun_rekrutacji, etc.) para importación directa sin transformaciones manuales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST DE VALIDACIÓN FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Después de aplicar todos los cambios y levantar con npm run dev:

1. Crear un candidato desde /candidatos/nuevo con firstName y lastName básicos.
2. Desde el detalle del candidato subir un documento de tipo PASSPORT (JPG o PNG de pasaporte real).
3. Verificar que:
   - El archivo aparece en Supabase Storage bucket "documentos-candidatos"
   - El Document en Prisma tiene ocrStatus = "PROCESSED"
   - Los campos del Candidate se actualizaron: passportNumber, passportExpiry, firstName, lastName, dateOfBirth, gender, citizenship
   - En tabla AuditLog existe una entrada con action = "OCR_PROCESSED"
4. Verificar que si se sube el mismo pasaporte una segunda vez, la respuesta es:
   { success: false, status: "DUPLICATE_DOCUMENT" }
   y NO se crea un segundo registro Document.