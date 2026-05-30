"use server";

import { prisma } from "@/lib/prisma";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";
import { revalidatePath } from "next/cache";
import {
  analyzeIdentityDocument,
  getOcrProviderName,
  isManualOcrMode,
} from "@/lib/providers/ocr";
import { getStorageProvider } from "@/lib/providers/storage";
import { requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { writeAuditLog } from "@/lib/audit";
import { emitEvent, type SystemEventType } from "@/core/events";
import { CandidateStatus, DocumentType, Prisma, Role } from "@prisma/client";
import {
  canAccessCandidateByOwnership,
  canReviewCandidateDocuments,
  canUploadCandidateDocuments,
} from "@/lib/permissions";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/octet-stream",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const ACTIVE_OCR_SOURCE = getOcrProviderName().toUpperCase();

function parseDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (normalized.length === 0) return null;

  const placeholderValues = new Set([
    "ADDRESS OF REGISTRATION",
    "/ADDRESS OF REGISTRATION",
    "ADRES ZAMELDOWANIA",
    "REMARKS",
    "UWAGI",
    "NO DISPONIBLE",
    "N/A",
    "NULL",
    "UNDEFINED",
  ]);

  return placeholderValues.has(normalized.toUpperCase()) ? null : normalized;
}

function normalizeMimeType(file: File): string {
  const rawMimeType = normalizeOptionalString(file.type);
  if (rawMimeType && rawMimeType !== "application/octet-stream") {
    return rawMimeType;
  }

  const normalizedName = file.name.toLowerCase();
  const extension = Object.keys(EXTENSION_TO_MIME).find((key) => normalizedName.endsWith(key));
  return extension ? EXTENSION_TO_MIME[extension] : rawMimeType ?? "application/octet-stream";
}

function normalizePersonName(value: string | null | undefined): string | null {
  if (!value) return null;

  return value
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeNameSignature(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeName(value: string | null | undefined): string[] {
  return normalizeNameSignature(value)
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildCandidateTokenSet(firstName: string | null | undefined, lastName: string | null | undefined) {
  return new Set([...tokenizeName(firstName), ...tokenizeName(lastName)]);
}

function candidateNameSignature(firstName: string | null | undefined, lastName: string | null | undefined): string {
  return Array.from(buildCandidateTokenSet(firstName, lastName)).sort().join(" ");
}

function sharedTokenCount(
  leftFirstName: string | null | undefined,
  leftLastName: string | null | undefined,
  rightFirstName: string | null | undefined,
  rightLastName: string | null | undefined
) {
  const leftTokens = buildCandidateTokenSet(leftFirstName, leftLastName);
  const rightTokens = buildCandidateTokenSet(rightFirstName, rightLastName);

  return Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
}

function datesMatch(a: Date | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toISOString().slice(0, 10) === b;
}

function hasStrongCandidateNameMatch(
  candidate: {
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: Date | null;
  },
  ocrData: Awaited<ReturnType<typeof analyzeIdentityDocument>>
): boolean {
  const ocrSignature = candidateNameSignature(ocrData?.firstName, ocrData?.lastName);
  const candidateSignature = candidateNameSignature(candidate.firstName, candidate.lastName);

  if (!ocrSignature || !candidateSignature) return false;
  if (ocrSignature === candidateSignature) return true;

  const ocrTokens = buildCandidateTokenSet(ocrData?.firstName, ocrData?.lastName);
  const candidateTokens = buildCandidateTokenSet(candidate.firstName, candidate.lastName);
  const sharedTokens = Array.from(ocrTokens).filter((token) => candidateTokens.has(token));

  if (sharedTokens.length < 2) return false;
  if (datesMatch(candidate.dateOfBirth, ocrData?.dateOfBirth)) return true;

  return sharedTokens.length === ocrTokens.size || sharedTokens.length === candidateTokens.size;
}

function parseDocumentType(value: string): DocumentType {
  if (Object.values(DocumentType).includes(value as DocumentType)) {
    return value as DocumentType;
  }

  return DocumentType.OTHER;
}

function inferDocumentTypeFromFileName(fileName: string): DocumentType {
  const normalized = normalizeNameSignature(fileName);

  if (
    normalized.includes("PASSPORT") ||
    normalized.includes("PASZPORT") ||
    normalized.includes("PASAPORTE")
  ) {
    return DocumentType.PASSPORT;
  }

  if (normalized.includes("KARTA") && normalized.includes("POBYTU")) {
    return DocumentType.KARTA_POBYTU;
  }

  if (normalized.includes("PESEL")) {
    return DocumentType.PESEL;
  }

  if (normalized.includes("WOJEWOD")) {
    return DocumentType.DECYZJA_WOJEWODY;
  }

  if (normalized.includes("CV")) {
    return DocumentType.CV;
  }

  return DocumentType.OTHER;
}

function requiresManualDocumentReview(input: {
  docType: DocumentType;
  manualReviewMode: boolean;
  ocrOutcome: "captured" | "failed" | "not_supported" | "skipped";
}) {
  if (!isOcrSupported(input.docType)) {
    return false;
  }

  if (input.manualReviewMode) {
    return true;
  }

  return input.ocrOutcome === "captured" || input.ocrOutcome === "failed";
}

function canAccessCandidate(role: Role, candidateIntermediaryId: string, userId: string): boolean {
  return canAccessCandidateByOwnership(role, candidateIntermediaryId, userId);
}

function isOcrSupported(type: DocumentType): boolean {
  return (
    type === DocumentType.PASSPORT ||
    type === DocumentType.KARTA_POBYTU ||
    type === DocumentType.PESEL
  );
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getOperationalErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
  const structured = error as {
    code?: string;
    details?: { error?: { innererror?: { code?: string; message?: string }; message?: string } };
  };

  const innerCode = structured.details?.error?.innererror?.code;
  const innerMessage = structured.details?.error?.innererror?.message;
  const apiMessage = structured.details?.error?.message;

  if (
    innerCode === "InvalidContentLength" ||
    message.toLowerCase().includes("input image is too large") ||
    innerMessage?.toLowerCase().includes("too large")
  ) {
    return "El archivo fue guardado, pero Azure OCR no lo pudo procesar porque supera el limite del proveedor. Reduce peso/resolucion o sube una version comprimida.";
  }

  if (
    message.includes("OCR is running in manual mode") ||
    structured.code === "OCR_PROVIDER_UNAVAILABLE"
  ) {
    return "El documento fue guardado correctamente y queda en modo manual hasta conectar el nuevo proveedor.";
  }

  if (
    message.includes("DOMMatrix is not defined") ||
    message.includes("PDF->PNG failed") ||
    message.includes("@napi-rs/canvas")
  ) {
    return "El archivo fue guardado, pero el PDF no pudo convertirse para OCR en este servidor. Sube una imagen JPG/PNG del documento o revisalo manualmente.";
  }

  if (structured.code === "InvalidRequest" || message === "Invalid request." || apiMessage === "Invalid request.") {
    return "El archivo fue guardado, pero el proveedor OCR rechazo el contenido. Revisa si el archivo esta corrupto, protegido o en un formato no legible.";
  }

  if (
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("forbidden") ||
    message.toLowerCase().includes("access denied") ||
    message.toLowerCase().includes("subscription") ||
    message.toLowerCase().includes("quota")
  ) {
    return "El documento fue guardado y queda pendiente de revision manual mientras conectamos el proveedor sustituto.";
  }

  return message;
}

function getStorageErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Error desconocido");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("bucket") &&
    (normalized.includes("not found") || normalized.includes("does not exist"))
  ) {
    return "No se pudo guardar el archivo porque el bucket configurado en Supabase Storage no existe o no coincide con el entorno actual.";
  }

  if (
    normalized.includes("invalid api key") ||
    normalized.includes("jwt") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden")
  ) {
    return "No se pudo guardar el archivo porque la credencial de Supabase Storage no es valida para este servidor.";
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("dns") ||
    normalized.includes("getaddrinfo") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout")
  ) {
    return "No se pudo conectar con Supabase Storage desde el servidor. Revisa conectividad del VPS, bucket y credenciales del proveedor.";
  }

  return `No se pudo guardar el archivo en storage: ${message}`;
}

type OcrData = Awaited<ReturnType<typeof analyzeIdentityDocument>>;
type PresentOcrData = NonNullable<OcrData>;

async function safeEmitEvent<TPayload extends Record<string, unknown>>(
  type: SystemEventType,
  organizationId: string,
  payload: TPayload,
  userId?: string
) {
  try {
    await emitEvent(type, organizationId, payload, userId);
  } catch (error) {
    console.error(`[documents] event dispatch failed for ${type}`, error);
  }
}

function mergeOcrPayload(
  existing: Record<string, unknown> | null,
  incoming: Record<string, unknown>
) {
  const base = existing ? { ...existing } : {};

  for (const [key, value] of Object.entries(incoming)) {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      continue;
    }

    const current = base[key];
    if (
      current === null ||
      current === undefined ||
      current === "" ||
      (typeof current === "number" && !Number.isFinite(current))
    ) {
      base[key] = value;
    }
  }

  return base;
}

function getExtractedDataRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function markDocumentOcrFailed(
  documentId: string,
  docType: DocumentType,
  reason: string
) {
  const existingDocument = await prisma.document.findFirst({
    where: { id: documentId },
    select: { extractedData: true },
  });

  const existingExtractedData = getExtractedDataRecord(existingDocument?.extractedData);
  const failedPayload = mergeOcrPayload(existingExtractedData, {
      documentType: docType,
      ocrStatus: "FAILED",
      ocrSource: ACTIVE_OCR_SOURCE,
      ocrError: reason,
      ocrFailedAt: new Date().toISOString(),
  });

  await prisma.document.update({
    where: { id: documentId },
    data: {
      ocrStatus: "FAILED",
      extractedData: toInputJsonValue(failedPayload),
    },
  });
}

function buildReviewedOcrData(
  existing: Record<string, unknown> | null,
  updates: {
    documentType: DocumentType;
    documentDisposition: string | null;
    documentNumber: string | null;
    personalNumber: string | null;
    expiryDate: string | null;
    issueDate: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    issuingCountry: string | null;
    dateOfBirth: string | null;
    sex: string | null;
    placeOfBirth: string | null;
    issuingAuthority: string | null;
    passportBiometric: boolean | null;
    kartaPobytuType: string | null;
    remarks: string | null;
    municipalityOffice: string | null;
    addressOfRegistration: string | null;
    heightCm: number | null;
  }
) {
  const base = existing ? { ...existing } : {};

  return {
    ...base,
    documentType: updates.documentType,
    documentDisposition: updates.documentDisposition ?? undefined,
    documentNumber: updates.documentNumber ?? undefined,
    personalNumber: updates.personalNumber ?? undefined,
    dateOfExpiry: updates.expiryDate ?? undefined,
    dateOfIssue: updates.issueDate ?? undefined,
    firstName: updates.firstName ?? undefined,
    lastName: updates.lastName ?? undefined,
    nationality: updates.nationality ?? undefined,
    issuingCountry: updates.issuingCountry ?? undefined,
    dateOfBirth: updates.dateOfBirth ?? undefined,
    sex: updates.sex ?? undefined,
    placeOfBirth: updates.placeOfBirth ?? undefined,
    issuingAuthority: updates.issuingAuthority ?? undefined,
    passportBiometric: updates.passportBiometric ?? undefined,
    kartaPobytuType: updates.kartaPobytuType ?? undefined,
    remarks: updates.remarks ?? undefined,
    municipalityOffice: updates.municipalityOffice ?? undefined,
    addressOfRegistration: updates.addressOfRegistration ?? undefined,
    heightCm: updates.heightCm ?? undefined,
  };
}

async function persistExtractedData(
  documentId: string,
  docType: DocumentType,
  ocrData: PresentOcrData
) {
  const documentNumber =
    normalizeOptionalString(ocrData.documentNumber) ??
    normalizeOptionalString(ocrData.personalNumber) ??
    undefined;

  await prisma.document.update({
    where: { id: documentId },
    data: {
      extractedData: toInputJsonValue(ocrData),
      number: documentNumber,
      issuerCountry: normalizeOptionalString(ocrData.issuingCountry) ?? undefined,
      issueDate: parseDateSafe(ocrData.dateOfIssue),
      expiryDate: parseDateSafe(ocrData.dateOfExpiry),
      ocrStatus: isOcrSupported(docType) ? "REVIEW_REQUIRED" : "OCR_CAPTURED",
    },
  });
}

async function mergeOcrIntoExistingDocument(
  documentId: string,
  docType: DocumentType,
  ocrData: PresentOcrData
) {
  const existingDocument = await prisma.document.findFirst({
    where: { id: documentId },
  });

  if (!existingDocument) return;

  const existingExtractedData = getExtractedDataRecord(existingDocument.extractedData);

  const mergedOcrData = mergeOcrPayload(existingExtractedData, ocrData as Record<string, unknown>);

  await prisma.document.update({
    where: { id: documentId },
    data: {
      extractedData: toInputJsonValue(mergedOcrData),
      number:
        existingDocument.number ??
        normalizeOptionalString(ocrData.documentNumber) ??
        normalizeOptionalString(ocrData.personalNumber) ??
        undefined,
      issuerCountry:
        existingDocument.issuerCountry ?? normalizeOptionalString(ocrData.issuingCountry) ?? undefined,
      issueDate: existingDocument.issueDate ?? parseDateSafe(ocrData.dateOfIssue),
      expiryDate: existingDocument.expiryDate ?? parseDateSafe(ocrData.dateOfExpiry),
      ocrStatus: isOcrSupported(docType) ? "REVIEW_REQUIRED" : "OCR_CAPTURED",
    },
  });
}

function inferDocumentTypeFromSmartSignals(
  fileName: string,
  ocrData: Awaited<ReturnType<typeof analyzeIdentityDocument>>
): DocumentType {
  const normalizedFileName = fileName.toUpperCase();
  const normalizedType = ocrData?.documentType?.toUpperCase();
  const documentTypeCode = ocrData?.documentTypeCode?.toUpperCase();
  const rawText = normalizeOptionalString(ocrData?.rawText)?.toUpperCase() ?? "";

  if (normalizedType === "PASSPORT" || documentTypeCode === "P") {
    return DocumentType.PASSPORT;
  }

  if (
    normalizedType?.includes("KARTA") ||
    normalizedFileName.includes("KARTA") ||
    rawText.includes("KARTA POBYTU")
  ) {
    return DocumentType.KARTA_POBYTU;
  }

  if (
    normalizedType?.includes("PESEL") ||
    normalizedFileName.includes("PESEL") ||
    rawText.includes("NUMER PESEL") ||
    rawText.includes("URZAD GMINY") ||
    rawText.includes("URZĄD GMINY")
  ) {
    return DocumentType.PESEL;
  }

  if (
    normalizedType?.includes("DECYZJA") ||
    normalizedType?.includes("WOJEWODY") ||
    normalizedFileName.includes("WOJEWOD")
  ) {
    return DocumentType.DECYZJA_WOJEWODY;
  }

  if (
    normalizedType?.includes("PASSPORT") ||
    normalizedFileName.includes("PASSPORT") ||
    rawText.includes("PASSPORT") ||
    rawText.includes("PASAPORTE")
  ) {
    return DocumentType.PASSPORT;
  }

  return DocumentType.OTHER;
}

