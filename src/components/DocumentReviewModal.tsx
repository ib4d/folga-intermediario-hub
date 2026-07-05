"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, PencilLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getDocumentDisplayNumber,
  getDocumentDisposition,
  getDocumentDispositionLabel,
  isOcrReviewRequiredStatus,
  isManualReviewOcrStatus,
} from "@/lib/document-display";

type ReviewableDocument = {
  id: string;
  type: string;
  number: string | null;
  expiryDate: string | Date | null;
  issueDate: string | Date | null;
  url?: string | null;
  ocrStatus?: string | null;
  isVerified?: boolean;
  extractedData: unknown;
};

type SiblingDocumentFallback = {
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
  kartaPobytuType?: string;
};

type CandidateDefaults = {
  firstName?: string | null;
  lastName?: string | null;
  nationality?: string | null;
  citizenship?: string | null;
  dateOfBirth?: string | Date | null;
  birthPlace?: string | null;
  gender?: string | null;
  heightCm?: number | null;
  polishAddress?: string | null;
  passportNumber?: string | null;
  passportIssueDate?: string | Date | null;
  passportExpiry?: string | Date | null;
  passportBiometric?: boolean | null;
  kartaPobytuNumber?: string | null;
  kartaPobytuIssueDate?: string | Date | null;
  kartaPobytuExpiry?: string | Date | null;
  kartaPobytuType?: string | null;
  peselNumber?: string | null;
  issuingAuthority?: string | null;
};

type DuplicateContext = {
  type: string;
  number: string | null;
  count: number;
  suggestion: string;
  matchingDocuments: ReviewableDocument[];
};

type DispositionOption = {
  value: "PRIMARY" | "FRONT" | "BACK" | "SUPPORTING" | "DUPLICATE";
  label: string;
};

type InferredNameParts = {
  firstName: string;
  lastName: string;
};

type FieldSource = "OCR" | "MRZ" | "CANDIDATE" | "FILE" | "RECORD" | "MANUAL";

type ReviewFieldKey =
  | "type"
  | "documentDisposition"
  | "documentNumber"
  | "personalNumber"
  | "expiryDate"
  | "issueDate"
  | "firstName"
  | "lastName"
  | "nationality"
  | "issuingCountry"
  | "dateOfBirth"
  | "sex"
  | "placeOfBirth"
  | "issuingAuthority"
  | "passportBiometric"
  | "kartaPobytuType"
  | "remarks"
  | "municipalityOffice"
  | "addressOfRegistration"
  | "heightCm"
  | "ocrError"
  | "markVerified";

type ManualReviewState = {
  form: {
    type: string;
    documentDisposition: string;
    documentNumber: string;
    personalNumber: string;
    expiryDate: string;
    issueDate: string;
    firstName: string;
    lastName: string;
    nationality: string;
    issuingCountry: string;
    dateOfBirth: string;
    sex: string;
    placeOfBirth: string;
    issuingAuthority: string;
    passportBiometric: boolean;
    kartaPobytuType: string;
    remarks: string;
    municipalityOffice: string;
    addressOfRegistration: string;
    heightCm: string;
    ocrError: string;
    markVerified: boolean;
  };
  fieldSources: Record<ReviewFieldKey, FieldSource>;
};

type ReviewChecklistItem = {
  label: string;
  value: string;
  required: boolean;
  missing: boolean;
  source?: FieldSource;
};

type RawTextFallback = {
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
  kartaPobytuType?: string;
  remarks?: string;
};

type RawTextFallbackResult = {
  values: RawTextFallback;
  sources: Partial<Record<keyof RawTextFallback, FieldSource>>;
};

function getExtractedData(value: unknown): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function getRawText(value: Record<string, unknown>): string {
  const rawText = value.rawText;
  return typeof rawText === "string" ? rawText : "";
}

function buildDuplicateContext(doc: ReviewableDocument, allDocuments: ReviewableDocument[]): DuplicateContext | null {
  const currentNumber = getDocumentDisplayNumber(doc);
  const currentDisposition = getDocumentDisposition(doc);

  if (!currentNumber || currentDisposition === "BACK" || currentDisposition === "SUPPORTING") {
    return null;
  }

  const matchingDocuments = allDocuments.filter((candidateDocument) => {
    if (candidateDocument.type !== doc.type) return false;

    const candidateDisposition = getDocumentDisposition(candidateDocument);
    if (candidateDisposition === "BACK" || candidateDisposition === "SUPPORTING") {
      return false;
    }

    return getDocumentDisplayNumber(candidateDocument) === currentNumber;
  });

  if (matchingDocuments.length <= 1) {
    return null;
  }

  return {
    type: doc.type,
    number: currentNumber,
    count: matchingDocuments.length,
    suggestion:
      matchingDocuments.length <= 2
        ? "Sugerencia: confirma si este grupo corresponde a frente y reverso antes de dejarlo como duplicado."
        : "Sugerencia: conserva un principal y reclasifica el resto como soporte o duplicado real.",
    matchingDocuments,
  };
}

function getSiblingDocumentFallback(
  doc: ReviewableDocument,
  allDocuments: ReviewableDocument[],
): SiblingDocumentFallback | null {
  if (canonicalizeDocumentType(doc.type) !== "KARTA_POBYTU") return null;

  const currentDisposition = getDocumentDisposition(doc);
  const currentNumber = getDocumentDisplayNumber(doc);
  const allKartaCandidates = allDocuments.filter((candidateDocument) => {
    if (candidateDocument.id === doc.id) return false;
    if (canonicalizeDocumentType(candidateDocument.type) !== "KARTA_POBYTU") return false;
    return true;
  });

  const siblingCandidatesByNumber = allKartaCandidates.filter((candidateDocument) => {
    const candidateNumber = getDocumentDisplayNumber(candidateDocument);
    if (!currentNumber || !candidateNumber) return false;
    return currentNumber === candidateNumber;
  });

  const siblingCandidates =
    siblingCandidatesByNumber.length > 0 ? siblingCandidatesByNumber : allKartaCandidates;

  if (siblingCandidates.length === 0) return null;

  const preferredSibling =
    siblingCandidates.find((candidateDocument) => {
      const siblingDisposition = getDocumentDisposition(candidateDocument);
      return currentDisposition === "BACK"
        ? siblingDisposition === "PRIMARY" || siblingDisposition === "FRONT"
        : siblingDisposition === "BACK";
    }) ?? siblingCandidates[0];

  const extracted = getExtractedData(preferredSibling.extractedData);
  return {
    documentNumber: asString(extracted.documentNumber) || preferredSibling.number || undefined,
    personalNumber: asString(extracted.personalNumber) || undefined,
    expiryDate: asString(extracted.dateOfExpiry) || toDateInputValue(preferredSibling.expiryDate) || undefined,
    issueDate: asString(extracted.dateOfIssue) || toDateInputValue(preferredSibling.issueDate) || undefined,
    firstName: asString(extracted.firstName) || undefined,
    lastName: asString(extracted.lastName) || undefined,
    nationality: asString(extracted.nationality) || undefined,
    issuingCountry: asString(extracted.issuingCountry) || undefined,
    dateOfBirth: asString(extracted.dateOfBirth) || undefined,
    sex: asString(extracted.sex) || undefined,
    placeOfBirth: asString(extracted.placeOfBirth) || undefined,
    issuingAuthority: asString(extracted.issuingAuthority) || undefined,
    kartaPobytuType: asString(extracted.kartaPobytuType) || undefined,
  };
}

function getSuggestedDispositionOptions(duplicateContext: DuplicateContext | null): DispositionOption[] {
  if (!duplicateContext) {
    return [];
  }

  if (duplicateContext.count <= 2) {
    return [
      { value: "PRIMARY", label: "Mantener principal" },
      { value: "FRONT", label: "Marcar como frente" },
      { value: "BACK", label: "Marcar como reverso" },
    ];
  }

  return [
    { value: "PRIMARY", label: "Mantener principal" },
    { value: "SUPPORTING", label: "Marcar como soporte" },
    { value: "DUPLICATE", label: "Marcar como duplicado" },
  ];
}

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  }

  return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeFallbackText(value: string | null | undefined): string {
  if (!value) return "";

  const normalized = value.trim();
  if (!normalized) return "";

  const placeholders = new Set([
    "NO DISPONIBLE",
    "N/A",
    "NA",
    "-",
    "NONE",
    "NULL",
    "UNDEFINED",
    "PENDIENTE",
    "PENDING",
  ]);

  return placeholders.has(normalized.toUpperCase()) ? "" : normalized;
}

function isFilledReviewValue(value: string | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  return Boolean(normalizeFallbackText(value));
}

function scoreTextCandidate(value: string | null | undefined): number {
  const normalized = normalizeFallbackText(value);
  if (!normalized) return -1;

  const compact = normalized.replace(/[^A-Z0-9]/gi, "");
  const tokenCount = normalized.split(/\s+/).filter(Boolean).length;
  const alphaCount = compact.replace(/\d/g, "").length;
  const digitPenalty = /\d/.test(normalized) ? 8 : 0;

  return alphaCount + tokenCount * 4 + Math.min(10, compact.length / 3) - digitPenalty;
}

function pickBestTextCandidateWithSource(
  ...candidates: Array<{ value: string | null | undefined; source: FieldSource }>
): { value: string; source?: FieldSource } {
  const scoredCandidates = candidates
    .map((candidate) => {
      const normalized = normalizeFallbackText(candidate.value);
      if (!normalized) {
        return null;
      }

      return {
        ...candidate,
        value: normalized,
        score: scoreTextCandidate(normalized),
      };
    })
    .filter((candidate): candidate is { value: string; source: FieldSource; score: number } => Boolean(candidate));

  if (scoredCandidates.length === 0) {
    return { value: "" };
  }

  const bestCandidate = scoredCandidates.sort((left, right) => right.score - left.score)[0];
  return { value: bestCandidate.value, source: bestCandidate.source };
}

