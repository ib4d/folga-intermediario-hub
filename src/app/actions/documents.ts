"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { analyzeDocument } from "@/lib/ocr";
import { requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";
import { CandidateStatus, DocumentType, Prisma, Role } from "@prisma/client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documentos-candidatos";

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
  ocrData: Awaited<ReturnType<typeof analyzeDocument>>
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

function canAccessCandidate(role: Role, candidateIntermediaryId: string, userId: string): boolean {
  if (([Role.ADMIN, Role.SUPERADMIN, Role.LEGAL, Role.LOGISTICA] as Role[]).includes(role)) {
    return true;
  }

  return candidateIntermediaryId === userId;
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
  ocrData: NonNullable<Awaited<ReturnType<typeof analyzeDocument>>>
) {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      extractedData: toInputJsonValue(ocrData),
      number: ocrData.documentNumber ?? ocrData.personalNumber ?? undefined,
      issuerCountry: ocrData.issuingCountry ?? undefined,
      issueDate: parseDateSafe(ocrData.dateOfIssue),
      expiryDate: parseDateSafe(ocrData.dateOfExpiry),
      ocrStatus: isOcrSupported(docType) ? "REVIEW_REQUIRED" : "OCR_CAPTURED",
    },
  });
}

async function mergeOcrIntoExistingDocument(
  documentId: string,
  docType: DocumentType,
  ocrData: NonNullable<Awaited<ReturnType<typeof analyzeDocument>>>
) {
  const existingDocument = await prisma.document.findFirst({
    where: { id: documentId },
  });

  if (!existingDocument) return;

  const existingExtractedData =
    existingDocument.extractedData &&
    typeof existingDocument.extractedData === "object" &&
    !Array.isArray(existingDocument.extractedData)
      ? (existingDocument.extractedData as Record<string, unknown>)
      : null;

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
      issuerCountry: existingDocument.issuerCountry ?? normalizeOptionalString(ocrData.issuingCountry) ?? undefined,
      issueDate: existingDocument.issueDate ?? parseDateSafe(ocrData.dateOfIssue),
      expiryDate: existingDocument.expiryDate ?? parseDateSafe(ocrData.dateOfExpiry),
      ocrStatus: isOcrSupported(docType) ? "REVIEW_REQUIRED" : "OCR_CAPTURED",
    },
  });
}