function extractNameHintsFromFileName(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const tokens = stem
    .split(/[^a-zA-Z]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const ignored = new Set([
    "passport",
    "paszport",
    "karta",
    "pobytu",
    "pesel",
    "decyzja",
    "wojewody",
    "document",
    "doc",
    "other",
  ]);

  const filtered = tokens.filter(
    (token) =>
      token.length > 2 &&
      !ignored.has(token.toLowerCase()) &&
      !/^\d+$/.test(token)
  );

  return {
    firstName: normalizePersonName(filtered[0] ?? null),
    lastName: normalizePersonName(filtered.slice(1).join(" ") || null),
  };
}

type SmartUploadPreparation = {
  file: File;
  fileBuffer: Buffer | null;
  normalizedMimeType: string;
  ocrData: OcrData;
  docType: DocumentType;
  preparationError: string | null;
  ocrError: string | null;
  score: number;
};

function scoreSmartOcrForCandidateResolution(
  fileName: string,
  docType: DocumentType,
  ocrData: OcrData
): number {
  let score = 0;

  if (normalizeOptionalString(ocrData?.documentNumber)) score += 3;
  if (normalizeOptionalString(ocrData?.personalNumber)) score += 3;
  if (normalizeOptionalString(ocrData?.firstName) && normalizeOptionalString(ocrData?.lastName)) {
    score += 5;
  }
  if (normalizeOptionalString(ocrData?.dateOfBirth)) score += 1;
  if (docType === DocumentType.PASSPORT || docType === DocumentType.KARTA_POBYTU) score += 1;

  const hints = extractNameHintsFromFileName(fileName);
  if (hints.firstName && hints.lastName) score += 1;

  return score;
}

function buildIdentityLookupKeys(input: {
  ocrData: OcrData;
  fileName?: string | null;
  candidate?: { firstName: string | null; lastName: string | null } | null;
}) {
  const keys = new Set<string>();
  const ocrSignature = candidateNameSignature(input.ocrData?.firstName, input.ocrData?.lastName);
  const fileNameHints = input.fileName ? extractNameHintsFromFileName(input.fileName) : null;
  const fileSignature = candidateNameSignature(fileNameHints?.firstName, fileNameHints?.lastName);
  const candidateSignature = input.candidate
    ? candidateNameSignature(input.candidate.firstName, input.candidate.lastName)
    : "";
  const normalizedDob = normalizeOptionalString(input.ocrData?.dateOfBirth);
  const documentNumber = normalizeOptionalString(input.ocrData?.documentNumber);
  const personalNumber = normalizeOptionalString(input.ocrData?.personalNumber);

  for (const key of [documentNumber, personalNumber, ocrSignature, fileSignature, candidateSignature]) {
    if (key) keys.add(key);
  }

  if (normalizedDob) {
    keys.add(`DOB:${normalizedDob}`);
    if (ocrSignature) keys.add(`DOBSIG:${normalizedDob}:${ocrSignature}`);
    if (fileSignature) keys.add(`DOBSIG:${normalizedDob}:${fileSignature}`);
    if (candidateSignature) keys.add(`DOBSIG:${normalizedDob}:${candidateSignature}`);
  }

  return Array.from(keys);
}

function scoreBatchCandidateHeuristicMatch(input: {
  candidate: { firstName: string | null; lastName: string | null; dateOfBirth: Date | null };
  ocrData: OcrData;
  fileNameHints: ReturnType<typeof extractNameHintsFromFileName>;
}) {
  const candidateSignature = candidateNameSignature(
    input.candidate.firstName,
    input.candidate.lastName
  );
  const ocrSignature = candidateNameSignature(
    input.ocrData?.firstName,
    input.ocrData?.lastName
  );
  const fileSignature = candidateNameSignature(
    input.fileNameHints.firstName,
    input.fileNameHints.lastName
  );

  let score = 0;

  if (ocrSignature && candidateSignature && ocrSignature === candidateSignature) {
    score += 6;
  } else if (hasStrongCandidateNameMatch(input.candidate, input.ocrData)) {
    score += 5;
  } else {
    const ocrSharedTokens = sharedTokenCount(
      input.ocrData?.firstName,
      input.ocrData?.lastName,
      input.candidate.firstName,
      input.candidate.lastName
    );

    if (ocrSharedTokens >= 2) score += 3;
    else if (ocrSharedTokens === 1) score += 1;
  }

  if (fileSignature && candidateSignature && fileSignature === candidateSignature) {
    score += 4;
  } else {
    const fileSharedTokens = sharedTokenCount(
      input.fileNameHints.firstName,
      input.fileNameHints.lastName,
      input.candidate.firstName,
      input.candidate.lastName
    );

    if (fileSharedTokens >= 2) score += 2;
    else if (fileSharedTokens === 1) score += 1;
  }

  if (datesMatch(input.candidate.dateOfBirth, input.ocrData?.dateOfBirth)) {
    score += 3;
  }

  return score;
}

async function findBestBatchCandidateHeuristicMatch(
  tenant: Awaited<ReturnType<typeof requireTenant>>,
  batchCandidates: Map<string, string>,
  ocrData: OcrData,
  fileName: string,
  batchAnchorCandidateId: string | null
) {
  const candidateIds = Array.from(
    new Set([
      ...batchCandidates.values(),
      ...(batchAnchorCandidateId ? [batchAnchorCandidateId] : []),
    ])
  );

  if (candidateIds.length === 0) return null;

  const batchCandidatePool = await prisma.candidate.findMany({
    where: {
      id: { in: candidateIds },
      organizationId: tenant.organizationId!,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      createdAt: true,
    },
  });

  if (batchCandidatePool.length === 0) return null;

  const fileNameHints = extractNameHintsFromFileName(fileName);
  const scoredCandidates = batchCandidatePool
    .map((candidate) => ({
      candidate,
      score: scoreBatchCandidateHeuristicMatch({
        candidate,
        ocrData,
        fileNameHints,
      }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.candidate.createdAt.getTime() - left.candidate.createdAt.getTime();
    });

  if (scoredCandidates.length === 0) return null;

  const [bestMatch, secondMatch] = scoredCandidates;
  const bestIsConfident = bestMatch.score >= 5;
  const clearlyBetterThanNext =
    !secondMatch || bestMatch.score - secondMatch.score >= 2;

  if (!bestIsConfident || !clearlyBetterThanNext) {
    return null;
  }

  return bestMatch.candidate;
}

async function prepareSmartUploadFile(file: File): Promise<SmartUploadPreparation> {
  const normalizedMimeType = normalizeMimeType(file);

  if (!ALLOWED_MIME_TYPES.includes(normalizedMimeType)) {
    return {
      file,
      fileBuffer: null,
      normalizedMimeType,
      ocrData: null,
      docType: DocumentType.OTHER,
      preparationError: `Tipo de archivo no permitido: ${file.type || file.name}.`,
      ocrError: null,
      score: 0,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      file,
      fileBuffer: null,
      normalizedMimeType,
      ocrData: null,
      docType: DocumentType.OTHER,
      preparationError: "El archivo excede el limite de 10MB.",
      ocrError: null,
      score: 0,
    };
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return {
      file,
      fileBuffer: null,
      normalizedMimeType,
      ocrData: null,
      docType: DocumentType.OTHER,
      preparationError: "No se pudo leer el archivo seleccionado.",
      ocrError: null,
      score: 0,
    };
  }

  try {
    const ocrData = await analyzeIdentityDocument(fileBuffer, normalizedMimeType);
    const docType = inferDocumentTypeFromSmartSignals(file.name, ocrData);

    return {
      file,
      fileBuffer,
      normalizedMimeType,
      ocrData,
      docType,
      preparationError: null,
      ocrError: null,
      score: scoreSmartOcrForCandidateResolution(file.name, docType, ocrData),
    };
  } catch (error) {
    const docType = inferDocumentTypeFromSmartSignals(file.name, null);

    return {
      file,
      fileBuffer,
      normalizedMimeType,
      ocrData: null,
      docType,
      preparationError: null,
      ocrError: getOperationalErrorMessage(error),
      score: scoreSmartOcrForCandidateResolution(file.name, docType, null),
    };
  }
}

function rememberBatchCandidate(
  batchCandidates: Map<string, string>,
  candidate: { id: string; firstName: string | null; lastName: string | null },
  ocrData: OcrData,
  fileName?: string | null
) {
  for (const key of buildIdentityLookupKeys({
    ocrData,
    fileName,
    candidate,
  })) {
    if (key) {
      batchCandidates.set(key, candidate.id);
    }
  }
}

async function findIntermediaryForCandidate(organizationId: string, fallbackUserId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId,
      role: "INTERMEDIARIO",
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });

  return membership?.userId ?? fallbackUserId;
}

async function applyCandidateFieldsFromOcr(
  tenant: Awaited<ReturnType<typeof requireTenant>>,
  candidateId: string,
  docType: DocumentType,
  ocrData: PresentOcrData
) {
  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  if (!candidate) return;

  const candidateUpdateData: Prisma.CandidateUncheckedUpdateInput = {};

  const firstName = normalizePersonName(ocrData.firstName);
  const lastName = normalizePersonName(ocrData.lastName);
  const citizenship = normalizeOptionalString(ocrData.issuingCountry);
  const nationality = normalizeOptionalString(ocrData.nationality);
  const birthPlace = normalizeOptionalString(ocrData.placeOfBirth);
  const gender = normalizeOptionalString(ocrData.sex)?.toUpperCase();
  const personalNumber = normalizeOptionalString(ocrData.personalNumber);
  const documentNumber = normalizeOptionalString(ocrData.documentNumber);
  const addressOfRegistration = normalizeOptionalString(ocrData.addressOfRegistration);

  if (firstName && !candidate.firstName) candidateUpdateData.firstName = firstName;
  if (lastName && !candidate.lastName) candidateUpdateData.lastName = lastName;
  if (citizenship && !candidate.citizenship) candidateUpdateData.citizenship = citizenship;
  if (nationality && !candidate.nationality) candidateUpdateData.nationality = nationality;
  if (birthPlace && !candidate.birthPlace) candidateUpdateData.birthPlace = birthPlace;
  if ((gender === "M" || gender === "F") && !candidate.gender) candidateUpdateData.gender = gender;
  if (ocrData.heightCm && !candidate.heightCm) candidateUpdateData.heightCm = ocrData.heightCm;
  if (addressOfRegistration && !candidate.polishAddress) {
    candidateUpdateData.polishAddress = addressOfRegistration;
  }
  if (ocrData.dateOfBirth && !candidate.dateOfBirth) {
    candidateUpdateData.dateOfBirth = parseDateSafe(ocrData.dateOfBirth);
  }

  if (docType === DocumentType.PASSPORT) {
    if (documentNumber && !candidate.passportNumber) {
      candidateUpdateData.passportNumber = documentNumber;
    }
    if (ocrData.dateOfExpiry && !candidate.passportExpiry) {
      candidateUpdateData.passportExpiry = parseDateSafe(ocrData.dateOfExpiry);
    }
    if (ocrData.dateOfIssue && !candidate.passportIssueDate) {
      candidateUpdateData.passportIssueDate = parseDateSafe(ocrData.dateOfIssue);
    }
    if (typeof ocrData.passportBiometric === "boolean" && candidate.passportBiometric === null) {
      candidateUpdateData.passportBiometric = ocrData.passportBiometric;
    }
  }

  if (docType === DocumentType.KARTA_POBYTU) {
    if (documentNumber && !candidate.kartaPobytuNumber) {
      candidateUpdateData.kartaPobytuNumber = documentNumber;
    }
    if (ocrData.dateOfExpiry && !candidate.kartaPobytuExpiry) {
      candidateUpdateData.kartaPobytuExpiry = parseDateSafe(ocrData.dateOfExpiry);
    }
    if (ocrData.dateOfIssue && !candidate.kartaPobytuIssueDate) {
      candidateUpdateData.kartaPobytuIssueDate = parseDateSafe(ocrData.dateOfIssue);
    }
    if (ocrData.kartaPobytuType && !candidate.kartaPobytuType) {
      candidateUpdateData.kartaPobytuType = ocrData.kartaPobytuType;
    }
    if (personalNumber && !candidate.peselNumber) {
      candidateUpdateData.peselNumber = personalNumber;
    }
  }

  if (docType === DocumentType.PESEL) {
    if (personalNumber && !candidate.peselNumber) {
      candidateUpdateData.peselNumber = personalNumber;
    }
  }

  if (Object.keys(candidateUpdateData).length === 0) {
    return;
  }

  candidateUpdateData.ocrProcessed = true;
  candidateUpdateData.ocrSource = ACTIVE_OCR_SOURCE;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: candidateUpdateData,
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "CANDIDATE_OCR_FIELDS_APPLIED",
    entityType: "Candidate",
    entityId: candidateId,
    details: toInputJsonValue({
      docType,
      appliedFields: Object.keys(candidateUpdateData),
    }),
  });
}