function pickPreferredTextCandidateWithSource(
  preferredSources: FieldSource[],
  ...candidates: Array<{ value: string | null | undefined; source: FieldSource }>
): { value: string; source?: FieldSource } {
  const normalizedCandidates = candidates
    .map((candidate) => {
      const normalized = normalizeFallbackText(candidate.value);
      if (!normalized) {
        return null;
      }

      return {
        ...candidate,
        value: normalized,
        score: scoreTextCandidate(normalized),
      };
    })
    .filter((candidate): candidate is { value: string; source: FieldSource; score: number } => Boolean(candidate));

  if (normalizedCandidates.length === 0) {
    return { value: "" };
  }

  for (const source of preferredSources) {
    const sourceCandidates = normalizedCandidates
      .filter((candidate) => candidate.source === source)
      .sort((left, right) => right.score - left.score);

    if (sourceCandidates.length > 0) {
      return { value: sourceCandidates[0].value, source: sourceCandidates[0].source };
    }
  }

  const bestCandidate = normalizedCandidates.sort((left, right) => right.score - left.score)[0];
  return { value: bestCandidate.value, source: bestCandidate.source };
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function getReviewableDocumentName(doc: ReviewableDocument): string {
  const fromUrl = doc.url?.split("/").pop()?.trim();
  if (fromUrl) return fromUrl;
  return `Documento ${doc.id.slice(0, 8)}`;
}

function getReviewableDocumentStatus(doc: ReviewableDocument): string {
  if (doc.isVerified) return "Verificado";
  if (doc.ocrStatus === "FAILED") return "OCR fallido";
  if (doc.ocrStatus === "OCR_CAPTURED") return "OCR capturado";
  if (isOcrReviewRequiredStatus(doc.ocrStatus)) return "OCR para revisar";
  if (isManualReviewOcrStatus(doc.ocrStatus)) return "Pendiente de revision manual";
  if (doc.ocrStatus === "SUCCESS") return "OCR exitoso";
  return doc.ocrStatus ?? "Pendiente";
}

function normalizeReviewErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Error al guardar la revision";

  if (
    message.includes("Failed to find Server Action") ||
    message.includes("older or newer deployment") ||
    message.includes("was not found on the server")
  ) {
    return "La aplicacion se actualizo mientras esta pagina estaba abierta. Recarga la pagina y vuelve a guardar la revision.";
  }

  if (message.toLowerCase().includes("fetch failed")) {
    return "No se pudo guardar la revision porque la conexion con el servidor se interrumpio. Recarga la pagina e intenta nuevamente.";
  }

  return message;
}

async function parseReviewResponse(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return {} as { success?: boolean; message?: string };
  }

  try {
    return JSON.parse(raw) as { success?: boolean; message?: string };
  } catch {
    throw new Error(
      raw.startsWith("<")
        ? "El servidor devolvio una pagina inesperada en lugar de JSON."
        : raw,
    );
  }
}