function inferDocumentTypeFromSmartSignals(
  fileName: string,
  ocrData: Awaited<ReturnType<typeof analyzeDocument>>
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
  ocrData: NonNullable<Awaited<ReturnType<typeof analyzeDocument>>>
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

  if (firstName && !candidate.firstName) candidateUpdateData.firstName = firstName;
  if (lastName && !candidate.lastName) candidateUpdateData.lastName = lastName;
  if (citizenship && !candidate.citizenship) candidateUpdateData.citizenship = citizenship;
  if (nationality && !candidate.nationality) candidateUpdateData.nationality = nationality;
  if (birthPlace && !candidate.birthPlace) candidateUpdateData.birthPlace = birthPlace;
  if ((gender === "M" || gender === "F") && !candidate.gender) candidateUpdateData.gender = gender;
  if (ocrData.heightCm && !candidate.heightCm) candidateUpdateData.heightCm = ocrData.heightCm;
  if (ocrData.addressOfRegistration && !candidate.polishAddress) {
    candidateUpdateData.polishAddress = ocrData.addressOfRegistration;
  }
  if (ocrData.dateOfBirth && !candidate.dateOfBirth) {
    candidateUpdateData.dateOfBirth = parseDateSafe(ocrData.dateOfBirth);
  }

  if (docType === DocumentType.PASSPORT) {
    if (ocrData.documentNumber && !candidate.passportNumber) {
      candidateUpdateData.passportNumber = ocrData.documentNumber;
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
    if (ocrData.documentNumber && !candidate.kartaPobytuNumber) {
      candidateUpdateData.kartaPobytuNumber = ocrData.documentNumber;
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
  candidateUpdateData.ocrSource = "AZURE";

  await prisma.candidate.update({
    where: { id: candidateId },
    data: candidateUpdateData,
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "CANDIDATE_OCR_FIELDS_APPLIED",
      entityType: "Candidate",
      entityId: candidateId,
      details: toInputJsonValue({
        docType,
        appliedFields: Object.keys(candidateUpdateData),
      }),
    },
  });
}

async function resolveSmartUploadCandidate(
  tenant: Awaited<ReturnType<typeof requireTenant>>,
  file: File,
  ocrData: Awaited<ReturnType<typeof analyzeDocument>>,
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

  for (const key of [docNumber, personalNumber, ocrNameSignature]) {
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

  if (batchAnchorCandidateId) {
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

  const ocrFirstName = normalizePersonName(ocrData?.firstName);
  const ocrLastName = normalizePersonName(ocrData?.lastName);
  const fileNameHints = extractNameHintsFromFileName(file.name);
  const firstName = ocrFirstName ?? fileNameHints.firstName;
  const lastName = ocrLastName ?? fileNameHints.lastName;

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
        normalizeOptionalString(ocrData?.issuingCountry) ??
        normalizeOptionalString(ocrData?.nationality) ??
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
      ocrSource: "AZURE",
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

  await prisma.auditLog.create({
    data: {
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
    },
  });

  await emitEvent(
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

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, { contentType: normalizedMimeType, upsert: false });

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

      const ocrData = await analyzeDocument(fileBuffer, normalizedMimeType);

      if (ocrData) {
        await prisma.document.update({
          where: { id: newDoc.id },
          data: {
            extractedData: toInputJsonValue(ocrData),
            number: ocrData.documentNumber || ocrData.personalNumber || documentNumber,
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
      message: `Nuevo documento subido (${docType}) para ${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim(),
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
      ? "Documento subido y enviado a revision OCR"
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
    ocrSource: "AZURE_REVIEWED",
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

  await prisma.auditLog.create({
    data: {
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
    },
  });

  revalidatePath("/documentos");
  revalidatePath(`/candidatos/${document.candidateId}`);
  revalidatePath("/candidatos");
  revalidatePath("/legal");

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
  const tenant = await requireTenant();
  const candidateIdValue = formData.get("candidateId");
  const files = formData.getAll("files") as File[];
  const candidateId =
    typeof candidateIdValue === "string" && candidateIdValue.trim().length > 0
      ? candidateIdValue
      : null;

  const results: Array<{ filename: string; success: boolean; message: string }> = [];
  const batchCandidates = new Map<string, string>();
  let batchAnchorCandidateId: string | null = candidateId;

  for (const file of files) {
    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const normalizedMimeType = normalizeMimeType(file);
      const ocrData = await analyzeDocument(fileBuffer, normalizedMimeType);
      const docType = inferDocumentTypeFromSmartSignals(file.name, ocrData);
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

      const single = new FormData();
      single.append("file", file);
      single.append("candidateId", resolved.candidate.id);
      single.append("type", docType);
      const derivedNumber =
        normalizeOptionalString(ocrData?.documentNumber) ??
        normalizeOptionalString(ocrData?.personalNumber);
      if (derivedNumber) {
        single.append("number", derivedNumber);
      }
      if (ocrData?.issuingCountry) {
        single.append("issuerCountry", ocrData.issuingCountry);
      }
      if (ocrData?.dateOfExpiry) {
        single.append("expiryDate", ocrData.dateOfExpiry);
      }

      const result = await uploadDocument(single);

      if (!result.success) {
        if (
          result.status === "DUPLICATE_DOCUMENT" &&
          result.documentId &&
          ocrData
        ) {
          await mergeOcrIntoExistingDocument(result.documentId, docType, ocrData);
          await applyCandidateFieldsFromOcr(tenant, resolved.candidate.id, docType, ocrData);

          for (const key of [
            normalizeOptionalString(ocrData.documentNumber),
            normalizeOptionalString(ocrData.personalNumber),
            candidateNameSignature(ocrData.firstName, ocrData.lastName),
            candidateNameSignature(resolved.candidate.firstName, resolved.candidate.lastName),
          ]) {
            if (key) {
              batchCandidates.set(key, resolved.candidate.id);
            }
          }

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
          message: result.message,
        });
        continue;
      }

      if (ocrData) {
        await persistExtractedData(result.documentId, docType, ocrData);
        await applyCandidateFieldsFromOcr(tenant, resolved.candidate.id, docType, ocrData);
        for (const key of [
          normalizeOptionalString(ocrData.documentNumber),
          normalizeOptionalString(ocrData.personalNumber),
          candidateNameSignature(ocrData.firstName, ocrData.lastName),
          candidateNameSignature(resolved.candidate.firstName, resolved.candidate.lastName),
        ]) {
          if (key) {
            batchCandidates.set(key, resolved.candidate.id);
          }
        }
      }

      results.push({
        filename: file.name,
        success: result.success,
        message: resolved.created
          ? `Documento procesado y candidato creado: ${resolved.candidate.firstName ?? ""} ${resolved.candidate.lastName ?? ""}`.trim()
          : `Documento procesado para ${resolved.candidate.firstName ?? ""} ${resolved.candidate.lastName ?? ""}`.trim(),
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
  revalidatePath("/documentos");
  revalidatePath("/candidatos");
  revalidatePath("/dashboard");
  revalidatePath("/legal");
  revalidatePath("/logistica");

  return { success: true, results };
}