async function resolveSmartUploadCandidate(
  tenant: Awaited<ReturnType<typeof requireTenant>>,
  file: File,
  ocrData: Awaited<ReturnType<typeof analyzeIdentityDocument>>,
  explicitCandidateId: string | null,
  batchCandidates: Map<string, string>,
  batchAnchorCandidateId: string | null
) {
  if (explicitCandidateId) {
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: explicitCandidateId,
        organizationId: tenant.organizationId!,
      },
    });

    if (!candidate) {
      throw new Error("El candidato seleccionado ya no existe en esta organizacion.");
    }

    return { candidate, created: false };
  }

  const docNumber = normalizeOptionalString(ocrData?.documentNumber);
  const personalNumber = normalizeOptionalString(ocrData?.personalNumber);
  const ocrNameSignature = candidateNameSignature(ocrData?.firstName, ocrData?.lastName);
  const identityLookupKeys = buildIdentityLookupKeys({ ocrData, fileName: file.name });

  for (const key of identityLookupKeys) {
    if (!key) continue;
    const cachedCandidateId = batchCandidates.get(key);
    if (!cachedCandidateId) continue;

    const cachedCandidate = await prisma.candidate.findFirst({
      where: {
        id: cachedCandidateId,
        organizationId: tenant.organizationId!,
      },
    });

    if (cachedCandidate) {
      return { candidate: cachedCandidate, created: false };
    }
  }

  if (docNumber) {
    const byDocument = await prisma.candidate.findFirst({
      where: {
        organizationId: tenant.organizationId!,
        OR: [
          { passportNumber: docNumber },
          { kartaPobytuNumber: docNumber },
          { peselNumber: docNumber },
          { voivodatoNumber: docNumber },
        ],
      },
    });

    if (byDocument) {
      return { candidate: byDocument, created: false };
    }
  }

  if (personalNumber) {
    const byPersonalNumber = await prisma.candidate.findFirst({
      where: {
        organizationId: tenant.organizationId!,
        OR: [
          { peselNumber: personalNumber },
          { passportNumber: personalNumber },
          { kartaPobytuNumber: personalNumber },
        ],
      },
    });

    if (byPersonalNumber) {
      return { candidate: byPersonalNumber, created: false };
    }
  }

  const ocrFirstName = normalizePersonName(ocrData?.firstName);
  const ocrLastName = normalizePersonName(ocrData?.lastName);
  const fileNameHints = extractNameHintsFromFileName(file.name);
  const firstName = ocrFirstName ?? fileNameHints.firstName;
  const lastName = ocrLastName ?? fileNameHints.lastName;
  const hasStandaloneIdentity = Boolean(docNumber || personalNumber || (firstName && lastName));

  if (!hasStandaloneIdentity || !(docNumber || personalNumber)) {
    const heuristicBatchMatch = await findBestBatchCandidateHeuristicMatch(
      tenant,
      batchCandidates,
      ocrData,
      file.name,
      batchAnchorCandidateId
    );

    if (heuristicBatchMatch) {
      return { candidate: heuristicBatchMatch, created: false };
    }
  }

  if (firstName && lastName) {
    const byName = await prisma.candidate.findFirst({
      where: {
        organizationId: tenant.organizationId!,
        firstName: { equals: firstName, mode: "insensitive" },
        lastName: { equals: lastName, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (byName) {
      return { candidate: byName, created: false };
    }
  }

  if (ocrNameSignature) {
    const candidatesWithSimilarIdentity = await prisma.candidate.findMany({
      where: {
        organizationId: tenant.organizationId!,
        OR: [
          ...(ocrData?.dateOfBirth ? [{ dateOfBirth: parseDateSafe(ocrData.dateOfBirth) }] : []),
          ...(ocrFirstName ? [{ firstName: { contains: ocrFirstName.split(" ")[0], mode: Prisma.QueryMode.insensitive } }] : []),
          ...(ocrLastName ? [{ lastName: { contains: ocrLastName.split(" ")[0], mode: Prisma.QueryMode.insensitive } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const strongMatch = candidatesWithSimilarIdentity.find((candidate) =>
      hasStrongCandidateNameMatch(candidate, ocrData)
    );

    if (strongMatch) {
      return { candidate: strongMatch, created: false };
    }
  }

  if (batchAnchorCandidateId && !hasStandaloneIdentity) {
    const batchCandidate = await prisma.candidate.findFirst({
      where: {
        id: batchAnchorCandidateId,
        organizationId: tenant.organizationId!,
      },
    });

    if (batchCandidate) {
      return { candidate: batchCandidate, created: false };
    }
  }

  if (!firstName || !lastName) {
    const distinctBatchCandidateIds = Array.from(new Set(batchCandidates.values()));
    if (distinctBatchCandidateIds.length === 1) {
      const fallbackCandidate = await prisma.candidate.findFirst({
        where: {
          id: distinctBatchCandidateIds[0],
          organizationId: tenant.organizationId!,
        },
      });

      if (fallbackCandidate) {
        return { candidate: fallbackCandidate, created: false };
      }
    }
  }

  if (!firstName || !lastName) {
    throw new Error(
      "No pude identificar un candidato ni extraer un nombre suficiente para crearlo automaticamente."
    );
  }

  await assertWithinPlanLimit(tenant.organizationId!, "candidates");
  const intermediaryId = await findIntermediaryForCandidate(
    tenant.organizationId!,
    tenant.userId
  );

  const createdCandidate = await prisma.candidate.create({
    data: {
      firstName,
      lastName,
      country:
        normalizeOptionalString(ocrData?.nationality) ??
        normalizeOptionalString(ocrData?.issuingCountry) ??
        "COL",
      citizenship: normalizeOptionalString(ocrData?.issuingCountry),
      nationality: normalizeOptionalString(ocrData?.nationality),
      birthPlace: normalizeOptionalString(ocrData?.placeOfBirth),
      dateOfBirth: parseDateSafe(ocrData?.dateOfBirth),
      gender:
        normalizeOptionalString(ocrData?.sex)?.toUpperCase() === "F"
          ? "F"
          : normalizeOptionalString(ocrData?.sex)?.toUpperCase() === "M"
            ? "M"
            : null,
      intermediaryId,
      organizationId: tenant.organizationId!,
        status: CandidateStatus.RECOPILANDO_DOCS,
        ocrProcessed: true,
        ocrSource: ACTIVE_OCR_SOURCE,
      passportNumber:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.PASSPORT
          ? normalizeOptionalString(ocrData?.documentNumber)
          : null,
      passportIssueDate:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.PASSPORT
          ? parseDateSafe(ocrData?.dateOfIssue)
          : null,
      passportExpiry:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.PASSPORT
          ? parseDateSafe(ocrData?.dateOfExpiry)
          : null,
      passportBiometric:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.PASSPORT
          ? ocrData?.passportBiometric ?? null
          : null,
      kartaPobytuNumber:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.KARTA_POBYTU
          ? normalizeOptionalString(ocrData?.documentNumber)
          : null,
      kartaPobytuIssueDate:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.KARTA_POBYTU
          ? parseDateSafe(ocrData?.dateOfIssue)
          : null,
      kartaPobytuExpiry:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.KARTA_POBYTU
          ? parseDateSafe(ocrData?.dateOfExpiry)
          : null,
      kartaPobytuType:
        inferDocumentTypeFromSmartSignals(file.name, ocrData) === DocumentType.KARTA_POBYTU
          ? normalizeOptionalString(ocrData?.kartaPobytuType)
          : null,
      peselNumber: normalizeOptionalString(ocrData?.personalNumber),
      heightCm: ocrData?.heightCm ?? null,
      polishAddress: normalizeOptionalString(ocrData?.addressOfRegistration),
    },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "CANDIDATE_CREATED_FROM_SMART_UPLOAD",
    entityType: "Candidate",
    entityId: createdCandidate.id,
    details: toInputJsonValue({
      filename: file.name,
      inferredFirstName: firstName,
      inferredLastName: lastName,
    }),
  });

  await safeEmitEvent(
    "CANDIDATE_CREATED",
    tenant.organizationId!,
    {
      candidateId: createdCandidate.id,
      candidate: createdCandidate,
    },
    tenant.userId
  );

  return { candidate: createdCandidate, created: true };
}

export async function uploadDocument(formData: FormData) {
  const tenant = await requireTenant();

  if (!canUploadCandidateDocuments(tenant.role)) {
    return {
      success: false,
      message: "Tu rol no puede subir documentos de candidatos.",
    };
  }

  await assertWithinPlanLimit(tenant.organizationId!, "documentsPerMonth");

  const file = formData.get("file") as File | null;
  const candidateId = formData.get("candidateId");
  const rawType = formData.get("type");
  const docNumber = formData.get("number");
  const issuerCountry = formData.get("issuerCountry");
  const expiryDate = formData.get("expiryDate");
  const skipOcr = formData.get("skipOcr") === "true";

  if (!(file instanceof File) || typeof candidateId !== "string" || typeof rawType !== "string") {
    throw new Error("Faltan campos requeridos: file, candidateId, type");
  }

  const normalizedMimeType = normalizeMimeType(file);

  if (!ALLOWED_MIME_TYPES.includes(normalizedMimeType)) {
    throw new Error(
      `Tipo de archivo no permitido: ${file.type || file.name}. Use PDF, JPG, PNG o WEBP.`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo excede el limite de 10MB");
  }

  const docType = parseDocumentType(rawType);
  const documentNumber =
    typeof docNumber === "string" && docNumber.trim().length > 0 ? docNumber.trim() : null;

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  if (!candidate) throw new Error("Candidato no encontrado en esta organizacion");

  if (!canAccessCandidate(tenant.role, candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos sobre este candidato");
  }

  const safeFileName = normalizeFileName(file.name);
  const filePath = `${candidateId}/${docType}_${Date.now()}_${safeFileName}`.replace(/\.\./g, "");

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

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageProvider();
  let publicUrl: string;

  try {
    ({ publicUrl } = await storage.uploadObject({
      path: filePath,
      body: fileBuffer,
      contentType: normalizedMimeType,
      upsert: false,
    }));
  } catch (error) {
    console.error("[uploadDocument] storage error:", error);
    return {
      success: false,
      status: "STORAGE_ERROR",
      message: getStorageErrorMessage(error),
    };
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
      ocrStatus: isOcrSupported(docType)
        ? isManualOcrMode()
          ? "REVIEW_REQUIRED"
          : "PENDING"
        : null,
      candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  let ocrOutcome: "not_supported" | "skipped" | "captured" | "failed" =
    isOcrSupported(docType) ? "skipped" : "not_supported";

  if (isOcrSupported(docType) && !skipOcr && !isManualOcrMode()) {
    try {
      await assertWithinPlanLimit(tenant.organizationId!, "ocrPerMonth");

      const ocrData = await analyzeIdentityDocument(fileBuffer, normalizedMimeType);

      if (ocrData) {
        ocrOutcome = "captured";
        const extractedDocumentNumber =
          normalizeOptionalString(ocrData.documentNumber) ??
          normalizeOptionalString(ocrData.personalNumber) ??
          documentNumber ??
          undefined;

        await prisma.document.update({
          where: { id: newDoc.id },
          data: {
            extractedData: toInputJsonValue(ocrData),
            number: extractedDocumentNumber,
            issuerCountry:
              normalizeOptionalString(ocrData.issuingCountry) ||
              (typeof issuerCountry === "string" && issuerCountry.trim().length > 0
                ? issuerCountry.trim()
                : null),
            issueDate: parseDateSafe(ocrData.dateOfIssue),
            expiryDate: parseDateSafe(ocrData.dateOfExpiry),
            ocrStatus: "REVIEW_REQUIRED",
          },
        });

        await writeAuditLog({
          userId: tenant.userId,
          organizationId: tenant.organizationId!,
          action: "OCR_EXTRACTED_PENDING_REVIEW",
          entityType: "Document",
          entityId: newDoc.id,
          details: toInputJsonValue({
            docType,
            documentNumber: ocrData.documentNumber ?? null,
            ocrSource: ACTIVE_OCR_SOURCE,
          }),
        });

        await safeEmitEvent(
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
        ocrOutcome = "failed";
        await markDocumentOcrFailed(newDoc.id, docType, "OCR engine returned no data");

        await writeAuditLog({
          userId: tenant.userId,
          organizationId: tenant.organizationId!,
          action: "OCR_FAILED",
          entityType: "Document",
          entityId: newDoc.id,
          details: toInputJsonValue({
            docType,
            reason: "OCR engine returned no data",
          }),
        });
      }
    } catch (error) {
      console.error("[uploadDocument] OCR error:", error);
      ocrOutcome = "failed";

      await markDocumentOcrFailed(
        newDoc.id,
        docType,
        getOperationalErrorMessage(error)
      );

      await writeAuditLog({
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "OCR_FAILED",
        entityType: "Document",
        entityId: newDoc.id,
        details: toInputJsonValue({
          docType,
          reason: getOperationalErrorMessage(error),
        }),
      });
    }
  }

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "DOCUMENT_UPLOADED",
    entityType: "Document",
    entityId: newDoc.id,
    details: toInputJsonValue({ url: publicUrl, type: docType }),
  });

  try {
    await prisma.notification.create({
      data: {
        userId: candidate.intermediaryId,
        organizationId: tenant.organizationId!,
        candidateId,
        type: "DOCUMENT_UPLOADED",
        title: "Documento Subido",
        message: `Nuevo documento subido (${docType}) para ${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim(),
      },
    });
  } catch (error) {
    console.error("[uploadDocument] notification failed", error);
  }

  try {
    await safeEmitEvent(
      "DOCUMENT_UPLOADED",
      tenant.organizationId!,
      {
        documentId: newDoc.id,
        candidateId,
        type: docType,
      },
      tenant.userId
    );
  } catch (error) {
    console.error("[uploadDocument] event dispatch failed", error);
  }

  await syncCandidateOperationalAlerts({
    candidateId,
    organizationId: tenant.organizationId!,
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
  revalidatePath("/documentos");
  revalidatePath("/dashboard");
  revalidatePath("/logistica");
  revalidatePath("/notificaciones");

  const manualReviewMode = isOcrSupported(docType) && isManualOcrMode();
  const reviewRequired = requiresManualDocumentReview({
    docType,
    manualReviewMode,
    ocrOutcome,
  });

  return {
    success: true,
    documentId: newDoc.id,
    publicUrl,
    ocrStatus: manualReviewMode ? "manual_review" : ocrOutcome,
    reviewRequired,
    message:
        manualReviewMode
        ? "Documento guardado. Queda pendiente de revision manual."
        : ocrOutcome === "captured"
        ? "Documento subido y enviado a revision OCR"
        : ocrOutcome === "failed"
          ? "Documento guardado. OCR no pudo extraer datos y queda para correccion manual."
          : "Documento subido correctamente",
  };
}

export async function verifyDocument(documentId: string) {
  const tenant = await requireTenant();

  if (!canReviewCandidateDocuments(tenant.role)) {
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

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "DOCUMENT_VERIFIED",
    entityType: "Document",
    entityId: documentId,
    details: toInputJsonValue({ verifiedBy: tenant.userId }),
  });

  await syncCandidateOperationalAlerts({
    candidateId: updated.candidateId,
    organizationId: tenant.organizationId!,
  });

  revalidatePath(`/candidatos/${updated.candidateId}`);
  revalidatePath("/documentos");
  revalidatePath("/dashboard");
  revalidatePath("/logistica");
  revalidatePath("/notificaciones");

  return { success: true };
}

export async function reviewDocumentOcr(input: {
  documentId: string;
  type: DocumentType;
  documentDisposition?: string;
  documentNumber?: string;
  personalNumber?: string;
  expiryDate?: string;
  issueDate?: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  issuingCountry?: string;
  dateOfBirth?: string;
  sex?: string;
  placeOfBirth?: string;
  issuingAuthority?: string;
  passportBiometric?: boolean;
  kartaPobytuType?: string;
  remarks?: string;
  municipalityOffice?: string;
  addressOfRegistration?: string;
  heightCm?: number;
  markVerified?: boolean;
}) {
  const tenant = await requireTenant();

  if (!canReviewCandidateDocuments(tenant.role)) {
    throw new Error("Tu rol no puede revisar OCR de documentos.");
  }

  const document = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      organizationId: tenant.organizationId!,
    },
    include: {
      candidate: true,
    },
  });

  if (!document) {
    throw new Error("Documento no encontrado");
  }

  if (!canAccessCandidate(tenant.role, document.candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos para revisar este documento");
  }

  const normalizedType = parseDocumentType(input.type);
  const normalizedDocumentNumber = normalizeOptionalString(input.documentNumber);
  const normalizedDisposition = normalizeOptionalString(input.documentDisposition)?.toUpperCase() ?? null;
  const normalizedPersonalNumber = normalizeOptionalString(input.personalNumber);
  const normalizedExpiry = normalizeOptionalString(input.expiryDate);
  const normalizedIssue = normalizeOptionalString(input.issueDate);
  const normalizedFirstName = normalizePersonName(input.firstName);
  const normalizedLastName = normalizePersonName(input.lastName);
  const normalizedNationality = normalizeOptionalString(input.nationality);
  const normalizedIssuingCountry = normalizeOptionalString(input.issuingCountry);
  const normalizedDob = normalizeOptionalString(input.dateOfBirth);
  const normalizedSex = normalizeOptionalString(input.sex)?.toUpperCase() ?? null;
  const normalizedBirthPlace = normalizeOptionalString(input.placeOfBirth);
  const normalizedAuthority = normalizeOptionalString(input.issuingAuthority);
  const normalizedKartaType = normalizeOptionalString(input.kartaPobytuType);
  const normalizedRemarks = normalizeOptionalString(input.remarks);
  const normalizedMunicipality = normalizeOptionalString(input.municipalityOffice);
  const normalizedAddress = normalizeOptionalString(input.addressOfRegistration);
  const normalizedHeight =
    typeof input.heightCm === "number" && Number.isFinite(input.heightCm) ? input.heightCm : null;

  const updatedExtractedData = buildReviewedOcrData(
    document.extractedData && typeof document.extractedData === "object" && !Array.isArray(document.extractedData)
      ? (document.extractedData as Record<string, unknown>)
      : null,
    {
      documentType: normalizedType,
      documentDisposition: normalizedDisposition,
      documentNumber: normalizedDocumentNumber,
      personalNumber: normalizedPersonalNumber,
      expiryDate: normalizedExpiry,
      issueDate: normalizedIssue,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      nationality: normalizedNationality,
      issuingCountry: normalizedIssuingCountry,
      dateOfBirth: normalizedDob,
      sex: normalizedSex,
      placeOfBirth: normalizedBirthPlace,
      issuingAuthority: normalizedAuthority,
      passportBiometric:
        typeof input.passportBiometric === "boolean" ? input.passportBiometric : null,
      kartaPobytuType: normalizedKartaType,
      remarks: normalizedRemarks,
      municipalityOffice: normalizedMunicipality,
      addressOfRegistration: normalizedAddress,
      heightCm: normalizedHeight,
    }
  );

  await prisma.document.update({
    where: { id: document.id },
    data: {
      type: normalizedType,
      number:
        normalizedType === DocumentType.PESEL
          ? normalizedPersonalNumber ?? normalizedDocumentNumber
          : normalizedDocumentNumber,
      expiryDate: parseDateSafe(normalizedExpiry),
      issueDate: parseDateSafe(normalizedIssue),
      issuerCountry: normalizedIssuingCountry,
      extractedData: toInputJsonValue(updatedExtractedData),
      ocrStatus: input.markVerified ? "SUCCESS" : "REVIEW_REQUIRED",
      isVerified: Boolean(input.markVerified),
      verifiedById: input.markVerified ? tenant.userId : null,
    },
  });

  const candidateUpdateData: Prisma.CandidateUncheckedUpdateInput = {
    firstName: normalizedFirstName ?? document.candidate.firstName,
    lastName: normalizedLastName ?? document.candidate.lastName,
    nationality: normalizedNationality ?? document.candidate.nationality,
    citizenship: normalizedIssuingCountry ?? document.candidate.citizenship,
    dateOfBirth: parseDateSafe(normalizedDob) ?? document.candidate.dateOfBirth,
    birthPlace: normalizedBirthPlace ?? document.candidate.birthPlace,
    gender:
      normalizedSex === "M" || normalizedSex === "F"
        ? normalizedSex
        : document.candidate.gender,
    heightCm: normalizedHeight ?? document.candidate.heightCm,
      polishAddress: normalizedAddress ?? document.candidate.polishAddress,
      ocrProcessed: true,
      ocrSource: `${ACTIVE_OCR_SOURCE}_REVIEWED`,
    };

  if (normalizedType === DocumentType.PASSPORT) {
    candidateUpdateData.passportNumber = normalizedDocumentNumber;
    candidateUpdateData.passportIssueDate = parseDateSafe(normalizedIssue);
    candidateUpdateData.passportExpiry = parseDateSafe(normalizedExpiry);
    if (typeof input.passportBiometric === "boolean") {
      candidateUpdateData.passportBiometric = input.passportBiometric;
    }
  }

  if (normalizedType === DocumentType.KARTA_POBYTU) {
    candidateUpdateData.kartaPobytuNumber = normalizedDocumentNumber;
    candidateUpdateData.kartaPobytuIssueDate = parseDateSafe(normalizedIssue);
    candidateUpdateData.kartaPobytuExpiry = parseDateSafe(normalizedExpiry);
    candidateUpdateData.kartaPobytuType = normalizedKartaType;
    if (normalizedPersonalNumber) {
      candidateUpdateData.peselNumber = normalizedPersonalNumber;
    }
  }

  if (normalizedType === DocumentType.PESEL) {
    candidateUpdateData.peselNumber = normalizedPersonalNumber ?? normalizedDocumentNumber;
  }

  await prisma.candidate.update({
    where: { id: document.candidateId },
    data: candidateUpdateData,
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "DOCUMENT_OCR_REVIEWED",
    entityType: "Document",
    entityId: document.id,
    details: toInputJsonValue({
      type: normalizedType,
      markVerified: Boolean(input.markVerified),
      number:
        normalizedType === DocumentType.PESEL
          ? normalizedPersonalNumber ?? normalizedDocumentNumber
          : normalizedDocumentNumber,
      disposition: normalizedDisposition,
    }),
  });

  await syncCandidateOperationalAlerts({
    candidateId: document.candidateId,
    organizationId: tenant.organizationId!,
  });

  revalidatePath("/documentos");
  revalidatePath(`/candidatos/${document.candidateId}`);
  revalidatePath("/candidatos");
  revalidatePath("/legal");
  revalidatePath("/dashboard");
  revalidatePath("/logistica");
  revalidatePath("/notificaciones");

  return { success: true };
}

export async function batchUploadDocuments(candidateId: string, formData: FormData) {
  const files = formData.getAll("files") as File[];
  const requestedType = parseDocumentType((formData.get("docType") as string) || "OTHER");
  const results: Array<{
    filename: string;
    success: boolean;
    message: string;
    reviewRequired?: boolean;
    ocrStatus?: string;
  }> = [];

  for (const file of files) {
    const single = new FormData();
    const inferredType = inferDocumentTypeFromFileName(file.name);
    const effectiveType =
      requestedType === DocumentType.OTHER && inferredType !== DocumentType.OTHER
        ? inferredType
        : requestedType;

    single.append("file", file);
    single.append("candidateId", candidateId);
    single.append("type", effectiveType);

    try {
      const result = await uploadDocument(single);

      results.push({
        filename: file.name,
        success: result.success,
        message: result.message,
        reviewRequired: result.reviewRequired,
        ocrStatus: result.ocrStatus,
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

  if (!canUploadCandidateDocuments(tenant.role)) {
    throw new Error("Tu rol no puede eliminar documentos de candidatos.");
  }

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

  await prisma.document.delete({
    where: { id: documentId },
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
    organizationId: tenant.organizationId!,
    action: "DOCUMENT_DELETED",
    entityType: "Document",
    entityId: documentId,
    details: toInputJsonValue({ url: document.url, type: document.type }),
  });

  await syncCandidateOperationalAlerts({
    candidateId: document.candidateId,
    organizationId: tenant.organizationId!,
  });

  revalidatePath(`/candidatos/${document.candidateId}`);
  revalidatePath("/documentos");
  revalidatePath("/dashboard");
  revalidatePath("/logistica");
  revalidatePath("/notificaciones");

  return { success: true };
}

export async function smartBatchUpload(formData: FormData) {
  const tenant = await requireTenant();

  if (!canUploadCandidateDocuments(tenant.role)) {
    return {
      success: true,
      results: [
        {
          filename: "bulk-upload",
          success: false,
          message: "Tu rol no puede subir documentos en lote.",
        },
      ],
    };
  }
  const candidateIdValue = formData.get("candidateId");
  const files = formData.getAll("files") as File[];
  const candidateId =
    typeof candidateIdValue === "string" && candidateIdValue.trim().length > 0
      ? candidateIdValue
      : null;

  if (isManualOcrMode()) {
    return {
      success: false,
      message:
        "El modo inteligente no esta disponible en este momento. La carga manual sigue activa.",
      results: [],
    };
  }

  const results: Array<{ filename: string; success: boolean; message: string }> = [];
  const batchCandidates = new Map<string, string>();
  const touchedCandidateIds = new Set<string>();
  let batchAnchorCandidateId: string | null = candidateId;

  const preparedFiles = await Promise.all(files.map((file) => prepareSmartUploadFile(file)));
  const candidatesForAnchor = [...preparedFiles]
    .filter((item) => !item.preparationError)
    .sort((a, b) => b.score - a.score);

  if (!batchAnchorCandidateId) {
    for (const prepared of candidatesForAnchor) {
      try {
        const resolved = await resolveSmartUploadCandidate(
          tenant,
          prepared.file,
          prepared.ocrData,
          null,
          batchCandidates,
          null
        );

        batchAnchorCandidateId = resolved.candidate.id;
        rememberBatchCandidate(batchCandidates, resolved.candidate, prepared.ocrData, prepared.file.name);
        break;
      } catch (error) {
        console.warn("[smartBatchUpload] anchor resolution skipped", {
          filename: prepared.file.name,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  }

  for (const prepared of preparedFiles) {
    const { file, ocrData, docType, preparationError, ocrError } = prepared;

    if (preparationError) {
      results.push({
        filename: file.name,
        success: false,
        message: preparationError,
      });
      continue;
    }

    try {
      const resolved = await resolveSmartUploadCandidate(
        tenant,
        file,
        ocrData,
        candidateId,
        batchCandidates,
        batchAnchorCandidateId
      );

      if (!batchAnchorCandidateId) {
        batchAnchorCandidateId = resolved.candidate.id;
      }
      touchedCandidateIds.add(resolved.candidate.id);

      const single = new FormData();
      single.append("file", file);
      single.append("candidateId", resolved.candidate.id);
      single.append("type", docType);
      single.append("skipOcr", "true");
      const derivedNumber =
        normalizeOptionalString(ocrData?.documentNumber) ??
        normalizeOptionalString(ocrData?.personalNumber);
      if (derivedNumber) {
        single.append("number", derivedNumber);
      }
      const issuingCountry = normalizeOptionalString(ocrData?.issuingCountry);
      if (issuingCountry) {
        single.append("issuerCountry", issuingCountry);
      }
      if (ocrData?.dateOfExpiry) {
        single.append("expiryDate", ocrData.dateOfExpiry);
      }

      const result = await uploadDocument(single);

      if (!result.success) {
        if (result.status === "DUPLICATE_DOCUMENT" && result.documentId && ocrData) {
          await mergeOcrIntoExistingDocument(result.documentId, docType, ocrData);
          await applyCandidateFieldsFromOcr(tenant, resolved.candidate.id, docType, ocrData);
          rememberBatchCandidate(batchCandidates, resolved.candidate, ocrData, file.name);
          await syncCandidateOperationalAlerts({
            candidateId: resolved.candidate.id,
            organizationId: tenant.organizationId!,
          });

          results.push({
            filename: file.name,
            success: true,
            message: `Documento complementario integrado para ${resolved.candidate.firstName ?? ""} ${resolved.candidate.lastName ?? ""}`.trim(),
          });
          continue;
        }

        results.push({
          filename: file.name,
          success: false,
          message: result.message ?? "No se pudo completar la subida del documento.",
        });
        continue;
      }

      if (!result.documentId) {
        results.push({
          filename: file.name,
          success: false,
          message: "El documento se proceso sin identificador persistente.",
        });
        continue;
      }

      if (ocrData) {
        await persistExtractedData(result.documentId, docType, ocrData);
        await applyCandidateFieldsFromOcr(tenant, resolved.candidate.id, docType, ocrData);
        rememberBatchCandidate(batchCandidates, resolved.candidate, ocrData, file.name);
      } else if (isOcrSupported(docType)) {
        await markDocumentOcrFailed(
          result.documentId,
          docType,
          ocrError ??
            "OCR no devolvio datos utilizables. El archivo queda guardado para revision manual."
        );
      }

      await syncCandidateOperationalAlerts({
        candidateId: resolved.candidate.id,
        organizationId: tenant.organizationId!,
      });

      results.push({
        filename: file.name,
        success: true,
      message: resolved.created
            ? `Documento guardado y candidato creado: ${resolved.candidate.firstName ?? ""} ${resolved.candidate.lastName ?? ""}`.trim()
            : ocrData
              ? `Documento guardado para ${resolved.candidate.firstName ?? ""} ${resolved.candidate.lastName ?? ""}; pendiente de revision manual`.trim()
              : `Documento guardado para ${resolved.candidate.firstName ?? ""} ${resolved.candidate.lastName ?? ""}; pendiente de revision manual. ${ocrError ?? ""}`.trim(),
      });
    } catch (error) {
      results.push({
        filename: file.name,
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  if (candidateId) {
    revalidatePath(`/candidatos/${candidateId}`);
  }
  if (touchedCandidateIds.size > 0) {
    revalidatePath("/notificaciones");
  }
  revalidatePath("/documentos");
  revalidatePath("/candidatos");
  revalidatePath("/dashboard");
  revalidatePath("/legal");
  revalidatePath("/logistica");

  return { success: true, results };
}