function normalizeFileStem(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferDocumentTypeFromFileName(fileName: string): string {
  const normalized = normalizeFileStem(fileName).toLowerCase();

  if (
    normalized.includes("karta pobytu") ||
    normalized.includes("kartapobytu") ||
    normalized.includes("residence permit")
  ) {
    return "KARTA_POBYTU";
  }

  if (normalized.includes("pesel")) {
    return "PESEL";
  }

  if (
    normalized.includes("passport") ||
    normalized.includes("pasaporte") ||
    normalized.includes("paszport")
  ) {
    return "PASSPORT";
  }

  if (normalized.includes("wojewody") || normalized.includes("decyzja")) {
    return "DECYZJA_WOJEWODY";
  }

  if (normalized.includes("cv") || normalized.includes("resume")) {
    return "CV";
  }

  return "OTHER";
}

function canonicalizeDocumentType(value: string | null | undefined): string {
  const normalized = normalizeFileStem(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (!normalized) return "OTHER";

  if (
    normalized === "PASSPORT" ||
    normalized === "PASAPORTE" ||
    normalized === "PASZPORT"
  ) {
    return "PASSPORT";
  }

  if (
    normalized.includes("PASSPORT") ||
    normalized.includes("PASAPORTE") ||
    normalized.includes("PASZPORT")
  ) {
    return "PASSPORT";
  }

  if (
    normalized === "KARTA POBYTU" ||
    normalized === "KARTA_POBYTU" ||
    normalized === "KARTAPOBYTU" ||
    normalized === "RESIDENCE PERMIT"
  ) {
    return "KARTA_POBYTU";
  }

  if (
    normalized.includes("KARTA POBYTU") ||
    normalized.includes("KARTA_POBYTU") ||
    normalized.includes("KARTAPOBYTU") ||
    normalized.includes("RESIDENCE PERMIT") ||
    normalized.includes("PERMISO DE RESIDENCIA") ||
    normalized.includes("TARJETA DE RESIDENCIA")
  ) {
    return "KARTA_POBYTU";
  }

  if (normalized === "PESEL") {
    return "PESEL";
  }

  if (
    normalized === "DECYZJA WOJEWODY" ||
    normalized === "DECYZJA_WOJEWODY" ||
    normalized === "WOJEWODY"
  ) {
    return "DECYZJA_WOJEWODY";
  }

  return normalized.replace(/\s+/g, "_");
}

function inferDocumentNumberFromFileName(fileName: string): string {
  const normalized = normalizeFileStem(fileName).toUpperCase();
  const peselMatch = normalized.match(/\b\d{11}\b/);
  if (peselMatch) {
    return peselMatch[0];
  }

  const passportMatch = normalized.match(/\b[A-Z]{1,3}\d{5,10}\b/);
  if (passportMatch) {
    return passportMatch[0];
  }

  return "";
}

function normalizeRawText(rawText: string): string {
  return rawText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizeReviewName(value: string | null | undefined): string {
  return normalizeFallbackText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanReviewIssuingAuthorityValue(value: string | null | undefined): string {
  const normalized = normalizeReviewName(value);
  if (!normalized) return "";

  return normalized
    .replace(/\bWOJEWODA\s+EODZKI\b/g, "WOJEWODA LODZKI")
    .replace(/\bWOJEWODA\s+LODZKI[A-Z]+\b/g, "WOJEWODA LODZKI")
    .trim();
}

function cleanReviewKartaRemarksValue(value: string | null | undefined): string {
  const normalized = normalizeReviewName(value);
  if (!normalized) return "";

  if (normalized.replace(/\s+/g, "").includes("DOSTEPDORYNKUPRACY")) {
    return "DOSTEP DO RYNKU PRACY";
  }

  return normalized;
}

function collectPassportFirstNameTokens(...values: Array<string | null | undefined>): string[] {
  const tokens = values
    .flatMap((value) =>
      sanitizePassportFirstNameCandidate(value)
        .split(/\s+/)
        .filter((token) => token.length >= 3)
    )
    .filter(Boolean);

  return [...new Set(tokens)];
}

function isLikelyPassportTrailingNoiseToken(token: string): boolean {
  const normalized = normalizeReviewName(token);
  if (!normalized) return false;
  if (normalized.length === 1) return true;
  if (/^[KLX]+$/.test(normalized)) return true;
  if (!/[AEIOUY]/.test(normalized) && normalized.length <= 4 && new Set(normalized.split("")).size <= 3) {
    return true;
  }

  return false;
}

function sanitizePassportFirstNameCandidate(firstName: string | null | undefined): string {
  const normalizedFirstName = normalizeReviewName(firstName);
  if (!normalizedFirstName) return "";

  const tokens = normalizedFirstName.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  while (tokens.length > 1 && isLikelyPassportTrailingNoiseToken(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const lastToken = tokens[tokens.length - 1];
  if (lastToken) {
    const trailingNoise = lastToken.match(/^([A-Z]{4,})([KLX])$/);
    if (trailingNoise && /[AEIOUY]/.test(trailingNoise[1])) {
      tokens[tokens.length - 1] = trailingNoise[1];
    }
  }

  return tokens.join(" ").trim();
}

function normalizeMrzLine(line: string): string {
  return normalizeRawText(line).replace(/\s+/g, "");
}

function sanitizePassportLastNameCandidate(
  lastName: string | null | undefined,
  ...firstNameHints: Array<string | null | undefined>
): string {
  const normalizedLastName = normalizeReviewName(lastName);
  if (!normalizedLastName) return "";

  const firstNameTokens = collectPassportFirstNameTokens(...firstNameHints);
  if (firstNameTokens.length === 0) return normalizedLastName;

  const lastNameTokens = normalizedLastName.split(/\s+/).filter(Boolean);
  if (lastNameTokens.length <= 1) return normalizedLastName;

  const cleanupSurnameTokens = (value: string) => {
    const tokens = value
      .split(/\s+/)
      .filter(Boolean)
      .filter((token, index, allTokens) => !(token.length === 1 && index > 0 && index < allTokens.length - 1))
      .map((token, index) => {
        if (index === 0) return token;
        const fillerPrefix = token.match(/^[KLX]([A-Z]{4,})$/);
        return fillerPrefix && /[AEIOUY]/.test(fillerPrefix[1]) ? fillerPrefix[1] : token;
      });
    if (tokens.length === 0) return "";

    while (tokens.length > 1 && tokens[tokens.length - 1]?.length === 1) {
      const trailingToken = tokens[tokens.length - 1];
      const previousToken = tokens[tokens.length - 2];

      if (
        trailingToken &&
        previousToken &&
        previousToken.length >= 5 &&
        previousToken.endsWith(trailingToken)
      ) {
        tokens[tokens.length - 2] = previousToken.slice(0, -1);
      }

      tokens.pop();
    }

    return tokens.join(" ").trim();
  };

  for (const firstNameToken of firstNameTokens) {
    const embeddedIndex = normalizedLastName.indexOf(firstNameToken);
    if (embeddedIndex > 0) {
      return cleanupSurnameTokens(normalizedLastName.slice(0, embeddedIndex).trim());
    }
  }

  for (let index = 1; index < lastNameTokens.length; index += 1) {
    const token = lastNameTokens[index];
    const matchedFirstName = firstNameTokens.find(
      (firstNameToken) =>
        token === firstNameToken ||
        token.includes(firstNameToken) ||
        token.startsWith(firstNameToken) ||
        token.endsWith(firstNameToken)
    );
    if (!matchedFirstName) continue;

    const trimmedTokens = lastNameTokens.slice(0, index);
    const previousToken = trimmedTokens[trimmedTokens.length - 1];
    if (previousToken) {
      const trailingNoise = previousToken.match(/^([A-Z]+?)([A-Z])$/);
      if (
        trailingNoise &&
        trailingNoise[1].length >= 3 &&
        token.startsWith(trailingNoise[2] + matchedFirstName)
      ) {
        trimmedTokens[trimmedTokens.length - 1] = trailingNoise[1];
      }
    }

    return cleanupSurnameTokens(trimmedTokens.join(" ").trim());
  }

  return cleanupSurnameTokens(normalizedLastName);
}

function isLikelyGenericFileNameName(value: string | null | undefined): boolean {
  const normalized = normalizeReviewName(value);
  if (!normalized) return false;

  return /\b(COLLAGE|CAMSCANNER|SCAN|SCANNER|SCANNED|PAGE|PASSPORT|PASAPORTE|PASZPORT|DOCUMENTO|DOC|IMG|JPEG|JPG|PNG|WA)\b/.test(
    normalized,
  );
}

function scorePassportLastNameCandidate(
  value: string | null | undefined,
  source: FieldSource,
  ...firstNameHints: Array<string | null | undefined>
): number {
  const sanitized = sanitizePassportLastNameCandidate(value, ...firstNameHints);
  if (!sanitized) return -1;
  if (source === "FILE" && isLikelyGenericFileNameName(sanitized)) return -1;

  const tokens = sanitized.split(/\s+/).filter(Boolean);
  const compact = sanitized.replace(/[^A-Z]/g, "");
  const firstNameTokens = collectPassportFirstNameTokens(...firstNameHints);
  const sourceWeight: Record<FieldSource, number> = {
    OCR: 52,
    MRZ: 32,
    CANDIDATE: -20,
    FILE: -2,
    RECORD: 8,
    MANUAL: 2,
  };

  let score = compact.length + tokens.length * 4 + sourceWeight[source];

  if (tokens.length > 3) score -= 18;
  if (tokens.some((token) => token.length === 1)) score -= 24;
  if (firstNameTokens.some((token) => sanitized.includes(token))) score -= 28;

  return score;
}

function pickPassportLastNameCandidateWithSource(
  candidates: Array<{ value: string | null | undefined; source: FieldSource }>,
  ...firstNameHints: Array<string | null | undefined>
): { value: string; source?: FieldSource } {
  const scoredCandidates = candidates
    .map((candidate) => {
      const sanitized = sanitizePassportLastNameCandidate(candidate.value, ...firstNameHints);
      const normalized = normalizeFallbackText(sanitized);
      if (!normalized) {
        return null;
      }

      return {
        source: candidate.source,
        value: normalized,
        score: scorePassportLastNameCandidate(normalized, candidate.source, ...firstNameHints),
      };
    })
    .filter(
      (candidate): candidate is { value: string; source: FieldSource; score: number } =>
        candidate !== null && candidate.score >= 0,
    )
    .sort((left, right) => right.score - left.score);

  if (scoredCandidates.length === 0) {
    return { value: "" };
  }

  return { value: scoredCandidates[0].value, source: scoredCandidates[0].source };
}

function parseMrzDate(value: string): string | undefined {
  const compact = value.replace(/\s+/g, "").replace(/</g, "");
  if (compact.length !== 6 || !/^\d{6}$/.test(compact)) return undefined;

  const year = Number.parseInt(compact.slice(0, 2), 10);
  const month = Number.parseInt(compact.slice(2, 4), 10);
  const day = Number.parseInt(compact.slice(4, 6), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const fullYear = year >= 50 ? 1900 + year : 2000 + year;
  return `${fullYear.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function inferFromRawText(rawText: string, docType: string): RawTextFallbackResult {
  if (!rawText) {
    return { values: {}, sources: {} };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeMrzLine(line))
    .filter(Boolean);

  const fallback: RawTextFallback = {};
  const sources: RawTextFallbackResult["sources"] = {};

  const passportMrzIndex = lines.findIndex((line) => line.startsWith("P<"));
  if (passportMrzIndex >= 0 && lines[passportMrzIndex + 1]?.length >= 27) {
    const mrzLine1 = lines[passportMrzIndex];
    const mrzLine2 = lines[passportMrzIndex + 1];
    const mrzNames = mrzLine1.slice(5).split("<<");
    const lastName = mrzNames[0]?.replace(/</g, " ").trim();
    const firstName = mrzNames.slice(1).join(" ").replace(/</g, " ").trim();
    const normalizedFullText = normalizeRawText(rawText);
    const personalNumberFromText = normalizedFullText.match(/\b(CC[A-Z0-9]{8,14})\b/)?.[1];

    fallback.documentNumber = mrzLine2.slice(0, 9).replace(/</g, "") || undefined;
    fallback.personalNumber =
      personalNumberFromText || mrzLine2.slice(28, 42).replace(/</g, "").trim() || undefined;
    fallback.dateOfBirth = parseMrzDate(mrzLine2.slice(13, 19));
    fallback.expiryDate = parseMrzDate(mrzLine2.slice(21, 27));
    fallback.sex = mrzLine2.slice(20, 21).replace(/</g, "").trim() || undefined;
    fallback.nationality = mrzLine2.slice(10, 13).replace(/</g, "").trim() || undefined;
    fallback.issuingCountry = mrzLine1.slice(2, 5).replace(/</g, "").trim() || undefined;
    fallback.firstName = firstName || undefined;
    fallback.lastName = lastName || undefined;
    sources.documentNumber = "MRZ";
    sources.personalNumber = "MRZ";
    sources.dateOfBirth = "MRZ";
    sources.expiryDate = "MRZ";
    sources.sex = "MRZ";
    sources.nationality = "MRZ";
    sources.issuingCountry = "MRZ";
    sources.firstName = "MRZ";
    sources.lastName = "MRZ";
  }

  const kartaMrzIndex = lines.findIndex((line) => /^I[A-Z<]?POL/.test(line));
  if (kartaMrzIndex >= 0 && lines[kartaMrzIndex + 2]) {
    const mrzLine1 = lines[kartaMrzIndex];
    const mrzLine2 = lines[kartaMrzIndex + 1] ?? "";
    const mrzLine3 = lines[kartaMrzIndex + 2];

    const documentNumberMatch =
      (mrzLine1.length >= 14 ? mrzLine1.slice(5, 14).replace(/</g, "") : undefined) ??
      mrzLine1.match(/([A-Z]{1,3}\d{6,10})/)?.[1];
    const dateMatch = mrzLine2.match(/^(\d{6})\d?([MF<])(\d{6})\d?([A-Z]{3})/);
    const nameParts = mrzLine3.split("<<");
    const lastName = nameParts[0]?.replace(/</g, " ").trim();
    const firstName = nameParts.slice(1).join(" ").replace(/</g, " ").trim();

    fallback.documentNumber = documentNumberMatch || undefined;
    fallback.dateOfBirth = parseMrzDate(dateMatch?.[1] ?? "");
    fallback.expiryDate = parseMrzDate(dateMatch?.[3] ?? "");
    fallback.nationality = dateMatch?.[4] || undefined;
    fallback.issuingCountry = "POL";
    fallback.firstName = firstName || undefined;
    fallback.lastName = lastName || undefined;
    sources.documentNumber = "MRZ";
    sources.dateOfBirth = "MRZ";
    sources.expiryDate = "MRZ";
    sources.nationality = "MRZ";
    sources.issuingCountry = "MRZ";
    sources.firstName = "MRZ";
    sources.lastName = "MRZ";
  }

  if (docType === "KARTA_POBYTU") {
    const normalized = normalizeRawText(rawText);
    const authorityMatch = normalized.match(
      /\b(?:DATA WYDANIA I ORGAN WYDAJACY|DATE OF ISSUE AND ISSUING AUTHORITY)\b[\s:.-]*([A-Z ]{6,})/,
    );
    const authorityCandidate = cleanReviewIssuingAuthorityValue(authorityMatch?.[1]);
    if (authorityCandidate) {
      fallback.issuingAuthority = authorityCandidate;
      sources.issuingAuthority = "OCR";
    }

    const remarksCandidate = cleanReviewKartaRemarksValue(
      normalized.match(/\b(?:UWAGI|REMARKS)\b[\s:.-]*([A-Z ]{6,})/)?.[1] ?? "",
    );
    if (remarksCandidate) {
      fallback.remarks = remarksCandidate;
      sources.remarks = "OCR";
    }

    if (normalized.includes("ZEZWOLENIE NA POBYT CZASOWY")) {
      fallback.kartaPobytuType = "Permiso de residencia temporal";
      sources.kartaPobytuType = "OCR";
    } else if (normalized.includes("ZEZWOLENIE NA POBYT STALY")) {
      fallback.kartaPobytuType = "Permiso de residencia permanente";
      sources.kartaPobytuType = "OCR";
    }
  }

  if (docType === "PESEL") {
    const normalized = normalizeRawText(rawText);
    const peselMatch = normalized.match(/\b(\d{11})\b/);
    if (peselMatch) {
      fallback.personalNumber = peselMatch[1];
      sources.personalNumber = "OCR";
    }

    const labelValue = (labelPatterns: string[]) => {
      for (const line of lines) {
        if (!labelPatterns.some((pattern) => line.includes(pattern))) continue;
        const value = line.replace(new RegExp(`^.*?(?:${labelPatterns.join("|")})\\b[:\\s-]*`), "").trim();
        if (value) return value.replace(/</g, " ").trim();
      }
      return undefined;
    };

    const firstName = labelValue(["IMIE", "IMIONA"]);
    const lastName = labelValue(["NAZWISKO"]);
    const dateOfBirth = labelValue(["DATA URODZENIA"])?.replace(/\./g, "-");

    if (firstName) {
      fallback.firstName = firstName;
      sources.firstName = "OCR";
    }
    if (lastName) {
      fallback.lastName = lastName;
      sources.lastName = "OCR";
    }
    if (dateOfBirth) {
      fallback.dateOfBirth = dateOfBirth;
      sources.dateOfBirth = "OCR";
    }
  }

  return { values: fallback, sources };
}

function inferNamePartsFromFileName(fileName: string): InferredNameParts | null {
  const normalized = normalizeFileStem(fileName).toLowerCase();
  if (/(^|\s)(collage|camscanner)(\s|$)/i.test(normalized)) {
    return null;
  }

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^\d+$/.test(token))
    .filter(
      (token) =>
        ![
          "passport",
          "pasaporte",
          "paszport",
          "pesel",
          "karta",
          "pobytu",
          "decyzja",
          "wojewody",
          "residence",
          "permit",
          "page",
          "scan",
          "front",
          "back",
          "reverso",
          "frente",
          "pdf",
          "jpg",
          "jpeg",
          "png",
          "doc",
          "documento",
          "collage",
          "camscanner",
          "scanner",
          "scanned",
          "scaner",
        ].includes(token),
    );

  if (tokens.length < 2 || tokens.length > 4) {
    return null;
  }

  const prettyTokens = tokens.map((token) => token.charAt(0).toUpperCase() + token.slice(1));

  if (prettyTokens.length === 2) {
    return {
      firstName: prettyTokens[0],
      lastName: prettyTokens[1],
    };
  }

  if (prettyTokens.length === 3) {
    return {
      firstName: prettyTokens.slice(0, 2).join(" "),
      lastName: prettyTokens[2],
    };
  }

  return {
    firstName: prettyTokens.slice(0, 2).join(" "),
    lastName: prettyTokens.slice(2).join(" "),
  };
}

function shouldUseCandidateIdentityFallback(documentType: string): boolean {
  return !["PASSPORT", "KARTA_POBYTU", "PESEL"].includes(
    canonicalizeDocumentType(documentType),
  );
}

function stripCandidateFallbackForIdentityDocument(
  documentType: string,
  candidate: { value: string; source?: FieldSource },
  ...fallbackCandidates: Array<{ value: string | null | undefined; source: FieldSource }>
): { value: string; source?: FieldSource } {
  if (shouldUseCandidateIdentityFallback(documentType)) return candidate;
  if (candidate.source !== "CANDIDATE" && candidate.source !== "FILE") return candidate;

  const nonProfileCandidates = fallbackCandidates.filter(
    (fallbackCandidate) =>
      fallbackCandidate.source !== "CANDIDATE" && fallbackCandidate.source !== "FILE",
  );
  if (nonProfileCandidates.length === 0) return { value: "" };

  return pickPreferredTextCandidateWithSource(
    ["MRZ", "OCR", "RECORD", "MANUAL"],
    ...nonProfileCandidates,
  );
}

function restoreNameSpacingFromFileCandidate(
  extractedCandidate: { value: string; source?: FieldSource },
  fileCandidate: string | null | undefined,
): { value: string; source?: FieldSource } {
  const normalizedFileCandidate = normalizeReviewName(fileCandidate);
  if (!normalizedFileCandidate) return extractedCandidate;

  const extractedCompact = normalizeReviewName(extractedCandidate.value).replace(/\s+/g, "");
  const fileCompact = normalizedFileCandidate.replace(/\s+/g, "");

  return extractedCompact && extractedCompact === fileCompact
    ? { value: normalizedFileCandidate, source: "FILE" }
    : extractedCandidate;
}

function buildManualReviewChecklist(
  form: {
    type: string;
    documentNumber: string;
    personalNumber: string;
    expiryDate: string;
    issueDate: string;
    firstName: string;
    lastName: string;
    nationality: string;
    issuingCountry: string;
    dateOfBirth: string;
    kartaPobytuType: string;
    passportBiometric: boolean;
  },
  sources: Partial<Record<ReviewFieldKey, FieldSource>>,
) {
  const passportChecklist: ReviewChecklistItem[] = [
    {
      label: "Numero de documento",
      value: form.documentNumber,
      required: true,
      missing: !isFilledReviewValue(form.documentNumber),
      source: sources.documentNumber,
    },
    {
      label: "Fecha de expiracion",
      value: form.expiryDate,
      required: true,
      missing: !isFilledReviewValue(form.expiryDate),
      source: sources.expiryDate,
    },
    { label: "Nombre", value: form.firstName, required: true, missing: !isFilledReviewValue(form.firstName), source: sources.firstName },
    { label: "Apellido", value: form.lastName, required: true, missing: !isFilledReviewValue(form.lastName), source: sources.lastName },
    {
      label: "Nacionalidad",
      value: form.nationality,
      required: true,
      missing: !isFilledReviewValue(form.nationality),
      source: sources.nationality,
    },
    {
      label: "Pais emisor",
      value: form.issuingCountry,
      required: true,
      missing: !isFilledReviewValue(form.issuingCountry),
      source: sources.issuingCountry,
    },
    {
      label: "Fecha de nacimiento",
      value: form.dateOfBirth,
      required: true,
      missing: !isFilledReviewValue(form.dateOfBirth),
      source: sources.dateOfBirth,
    },
    {
      label: "Pasaporte biometrico",
      value: form.passportBiometric ? "Si" : "",
      required: false,
      missing: !form.passportBiometric,
      source: sources.passportBiometric,
    },
  ];

  const kartaChecklist: ReviewChecklistItem[] = [
    {
      label: "Numero de tarjeta",
      value: form.documentNumber,
      required: true,
      missing: !isFilledReviewValue(form.documentNumber),
      source: sources.documentNumber,
    },
    {
      label: "Fecha de expiracion",
      value: form.expiryDate,
      required: true,
      missing: !isFilledReviewValue(form.expiryDate),
      source: sources.expiryDate,
    },
    { label: "Nombre", value: form.firstName, required: true, missing: !isFilledReviewValue(form.firstName), source: sources.firstName },
    { label: "Apellido", value: form.lastName, required: true, missing: !isFilledReviewValue(form.lastName), source: sources.lastName },
    { label: "PESEL", value: form.personalNumber, required: true, missing: !isFilledReviewValue(form.personalNumber), source: sources.personalNumber },
    {
      label: "Tipo de karta",
      value: form.kartaPobytuType,
      required: true,
      missing: !isFilledReviewValue(form.kartaPobytuType),
      source: sources.kartaPobytuType,
    },
    {
      label: "Nacionalidad",
      value: form.nationality,
      required: true,
      missing: !isFilledReviewValue(form.nationality),
      source: sources.nationality,
    },
    {
      label: "Pais emisor",
      value: form.issuingCountry,
      required: true,
      missing: !isFilledReviewValue(form.issuingCountry),
      source: sources.issuingCountry,
    },
    {
      label: "Fecha de nacimiento",
      value: form.dateOfBirth,
      required: true,
      missing: !isFilledReviewValue(form.dateOfBirth),
      source: sources.dateOfBirth,
    },
  ];

  const peselChecklist: ReviewChecklistItem[] = [
    { label: "PESEL", value: form.personalNumber, required: true, missing: !isFilledReviewValue(form.personalNumber), source: sources.personalNumber },
    { label: "Nombre", value: form.firstName, required: true, missing: !isFilledReviewValue(form.firstName), source: sources.firstName },
    { label: "Apellido", value: form.lastName, required: true, missing: !isFilledReviewValue(form.lastName), source: sources.lastName },
    {
      label: "Fecha de nacimiento",
      value: form.dateOfBirth,
      required: true,
      missing: !isFilledReviewValue(form.dateOfBirth),
      source: sources.dateOfBirth,
    },
    { label: "Nacionalidad", value: form.nationality, required: false, missing: !isFilledReviewValue(form.nationality), source: sources.nationality },
  ];

  const decisionChecklist: ReviewChecklistItem[] = [
    {
      label: "Numero de documento",
      value: form.documentNumber,
      required: false,
      missing: !isFilledReviewValue(form.documentNumber),
      source: sources.documentNumber,
    },
    { label: "Nombre", value: form.firstName, required: false, missing: !isFilledReviewValue(form.firstName), source: sources.firstName },
    { label: "Apellido", value: form.lastName, required: false, missing: !isFilledReviewValue(form.lastName), source: sources.lastName },
    { label: "Fecha de expedicion", value: form.issueDate, required: false, missing: !isFilledReviewValue(form.issueDate), source: sources.issueDate },
    { label: "Fecha de expiracion", value: form.expiryDate, required: false, missing: !isFilledReviewValue(form.expiryDate), source: sources.expiryDate },
  ];

  let items: ReviewChecklistItem[] = [];
  if (form.type === "PASSPORT") items = passportChecklist;
  else if (form.type === "KARTA_POBYTU") items = kartaChecklist;
  else if (form.type === "PESEL") items = peselChecklist;
  else if (form.type === "DECYZJA_WOJEWODY") items = decisionChecklist;
  else {
    items = [
      {
        label: "Numero de documento",
        value: form.documentNumber,
        required: false,
        missing: !isFilledReviewValue(form.documentNumber),
        source: sources.documentNumber,
      },
      { label: "Nombre", value: form.firstName, required: false, missing: !isFilledReviewValue(form.firstName), source: sources.firstName },
      { label: "Apellido", value: form.lastName, required: false, missing: !isFilledReviewValue(form.lastName), source: sources.lastName },
    ];
  }

  return {
    items,
    missingRequired: items.filter((item) => item.required && item.missing),
    filledRequired: items.filter((item) => item.required && !item.missing),
  };
}

function deriveInitialState(
  doc: ReviewableDocument,
  allDocuments: ReviewableDocument[],
  candidateDefaults?: CandidateDefaults,
): ManualReviewState {
  const extracted = getExtractedData(doc.extractedData);
  const rawTextFallbackResult = inferFromRawText(getRawText(extracted), doc.type);
  const rawTextFallback = rawTextFallbackResult.values;
  const rawTextSources = rawTextFallbackResult.sources;
  const siblingFallback = getSiblingDocumentFallback(doc, allDocuments);
  const fileName = getReviewableDocumentName(doc);
  const inferredType = inferDocumentTypeFromFileName(fileName);
  const inferredDocumentNumber = inferDocumentNumberFromFileName(fileName);
  const inferredNameParts = inferNamePartsFromFileName(fileName);
  const extractedDocumentType = canonicalizeDocumentType(asString(extracted.documentType));
  const fallbackDocumentNumber =
    normalizeFallbackText(candidateDefaults?.passportNumber) ||
    normalizeFallbackText(candidateDefaults?.kartaPobytuNumber) ||
    normalizeFallbackText(candidateDefaults?.peselNumber) ||
    "";
  const initialType = canonicalizeDocumentType(
    doc.type && doc.type !== "OTHER" ? doc.type : extractedDocumentType || inferredType,
  );
  const currentDisposition = getDocumentDisposition(doc);
  const isKartaBack = initialType === "KARTA_POBYTU" && currentDisposition === "BACK";

  const documentNumberCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.documentNumber), source: "OCR" },
    { value: doc.number, source: "RECORD" },
    {
      value: shouldUseCandidateIdentityFallback(initialType) ? fallbackDocumentNumber : "",
      source: "CANDIDATE",
    },
    { value: rawTextFallback.documentNumber, source: rawTextSources.documentNumber ?? "OCR" },
    {
      value: shouldUseCandidateIdentityFallback(initialType) ? inferredDocumentNumber : "",
      source: "FILE",
    },
  );

  const personalNumberCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.personalNumber), source: "OCR" },
    { value: rawTextFallback.personalNumber, source: rawTextSources.personalNumber ?? "OCR" },
    { value: siblingFallback?.personalNumber, source: "RECORD" },
    {
      value:
        initialType === "PESEL"
          ? normalizeFallbackText(candidateDefaults?.peselNumber)
          : "",
      source: "CANDIDATE",
    },
    {
      value: initialType === "PESEL" && /^\d{11}$/.test(inferredDocumentNumber) ? inferredDocumentNumber : "",
      source: "FILE",
    },
  );

  const firstNameCandidates =
    isKartaBack
      ? [
          { value: siblingFallback?.firstName, source: "RECORD" as const },
          { value: asString(extracted.firstName), source: "OCR" as const },
          { value: rawTextFallback.firstName, source: (rawTextSources.firstName ?? "MRZ") as FieldSource },
        ]
      : !shouldUseCandidateIdentityFallback(initialType)
      ? [
          { value: rawTextFallback.firstName, source: (rawTextSources.firstName ?? "MRZ") as FieldSource },
          { value: asString(extracted.firstName), source: "OCR" as const },
          { value: siblingFallback?.firstName, source: "RECORD" as const },
        ]
      : [
          { value: asString(extracted.firstName), source: "OCR" as const },
          { value: rawTextFallback.firstName, source: (rawTextSources.firstName ?? "OCR") as FieldSource },
          { value: normalizeFallbackText(candidateDefaults?.firstName), source: "CANDIDATE" as const },
          { value: inferredNameParts?.firstName ?? "", source: "FILE" as const },
        ];

  const firstNameCandidate = pickPreferredTextCandidateWithSource(
    initialType === "PASSPORT"
      ? ["OCR", "MRZ", "FILE", "RECORD", "MANUAL"]
      : isKartaBack
        ? ["RECORD", "OCR", "MRZ", "MANUAL"]
      : ["MRZ", "OCR", "CANDIDATE", "FILE", "RECORD", "MANUAL"],
    ...firstNameCandidates,
  );
  const normalizedFirstNameCandidate =
    initialType === "PASSPORT"
      ? {
          value: sanitizePassportFirstNameCandidate(firstNameCandidate.value),
          source: firstNameCandidate.source,
        }
      : firstNameCandidate;

  const passportFirstNameHints =
    initialType === "PASSPORT"
      ? [
          normalizedFirstNameCandidate.value,
          asString(extracted.firstName),
          rawTextFallback.firstName,
          candidateDefaults?.firstName,
          inferredNameParts?.firstName,
        ]
      : [];

  const lastNameCandidates =
    isKartaBack
      ? [
          { value: siblingFallback?.lastName, source: "RECORD" as const },
          {
            value: asString(extracted.lastName),
            source: "OCR" as const,
          },
          {
            value: rawTextFallback.lastName,
            source: (rawTextSources.lastName ?? "OCR") as FieldSource,
          },
        ]
      : !shouldUseCandidateIdentityFallback(initialType)
      ? [
          {
            value: asString(extracted.lastName),
            source: "OCR" as const,
          },
          {
            value: rawTextFallback.lastName,
            source: (rawTextSources.lastName ?? "OCR") as FieldSource,
          },
          { value: siblingFallback?.lastName, source: "RECORD" as const },
        ]
      : [
          { value: asString(extracted.lastName), source: "OCR" as const },
          { value: rawTextFallback.lastName, source: (rawTextSources.lastName ?? "OCR") as FieldSource },
          { value: normalizeFallbackText(candidateDefaults?.lastName), source: "CANDIDATE" as const },
          { value: inferredNameParts?.lastName ?? "", source: "FILE" as const },
        ];

  const rawLastNameCandidate =
    initialType === "PASSPORT"
      ? pickPassportLastNameCandidateWithSource(
          lastNameCandidates,
          ...passportFirstNameHints,
        )
      : isKartaBack
        ? pickPreferredTextCandidateWithSource(["RECORD", "OCR", "MRZ", "MANUAL"], ...lastNameCandidates)
      : pickBestTextCandidateWithSource(...lastNameCandidates);
  const lastNameCandidate =
    initialType === "PASSPORT" && shouldUseCandidateIdentityFallback(initialType)
      ? restoreNameSpacingFromFileCandidate(rawLastNameCandidate, inferredNameParts?.lastName)
      : rawLastNameCandidate;

  const nationalityCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.nationality), source: "OCR" },
    { value: rawTextFallback.nationality, source: rawTextSources.nationality ?? "MRZ" },
    { value: siblingFallback?.nationality, source: "RECORD" },
    {
      value: shouldUseCandidateIdentityFallback(initialType)
        ? normalizeFallbackText(candidateDefaults?.nationality)
        : "",
      source: "CANDIDATE",
    },
  );

  const issuingCountryCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.issuingCountry), source: "OCR" },
    { value: rawTextFallback.issuingCountry, source: rawTextSources.issuingCountry ?? "MRZ" },
    { value: siblingFallback?.issuingCountry, source: "RECORD" },
    {
      value: shouldUseCandidateIdentityFallback(initialType)
        ? normalizeFallbackText(candidateDefaults?.citizenship)
        : "",
      source: "CANDIDATE",
    },
  );

  const dateOfBirthCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.dateOfBirth), source: "OCR" },
    { value: rawTextFallback.dateOfBirth, source: rawTextSources.dateOfBirth ?? "MRZ" },
    { value: siblingFallback?.dateOfBirth, source: "RECORD" },
    {
      value: shouldUseCandidateIdentityFallback(initialType)
        ? toDateInputValue(candidateDefaults?.dateOfBirth)
        : "",
      source: "CANDIDATE",
    },
  );

  const issueDateCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.dateOfIssue), source: "OCR" },
    { value: rawTextFallback.issueDate, source: rawTextSources.issueDate ?? "OCR" },
    { value: siblingFallback?.issueDate, source: "RECORD" },
    { value: toDateInputValue(doc.issueDate), source: "RECORD" },
    {
      value: shouldUseCandidateIdentityFallback(initialType)
        ? toDateInputValue(candidateDefaults?.passportIssueDate)
        : "",
      source: "CANDIDATE",
    },
    {
      value: shouldUseCandidateIdentityFallback(initialType)
        ? toDateInputValue(candidateDefaults?.kartaPobytuIssueDate)
        : "",
      source: "CANDIDATE",
    },
  );

  const expiryDateCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.dateOfExpiry), source: "OCR" },
    { value: rawTextFallback.expiryDate, source: rawTextSources.expiryDate ?? "MRZ" },
    { value: siblingFallback?.expiryDate, source: "RECORD" },
    { value: toDateInputValue(doc.expiryDate), source: "RECORD" },
    {
      value: shouldUseCandidateIdentityFallback(initialType)
        ? toDateInputValue(candidateDefaults?.passportExpiry)
        : "",
      source: "CANDIDATE",
    },
    {
      value: shouldUseCandidateIdentityFallback(initialType)
        ? toDateInputValue(candidateDefaults?.kartaPobytuExpiry)
        : "",
      source: "CANDIDATE",
    },
  );

  const placeOfBirthCandidate =
    !shouldUseCandidateIdentityFallback(initialType)
      ? pickBestTextCandidateWithSource(
          { value: asString(extracted.placeOfBirth), source: "OCR" },
          { value: rawTextFallback.placeOfBirth, source: rawTextSources.placeOfBirth ?? "OCR" },
          { value: siblingFallback?.placeOfBirth, source: "RECORD" },
        )
      : pickBestTextCandidateWithSource(
          { value: asString(extracted.placeOfBirth), source: "OCR" },
          { value: rawTextFallback.placeOfBirth, source: rawTextSources.placeOfBirth ?? "OCR" },
          { value: normalizeFallbackText(candidateDefaults?.birthPlace), source: "CANDIDATE" },
        );

  const sexCandidate =
    !shouldUseCandidateIdentityFallback(initialType)
      ? pickPreferredTextCandidateWithSource(
          ["MRZ", "OCR"],
          { value: rawTextFallback.sex, source: rawTextSources.sex ?? "MRZ" },
          { value: asString(extracted.sex), source: "OCR" },
          { value: siblingFallback?.sex, source: "RECORD" },
        )
      : pickBestTextCandidateWithSource(
          { value: asString(extracted.sex), source: "OCR" },
          { value: normalizeFallbackText(candidateDefaults?.gender), source: "CANDIDATE" },
        );

  const issuingAuthorityCandidate =
    !shouldUseCandidateIdentityFallback(initialType)
      ? pickBestTextCandidateWithSource(
          { value: cleanReviewIssuingAuthorityValue(asString(extracted.issuingAuthority)), source: "OCR" },
          {
            value: cleanReviewIssuingAuthorityValue(rawTextFallback.issuingAuthority),
            source: (rawTextSources.issuingAuthority ?? "OCR") as FieldSource,
          },
          { value: cleanReviewIssuingAuthorityValue(siblingFallback?.issuingAuthority), source: "RECORD" },
        )
      : pickBestTextCandidateWithSource(
          { value: cleanReviewIssuingAuthorityValue(asString(extracted.issuingAuthority)), source: "OCR" },
          {
            value: cleanReviewIssuingAuthorityValue(rawTextFallback.issuingAuthority),
            source: (rawTextSources.issuingAuthority ?? "OCR") as FieldSource,
          },
          { value: cleanReviewIssuingAuthorityValue(candidateDefaults?.issuingAuthority), source: "CANDIDATE" },
        );

  const kartaPobytuTypeCandidate = isKartaBack
    ? pickPreferredTextCandidateWithSource(
        ["RECORD", "OCR", "MRZ", "MANUAL"],
        { value: siblingFallback?.kartaPobytuType, source: "RECORD" },
        { value: asString(extracted.kartaPobytuType), source: "OCR" },
        { value: rawTextFallback.kartaPobytuType, source: rawTextSources.kartaPobytuType ?? "MRZ" },
      )
    : shouldUseCandidateIdentityFallback(initialType)
    ? pickBestTextCandidateWithSource(
        { value: asString(extracted.kartaPobytuType), source: "OCR" },
        { value: rawTextFallback.kartaPobytuType, source: rawTextSources.kartaPobytuType ?? "MRZ" },
        { value: siblingFallback?.kartaPobytuType, source: "RECORD" },
        { value: normalizeFallbackText(candidateDefaults?.kartaPobytuType), source: "CANDIDATE" },
      )
    : pickBestTextCandidateWithSource(
        { value: asString(extracted.kartaPobytuType), source: "OCR" },
        { value: rawTextFallback.kartaPobytuType, source: rawTextSources.kartaPobytuType ?? "MRZ" },
        { value: siblingFallback?.kartaPobytuType, source: "RECORD" },
      );

  const addressCandidate = shouldUseCandidateIdentityFallback(initialType)
    ? pickBestTextCandidateWithSource(
        { value: asString(extracted.addressOfRegistration), source: "OCR" },
        { value: normalizeFallbackText(candidateDefaults?.polishAddress), source: "CANDIDATE" },
      )
    : pickBestTextCandidateWithSource({
        value: asString(extracted.addressOfRegistration),
        source: "OCR",
      });

  const resolvedFirstNameCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    normalizedFirstNameCandidate,
    ...firstNameCandidates,
  );
  const resolvedLastNameCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    lastNameCandidate,
    ...lastNameCandidates,
  );
  const resolvedNationalityCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    nationalityCandidate,
    { value: asString(extracted.nationality), source: "OCR" },
    { value: rawTextFallback.nationality, source: rawTextSources.nationality ?? "MRZ" },
  );
  const resolvedIssuingCountryCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    issuingCountryCandidate,
    { value: asString(extracted.issuingCountry), source: "OCR" },
    { value: rawTextFallback.issuingCountry, source: rawTextSources.issuingCountry ?? "MRZ" },
  );
  const resolvedDateOfBirthCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    dateOfBirthCandidate,
    { value: asString(extracted.dateOfBirth), source: "OCR" },
    { value: rawTextFallback.dateOfBirth, source: rawTextSources.dateOfBirth ?? "MRZ" },
  );
  const resolvedSexCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    sexCandidate,
    { value: rawTextFallback.sex, source: rawTextSources.sex ?? "MRZ" },
    { value: asString(extracted.sex), source: "OCR" },
  );
  const resolvedPlaceOfBirthCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    placeOfBirthCandidate,
    { value: asString(extracted.placeOfBirth), source: "OCR" },
    { value: rawTextFallback.placeOfBirth, source: rawTextSources.placeOfBirth ?? "OCR" },
  );
  const resolvedIssuingAuthorityCandidate = stripCandidateFallbackForIdentityDocument(
    initialType,
    issuingAuthorityCandidate,
    { value: cleanReviewIssuingAuthorityValue(asString(extracted.issuingAuthority)), source: "OCR" },
    {
      value: cleanReviewIssuingAuthorityValue(rawTextFallback.issuingAuthority),
      source: (rawTextSources.issuingAuthority ?? "OCR") as FieldSource,
    },
  );
  const remarksCandidate = pickPreferredTextCandidateWithSource(
    ["OCR", "RECORD", "MANUAL"],
    { value: cleanReviewKartaRemarksValue(asString(extracted.remarks)), source: "OCR" },
    { value: cleanReviewKartaRemarksValue(rawTextFallback.remarks), source: rawTextSources.remarks ?? "OCR" },
  );

  return {
    form: {
      type: initialType,
      documentDisposition: asString(extracted.documentDisposition) || "PRIMARY",
      documentNumber: documentNumberCandidate.value,
      personalNumber: personalNumberCandidate.value,
      expiryDate: expiryDateCandidate.value,
      issueDate: issueDateCandidate.value,
      firstName: resolvedFirstNameCandidate.value,
      lastName: resolvedLastNameCandidate.value,
      nationality: resolvedNationalityCandidate.value,
      issuingCountry: resolvedIssuingCountryCandidate.value,
      dateOfBirth: resolvedDateOfBirthCandidate.value,
      sex: resolvedSexCandidate.value,
      placeOfBirth: resolvedPlaceOfBirthCandidate.value,
      issuingAuthority: resolvedIssuingAuthorityCandidate.value,
      passportBiometric:
        asBoolean(extracted.passportBiometric) ||
        (initialType === "PASSPORT" && candidateDefaults?.passportBiometric === true),
      kartaPobytuType: kartaPobytuTypeCandidate.value,
      remarks: remarksCandidate.value,
      municipalityOffice: asString(extracted.municipalityOffice),
      addressOfRegistration: addressCandidate.value,
      heightCm: asNumber(extracted.heightCm),
      ocrError: asString(extracted.ocrError),
      markVerified: false,
    },
    fieldSources: {
      type: extractedDocumentType !== "OTHER" ? "OCR" : inferredType !== "OTHER" ? "FILE" : "RECORD",
      documentDisposition: extracted.documentDisposition ? "OCR" : "MANUAL",
      documentNumber: documentNumberCandidate.source || "RECORD",
      personalNumber: personalNumberCandidate.source || "OCR",
      expiryDate: expiryDateCandidate.source || "RECORD",
      issueDate: issueDateCandidate.source || "RECORD",
      firstName: resolvedFirstNameCandidate.source || "OCR",
      lastName: resolvedLastNameCandidate.source || "OCR",
      nationality: resolvedNationalityCandidate.source || "OCR",
      issuingCountry: resolvedIssuingCountryCandidate.source || "OCR",
      dateOfBirth: resolvedDateOfBirthCandidate.source || "OCR",
      sex: resolvedSexCandidate.source || "OCR",
      placeOfBirth: resolvedPlaceOfBirthCandidate.source || "OCR",
      issuingAuthority: resolvedIssuingAuthorityCandidate.source || "OCR",
      passportBiometric: extracted.passportBiometric ? "OCR" : "MANUAL",
      kartaPobytuType: kartaPobytuTypeCandidate.source || "OCR",
      remarks: remarksCandidate.source || "RECORD",
      municipalityOffice: extracted.municipalityOffice ? "OCR" : "RECORD",
      addressOfRegistration: addressCandidate.source || "OCR",
      heightCm: extracted.heightCm ? "OCR" : "RECORD",
      ocrError: extracted.ocrError ? "OCR" : "RECORD",
      markVerified: "MANUAL",
    },
  };
}

export default function DocumentReviewModal({
  doc,
  allDocuments = [],
  candidateDefaults,
}: {
  doc: ReviewableDocument;
  allDocuments?: ReviewableDocument[];
  candidateDefaults?: CandidateDefaults;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const initialState = useMemo(() => deriveInitialState(doc, allDocuments, candidateDefaults), [allDocuments, candidateDefaults, doc]);
  const duplicateContext = useMemo(() => buildDuplicateContext(doc, allDocuments), [allDocuments, doc]);
  const suggestedDispositionOptions = useMemo(
    () => getSuggestedDispositionOptions(duplicateContext),
    [duplicateContext],
  );
  const [form, setForm] = useState(initialState.form);
  const [fieldSources, setFieldSources] = useState(initialState.fieldSources);
  const [errorMessage, setErrorMessage] = useState("");
  const isManualReviewDocument = doc.ocrStatus === "FAILED" || isManualReviewOcrStatus(doc.ocrStatus);
  const reviewChecklist = useMemo(() => buildManualReviewChecklist(form, fieldSources), [fieldSources, form]);
  const reviewSignalSources = useMemo(() => {
    const excludedKeys = new Set(["type", "documentDisposition", "markVerified", "ocrError"]);
    return Object.fromEntries(
      Object.entries(fieldSources).filter(([key]) => !excludedKeys.has(key)),
    ) as Partial<Record<ReviewFieldKey, FieldSource>>;
  }, [fieldSources]);
  const sourceSummary = useMemo(() => {
    const counts: Record<FieldSource, number> = {
      OCR: 0,
      MRZ: 0,
      CANDIDATE: 0,
      FILE: 0,
      RECORD: 0,
      MANUAL: 0,
    };

    const hasMeaningfulValue = (key: ReviewFieldKey) => {
      const value = form[key];
      if (typeof value === "boolean") {
        return value;
      }
      return isFilledReviewValue(value);
    };

    for (const [key, value] of Object.entries(reviewSignalSources) as Array<[ReviewFieldKey, FieldSource]>) {
      if (!(value in counts)) {
        continue;
      }

      if (!hasMeaningfulValue(key)) {
        continue;
      }

      counts[value] += 1;
    }

    return counts;
  }, [form, reviewSignalSources]);
  const autoFilledCount =
    sourceSummary.OCR + sourceSummary.MRZ + sourceSummary.CANDIDATE + sourceSummary.FILE + sourceSummary.RECORD;
  const manualCount = sourceSummary.MANUAL;
  const totalTrackedFields = autoFilledCount + manualCount;
  const autofillCoverage = totalTrackedFields > 0 ? Math.round((autoFilledCount / totalTrackedFields) * 100) : 0;
  const coverageLabel =
    autofillCoverage >= 80 ? "Alta" : autofillCoverage >= 50 ? "Media" : autofillCoverage > 0 ? "Baja" : "Sin datos";

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldSources((prev) => ({ ...prev, [key]: "MANUAL" as FieldSource }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setErrorMessage("");
      try {
        const response = await fetch("/api/documents/review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: doc.id,
            type: form.type as
              | "PASSPORT"
              | "KARTA_POBYTU"
              | "PESEL"
              | "DECYZJA_WOJEWODY"
              | "CV"
              | "OTHER",
            documentDisposition: form.documentDisposition,
            documentNumber: form.documentNumber,
            personalNumber: form.personalNumber,
            expiryDate: form.expiryDate,
            issueDate: form.issueDate,
            firstName: form.firstName,
            lastName: form.lastName,
            nationality: form.nationality,
            issuingCountry: form.issuingCountry,
            dateOfBirth: form.dateOfBirth,
            sex: form.sex,
            placeOfBirth: form.placeOfBirth,
            issuingAuthority: form.issuingAuthority,
            passportBiometric: form.passportBiometric,
            kartaPobytuType: form.kartaPobytuType,
            remarks: form.remarks,
            municipalityOffice: form.municipalityOffice,
            addressOfRegistration: form.addressOfRegistration,
            heightCm: form.heightCm ? Number.parseInt(form.heightCm, 10) : undefined,
            markVerified: form.markVerified,
          }),
        });

        const result = await parseReviewResponse(response);

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Error al guardar la revision");
        }

        setIsOpen(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(normalizeReviewErrorMessage(error));
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="button button-outline"
        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
        onClick={() => {
          setForm(initialState.form);
          setFieldSources(initialState.fieldSources);
          setErrorMessage("");
          setIsOpen(true);
        }}
      >
        <PencilLine size={14} /> {isManualReviewDocument ? "Revisar manual" : "Revisar OCR"}
      </button>

      {isOpen ? (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel card"
            style={{ maxWidth: "720px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="icon-button"
              style={{ position: "absolute", right: "1rem", top: "1rem" }}
            >
              <X size={20} />
            </button>

            <h2 style={{ marginBottom: "0.5rem", paddingRight: "3rem" }}>
              {isManualReviewDocument ? "Revision manual del documento" : "Revision OCR"}
            </h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.25rem", fontSize: "0.875rem" }}>
              {isManualReviewDocument
                ? "Completa o corrige los datos manualmente y guarda la version confiable del documento."
                : "Corrige los campos detectados y guarda la version confiable del documento."}
            </p>
            <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: "0.8rem" }}>
              Guardar esta revision actualiza el documento y la ficha del candidato con los datos confirmados.
            </p>
            {isManualReviewDocument ? (
              <div
                style={{
                  marginBottom: "1rem",
                  border: "1px solid #f59e0b",
                  background: "#fffbeb",
                  padding: "0.85rem 1rem",
                  color: "#92400e",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Documento guardado y pendiente de revision manual antes de consolidar los datos.
              </div>
            ) : null}
            {form.ocrError ? (
              <p className="form-message-error" style={{ marginBottom: "1rem" }}>
                La lectura automatica no pudo completar este documento: {form.ocrError}
              </p>
            ) : null}
            {duplicateContext ? (
              <div
                style={{
                  marginBottom: "1rem",
                  border: "1px solid #f59e0b",
                  background: "#fffbeb",
                  padding: "0.85rem 1rem",
                }}
              >
                <p style={{ margin: 0, fontWeight: 800 }}>
                  Duplicado detectado: {duplicateContext.type}
                  {duplicateContext.number ? ` (${duplicateContext.number})` : ""} x{duplicateContext.count}
                </p>
                <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontSize: "0.875rem" }}>
                  {duplicateContext.suggestion}
                </p>
                {suggestedDispositionOptions.length > 0 ? (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                    {suggestedDispositionOptions.map((option) => {
                      const isActive = form.documentDisposition === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className="button button-secondary"
                          style={{
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.75rem",
                            backgroundColor: isActive ? "var(--primary)" : "var(--background)",
                          }}
                          onClick={() => setField("documentDisposition", option.value)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 800 }}>
                    Otros documentos del grupo
                  </p>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {duplicateContext.matchingDocuments.map((matchingDoc) => {
                      const isCurrent = matchingDoc.id === doc.id;
                      const dispositionLabel =
                        getDocumentDispositionLabel(getDocumentDisposition(matchingDoc)) || "Sin clasificar";

                      return (
                        <div
                          key={matchingDoc.id}
                          style={{
                            border: "1px solid #fcd34d",
                            background: isCurrent ? "#fff7ed" : "var(--background)",
                            padding: "0.55rem 0.75rem",
                            display: "grid",
                            gap: "0.2rem",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                            <span style={{ fontSize: "0.76rem", fontWeight: 800, lineHeight: 1.35 }}>
                              {getReviewableDocumentName(matchingDoc)}
                            </span>
                            {isCurrent ? (
                              <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "#9a3412" }}>
                                Documento actual
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.4 }}>
                            {dispositionLabel} · {getReviewableDocumentStatus(matchingDoc)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div
              style={{
                marginBottom: "1rem",
                border: "1px solid #e5e7eb",
                background: "#fafafa",
                padding: "0.85rem 1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                <p style={{ margin: 0, fontWeight: 800 }}>Checklist de revision</p>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#6b7280" }}>
                  {reviewChecklist.filledRequired.length}/{reviewChecklist.items.filter((item) => item.required).length} campos clave
                </span>
              </div>
              {reviewChecklist.missingRequired.length > 0 ? (
                <p style={{ margin: "0.35rem 0 0.75rem", color: "#b45309", fontSize: "0.85rem", fontWeight: 700 }}>
                  Revisa primero los campos marcados como pendientes antes de guardar la version final.
                </p>
              ) : (
                <p style={{ margin: "0.35rem 0 0.75rem", color: "#15803d", fontSize: "0.85rem", fontWeight: 700 }}>
                  Los campos clave ya tienen valor. Puedes guardar la revision con mayor confianza.
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.28rem 0.55rem",
                    borderRadius: "999px",
                    border: "1px solid #86efac",
                    background: "#ecfdf5",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#166534",
                  }}
                >
                  Clave completos
                  <span style={{ fontWeight: 900 }}>{reviewChecklist.filledRequired.length}</span>
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.28rem 0.55rem",
                    borderRadius: "999px",
                    border: "1px solid #fbbf24",
                    background: "#fffbeb",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#92400e",
                  }}
                >
                  Clave pendientes
                  <span style={{ fontWeight: 900 }}>{reviewChecklist.missingRequired.length}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
                <SourceBadge source="OCR" />
                <SourceBadge source="MRZ" />
                <SourceBadge source="CANDIDATE" />
                <SourceBadge source="FILE" />
                <SourceBadge source="RECORD" />
                <SourceBadge source="MANUAL" />
              </div>
              <p style={{ margin: "0 0 0.85rem", color: "#6b7280", fontSize: "0.78rem", fontWeight: 700 }}>
                {manualCount > 0 || reviewChecklist.missingRequired.length > 0
                  ? "Empieza por los campos manuales y pendientes para cerrar la revision mas rapido."
                  : "La revision ya viene muy completa y deberia cerrarse sin mucho esfuerzo."}
              </p>
              <p style={{ margin: "0 0 0.85rem", color: "#6b7280", fontSize: "0.8rem", fontWeight: 700 }}>
                {autoFilledCount > 0
                  ? `Auto completados: ${autoFilledCount}.`
                  : "La revision llega sin autocompletado visible."}{" "}
                {manualCount > 0
                  ? `${manualCount} campos ya fueron tocados manualmente.`
                  : "Todavia no has modificado campos en este formulario."}
              </p>
              <div
                style={{
                  marginBottom: "0.85rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "10px",
                  background: autofillCoverage >= 80 ? "#ecfdf5" : autofillCoverage >= 50 ? "#fffbeb" : "#fff7ed",
                  border: "1px solid",
                  borderColor: autofillCoverage >= 80 ? "#86efac" : autofillCoverage >= 50 ? "#fbbf24" : "#fdba74",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#374151" }}>
                  Cobertura automatica
                </span>
                <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#374151" }}>
                  {autofillCoverage}% · {coverageLabel}
                </span>
              </div>
              <div
                style={{
                  marginBottom: "0.85rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "10px",
                  background:
                    autofillCoverage >= 80 ? "#f0fdf4" : autofillCoverage >= 50 ? "#fffbeb" : "#fff7ed",
                  border: "1px solid",
                  borderColor: autofillCoverage >= 80 ? "#86efac" : autofillCoverage >= 50 ? "#fbbf24" : "#fdba74",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#374151" }}>
                  Estado de revision
                </span>
                <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#374151" }}>
                  {autofillCoverage >= 80
                    ? "Casi lista para guardar"
                    : autofillCoverage >= 50
                      ? "Requiere un repaso corto"
                      : "Todavia necesita bastante ajuste"}
                </span>
              </div>
              <div
                style={{
                  marginBottom: "0.85rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "10px",
                  background: manualCount > 0 || reviewChecklist.missingRequired.length > 0 ? "#fff7ed" : "#ecfdf5",
                  border: "1px solid",
                  borderColor: manualCount > 0 || reviewChecklist.missingRequired.length > 0 ? "#fdba74" : "#86efac",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#374151" }}>
                  Siguiente paso
                </span>
                <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#374151" }}>
                  {manualCount > 0 || reviewChecklist.missingRequired.length > 0
                    ? "Completa primero los campos pendientes y revisa con cuidado los ya tocados manualmente."
                    : "Puedes guardar la revision ahora mismo."}
                </span>
              </div>
              <div
                style={{
                  marginBottom: "0.85rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#374151" }}>
                  Resumen rapido
                </span>
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#374151" }}>
                  Auto {autoFilledCount} · Manual {manualCount} · Pendientes clave {reviewChecklist.missingRequired.length}
                </span>
              </div>
              <p style={{ margin: "0 0 0.85rem", color: "#374151", fontSize: "0.78rem", fontWeight: 700 }}>
                {reviewChecklist.missingRequired.length > 0
                  ? `Todavia faltan ${reviewChecklist.missingRequired.length} campos clave.`
                  : manualCount > 0
                    ? "La base ya esta completa y solo quedan ajustes manuales finos."
                    : "La revision ya esta lista para guardar."}
              </p>
              <p style={{ margin: "0 0 0.85rem", color: "#6b7280", fontSize: "0.78rem", fontWeight: 700 }}>
                {manualCount > 0
                  ? `${manualCount} campos ya quedaron ajustados manualmente.`
                  : "No quedan campos marcados como manual en esta revision."}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.85rem" }}>
                {Object.entries(sourceSummary).map(([source, count]) => {
                  if (count === 0) return null;

                  return (
                    <div
                      key={source}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.22rem 0.5rem",
                        borderRadius: "999px",
                        background: "white",
                        border: "1px solid #e5e7eb",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        color: "#374151",
                      }}
                    >
                      <SourceBadge source={source as FieldSource} />
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {reviewChecklist.items.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      alignItems: "center",
                      padding: "0.45rem 0.65rem",
                      border: "1px solid #e5e7eb",
                      background: item.missing ? "#fff7ed" : "#ecfdf5",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{item.label}</span>
                      {item.required ? (
                        <span style={{ fontSize: "0.64rem", fontWeight: 900, color: "#b45309" }}>CLAVE</span>
                      ) : (
                        <span style={{ fontSize: "0.64rem", fontWeight: 900, color: "#6b7280" }}>OPCIONAL</span>
                      )}
                      {item.source ? <SourceBadge source={item.source} /> : null}
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: item.missing ? "#b45309" : "#15803d" }}>
                      {item.missing ? "Pendiente" : item.value || "OK"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="compact-stack">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Tipo</label>
                <select className="select" value={form.type} onChange={(e) => setField("type", e.target.value)}>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="KARTA_POBYTU">Karta Pobytu</option>
                  <option value="PESEL">PESEL</option>
                  <option value="DECYZJA_WOJEWODY">Decyzja Wojewody</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">
                  {canonicalizeDocumentType(form.type) === "KARTA_POBYTU" ? "Cara del documento" : "Clasificacion"}
                </label>
                <select
                  className="select"
                  value={form.documentDisposition}
                  onChange={(e) => setField("documentDisposition", e.target.value)}
                >
                  <option value="PRIMARY">
                    {canonicalizeDocumentType(form.type) === "KARTA_POBYTU" ? "Cara principal (frente)" : "Principal"}
                  </option>
                  <option value="FRONT">Frente</option>
                  <option value="BACK">
                    {canonicalizeDocumentType(form.type) === "KARTA_POBYTU" ? "Cara secundaria (reverso)" : "Reverso"}
                  </option>
                  <option value="SUPPORTING">Soporte</option>
                  <option value="DUPLICATE">Duplicado</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem" }}>
                <Field label="Numero de documento" source={fieldSources.documentNumber} value={form.documentNumber} onChange={(value) => setField("documentNumber", value)} />
                <Field
                  label={
                    canonicalizeDocumentType(form.type) === "PASSPORT"
                      ? "Numero personal / Personal No."
                      : canonicalizeDocumentType(form.type) === "PESEL"
                        ? "PESEL"
                        : "PESEL / Numero personal"
                  }
                  source={fieldSources.personalNumber}
                  value={form.personalNumber}
                  onChange={(value) => setField("personalNumber", value)}
                />
                <Field label="Fecha de expedicion" source={fieldSources.issueDate} type="date" value={form.issueDate} onChange={(value) => setField("issueDate", value)} />
                <Field label="Fecha de vencimiento" source={fieldSources.expiryDate} type="date" value={form.expiryDate} onChange={(value) => setField("expiryDate", value)} />
                <Field label="Nombres" source={fieldSources.firstName} value={form.firstName} onChange={(value) => setField("firstName", value)} />
                <Field label="Apellidos" source={fieldSources.lastName} value={form.lastName} onChange={(value) => setField("lastName", value)} />
                <Field label="Nacionalidad" source={fieldSources.nationality} value={form.nationality} onChange={(value) => setField("nationality", value)} />
                <Field label="Codigo pais / emisor" source={fieldSources.issuingCountry} value={form.issuingCountry} onChange={(value) => setField("issuingCountry", value)} />
                <Field label="Fecha de nacimiento" source={fieldSources.dateOfBirth} type="date" value={form.dateOfBirth} onChange={(value) => setField("dateOfBirth", value)} />
                <Field label="Sexo" source={fieldSources.sex} value={form.sex} onChange={(value) => setField("sex", value)} />
                <Field label="Lugar de nacimiento" source={fieldSources.placeOfBirth} value={form.placeOfBirth} onChange={(value) => setField("placeOfBirth", value)} />
                <Field label="Autoridad emisora" source={fieldSources.issuingAuthority} value={form.issuingAuthority} onChange={(value) => setField("issuingAuthority", value)} />
                <Field label="Tipo de permiso" source={fieldSources.kartaPobytuType} value={form.kartaPobytuType} onChange={(value) => setField("kartaPobytuType", value)} />
                <Field label="Estatura (cm)" source={fieldSources.heightCm} type="number" value={form.heightCm} onChange={(value) => setField("heightCm", value)} />
                <Field label="Oficina / Urzad Gminy" source={fieldSources.municipalityOffice} value={form.municipalityOffice} onChange={(value) => setField("municipalityOffice", value)} />
                <Field label="Observaciones" source={fieldSources.remarks} value={form.remarks} onChange={(value) => setField("remarks", value)} />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Direccion de registro</label>
                <input
                  className="input"
                  value={form.addressOfRegistration}
                  onChange={(e) => setField("addressOfRegistration", e.target.value)}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={form.passportBiometric}
                  onChange={(e) => setField("passportBiometric", e.target.checked)}
                />
                Pasaporte biometrico
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={form.markVerified}
                  onChange={(e) => setField("markVerified", e.target.checked)}
                />
                Marcar documento como verificado
              </label>

              {errorMessage ? <p className="form-message-error">{errorMessage}</p> : null}

              <button type="button" className="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Guardando revision...
                  </>
                ) : (
                  "Guardar revision"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  source,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  source?: FieldSource;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}) {
  const sourceStyle =
    source === "MANUAL"
      ? { backgroundColor: "#fff7ed", borderColor: "#fdba74" }
      : source
        ? { backgroundColor: "#f8fafc", borderColor: "#dbe4ee" }
        : undefined;

  return (
    <div className="input-group" style={{ marginBottom: 0 }}>
      <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <span>{label}</span>
        {source ? <SourceBadge source={source} /> : null}
      </label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={sourceStyle}
      />
    </div>
  );
}

function SourceBadge({ source }: { source: FieldSource }) {
  const labels: Record<FieldSource, string> = {
    OCR: "OCR",
    MRZ: "MRZ",
    CANDIDATE: "Candidato",
    FILE: "Archivo",
    RECORD: "Registro",
    MANUAL: "Manual",
  };

  const colors: Record<FieldSource, { background: string; color: string; border: string }> = {
    OCR: { background: "#e0f2fe", color: "#075985", border: "#7dd3fc" },
    MRZ: { background: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
    CANDIDATE: { background: "#fef3c7", color: "#92400e", border: "#fbbf24" },
    FILE: { background: "#f3f4f6", color: "#374151", border: "#d1d5db" },
    RECORD: { background: "#ecfdf5", color: "#166534", border: "#86efac" },
    MANUAL: { background: "#fff7ed", color: "#c2410c", border: "#fdba74" },
  };

  const style = colors[source];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.12rem 0.4rem",
        borderRadius: "999px",
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        fontSize: "0.62rem",
        fontWeight: 900,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
      }}
    >
      {labels[source]}
    </span>
  );
}

