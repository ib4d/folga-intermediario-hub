"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, PencilLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getDocumentDisplayNumber,
  getDocumentDisposition,
  getDocumentDispositionLabel,
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
  placeOfBirth?: string;
  kartaPobytuType?: string;
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

function getSourceLabel(source?: FieldSource): string {
  if (!source) return "";

  switch (source) {
    case "OCR":
      return "OCR";
    case "MRZ":
      return "MRZ";
    case "CANDIDATE":
      return "Candidato";
    case "FILE":
      return "Archivo";
    case "RECORD":
      return "Registro";
    case "MANUAL":
      return "Manual";
    default:
      return "";
  }
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

function normalizeMrzLine(line: string): string {
  return normalizeRawText(line).replace(/\s+/g, "");
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

    fallback.documentNumber = mrzLine2.slice(0, 9).replace(/</g, "") || undefined;
    fallback.dateOfBirth = parseMrzDate(mrzLine2.slice(13, 19));
    fallback.expiryDate = parseMrzDate(mrzLine2.slice(21, 27));
    fallback.nationality = mrzLine2.slice(10, 13).replace(/</g, "").trim() || undefined;
    fallback.issuingCountry = mrzLine1.slice(2, 5).replace(/</g, "").trim() || undefined;
    fallback.firstName = firstName || undefined;
    fallback.lastName = lastName || undefined;
    sources.documentNumber = "MRZ";
    sources.dateOfBirth = "MRZ";
    sources.expiryDate = "MRZ";
    sources.nationality = "MRZ";
    sources.issuingCountry = "MRZ";
    sources.firstName = "MRZ";
    sources.lastName = "MRZ";
    return { values: fallback, sources };
  }

  const kartaMrzIndex = lines.findIndex((line) => /^I[A-Z<]?POL/.test(line));
  if (kartaMrzIndex >= 0 && lines[kartaMrzIndex + 2]) {
    const mrzLine1 = lines[kartaMrzIndex];
    const mrzLine2 = lines[kartaMrzIndex + 1] ?? "";
    const mrzLine3 = lines[kartaMrzIndex + 2];

    const documentNumberMatch =
      mrzLine1.match(/^I[A-Z<]?POL([A-Z]{1,3}\d{6,10})/)?.[1] ??
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
    return { values: fallback, sources };
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
    firstName: prettyTokens.slice(2).join(" "),
    lastName: prettyTokens.slice(0, 2).join(" "),
  };
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

function deriveInitialState(doc: ReviewableDocument, candidateDefaults?: CandidateDefaults): ManualReviewState {
  const extracted = getExtractedData(doc.extractedData);
  const rawTextFallbackResult = inferFromRawText(getRawText(extracted), doc.type);
  const rawTextFallback = rawTextFallbackResult.values;
  const rawTextSources = rawTextFallbackResult.sources;
  const fileName = getReviewableDocumentName(doc);
  const inferredType = inferDocumentTypeFromFileName(fileName);
  const inferredDocumentNumber = inferDocumentNumberFromFileName(fileName);
  const inferredNameParts = inferNamePartsFromFileName(fileName);
  const extractedDocumentType = asString(extracted.documentType);
  const fallbackDocumentNumber =
    normalizeFallbackText(candidateDefaults?.passportNumber) ||
    normalizeFallbackText(candidateDefaults?.kartaPobytuNumber) ||
    normalizeFallbackText(candidateDefaults?.peselNumber) ||
    "";
  const initialType =
    doc.type && doc.type !== "OTHER" ? doc.type : extractedDocumentType || inferredType;

  const documentNumberCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.documentNumber), source: "OCR" },
    { value: doc.number, source: "RECORD" },
    { value: fallbackDocumentNumber, source: "CANDIDATE" },
    { value: rawTextFallback.documentNumber, source: rawTextSources.documentNumber ?? "OCR" },
    { value: inferredDocumentNumber, source: "FILE" },
  );

  const personalNumberCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.personalNumber), source: "OCR" },
    { value: rawTextFallback.personalNumber, source: rawTextSources.personalNumber ?? "OCR" },
    { value: normalizeFallbackText(candidateDefaults?.peselNumber), source: "CANDIDATE" },
    {
      value: initialType === "PESEL" && /^\d{11}$/.test(inferredDocumentNumber) ? inferredDocumentNumber : "",
      source: "FILE",
    },
  );

  const firstNameCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.firstName), source: "OCR" },
    { value: rawTextFallback.firstName, source: rawTextSources.firstName ?? "OCR" },
    { value: normalizeFallbackText(candidateDefaults?.firstName), source: "CANDIDATE" },
    { value: inferredNameParts?.firstName ?? "", source: "FILE" },
  );

  const lastNameCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.lastName), source: "OCR" },
    { value: rawTextFallback.lastName, source: rawTextSources.lastName ?? "OCR" },
    { value: normalizeFallbackText(candidateDefaults?.lastName), source: "CANDIDATE" },
    { value: inferredNameParts?.lastName ?? "", source: "FILE" },
  );

  const nationalityCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.nationality), source: "OCR" },
    { value: rawTextFallback.nationality, source: rawTextSources.nationality ?? "MRZ" },
    { value: normalizeFallbackText(candidateDefaults?.nationality), source: "CANDIDATE" },
  );

  const issuingCountryCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.issuingCountry), source: "OCR" },
    { value: rawTextFallback.issuingCountry, source: rawTextSources.issuingCountry ?? "MRZ" },
    { value: normalizeFallbackText(candidateDefaults?.citizenship), source: "CANDIDATE" },
  );

  const dateOfBirthCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.dateOfBirth), source: "OCR" },
    { value: rawTextFallback.dateOfBirth, source: rawTextSources.dateOfBirth ?? "MRZ" },
    { value: toDateInputValue(candidateDefaults?.dateOfBirth), source: "CANDIDATE" },
  );

  const issueDateCandidate = pickBestTextCandidateWithSource(
    { value: toDateInputValue(doc.issueDate), source: "RECORD" },
    { value: toDateInputValue(candidateDefaults?.passportIssueDate), source: "CANDIDATE" },
    { value: toDateInputValue(candidateDefaults?.kartaPobytuIssueDate), source: "CANDIDATE" },
    { value: rawTextFallback.issueDate, source: rawTextSources.issueDate ?? "OCR" },
    { value: asString(extracted.dateOfIssue), source: "OCR" },
  );

  const expiryDateCandidate = pickBestTextCandidateWithSource(
    { value: toDateInputValue(doc.expiryDate), source: "RECORD" },
    { value: toDateInputValue(candidateDefaults?.passportExpiry), source: "CANDIDATE" },
    { value: toDateInputValue(candidateDefaults?.kartaPobytuExpiry), source: "CANDIDATE" },
    { value: rawTextFallback.expiryDate, source: rawTextSources.expiryDate ?? "MRZ" },
    { value: asString(extracted.dateOfExpiry), source: "OCR" },
  );

  const placeOfBirthCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.placeOfBirth), source: "OCR" },
    { value: rawTextFallback.placeOfBirth, source: rawTextSources.placeOfBirth ?? "OCR" },
    { value: normalizeFallbackText(candidateDefaults?.birthPlace), source: "CANDIDATE" },
  );

  const kartaPobytuTypeCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.kartaPobytuType), source: "OCR" },
    { value: rawTextFallback.kartaPobytuType, source: rawTextSources.kartaPobytuType ?? "MRZ" },
    { value: normalizeFallbackText(candidateDefaults?.kartaPobytuType), source: "CANDIDATE" },
  );

  const addressCandidate = pickBestTextCandidateWithSource(
    { value: asString(extracted.addressOfRegistration), source: "OCR" },
    { value: normalizeFallbackText(candidateDefaults?.polishAddress), source: "CANDIDATE" },
  );

  return {
    form: {
      type: initialType,
      documentDisposition: asString(extracted.documentDisposition) || "PRIMARY",
      documentNumber: documentNumberCandidate.value,
      personalNumber: personalNumberCandidate.value,
      expiryDate: expiryDateCandidate.value,
      issueDate: issueDateCandidate.value,
      firstName: firstNameCandidate.value,
      lastName: lastNameCandidate.value,
      nationality: nationalityCandidate.value,
      issuingCountry: issuingCountryCandidate.value,
      dateOfBirth: dateOfBirthCandidate.value,
      sex: asString(extracted.sex) || normalizeFallbackText(candidateDefaults?.gender),
      placeOfBirth: placeOfBirthCandidate.value,
      issuingAuthority: asString(extracted.issuingAuthority),
      passportBiometric: asBoolean(extracted.passportBiometric) || candidateDefaults?.passportBiometric === true,
      kartaPobytuType: kartaPobytuTypeCandidate.value,
      remarks: asString(extracted.remarks),
      municipalityOffice: asString(extracted.municipalityOffice),
      addressOfRegistration: addressCandidate.value,
      heightCm: asNumber(extracted.heightCm),
      ocrError: asString(extracted.ocrError),
      markVerified: false,
    },
    fieldSources: {
      type: extractedDocumentType ? "OCR" : inferredType !== "OTHER" ? "FILE" : "RECORD",
      documentDisposition: extracted.documentDisposition ? "OCR" : "MANUAL",
      documentNumber: documentNumberCandidate.source || "RECORD",
      personalNumber: personalNumberCandidate.source || "OCR",
      expiryDate: expiryDateCandidate.source || "RECORD",
      issueDate: issueDateCandidate.source || "RECORD",
      firstName: firstNameCandidate.source || "OCR",
      lastName: lastNameCandidate.source || "OCR",
      nationality: nationalityCandidate.source || "OCR",
      issuingCountry: issuingCountryCandidate.source || "OCR",
      dateOfBirth: dateOfBirthCandidate.source || "OCR",
      sex: extracted.sex ? "OCR" : "CANDIDATE",
      placeOfBirth: placeOfBirthCandidate.source || "OCR",
      issuingAuthority: extracted.issuingAuthority ? "OCR" : "RECORD",
      passportBiometric: extracted.passportBiometric ? "OCR" : "CANDIDATE",
      kartaPobytuType: kartaPobytuTypeCandidate.source || "OCR",
      remarks: extracted.remarks ? "OCR" : "RECORD",
      municipalityOffice: extracted.municipalityOffice ? "OCR" : "RECORD",
      addressOfRegistration: addressCandidate.source || "CANDIDATE",
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
  const initialState = useMemo(() => deriveInitialState(doc, candidateDefaults), [doc, candidateDefaults]);
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
  const sourceSummary = useMemo(() => {
    const counts: Record<FieldSource, number> = {
      OCR: 0,
      MRZ: 0,
      CANDIDATE: 0,
      FILE: 0,
      RECORD: 0,
      MANUAL: 0,
    };

    for (const value of Object.values(fieldSources)) {
      if (value in counts) {
        counts[value as FieldSource] += 1;
      }
    }

    return counts;
  }, [fieldSources]);
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

        const result = (await response.json()) as { success?: boolean; message?: string };

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
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
                <SourceBadge source="OCR" />
                <SourceBadge source="MRZ" />
                <SourceBadge source="CANDIDATE" />
                <SourceBadge source="FILE" />
                <SourceBadge source="RECORD" />
                <SourceBadge source="MANUAL" />
              </div>
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
              <p style={{ margin: "0 0 0.85rem", color: "#6b7280", fontSize: "0.78rem", fontWeight: 700 }}>
                {manualCount > 0
                  ? `${manualCount} campos siguen dependiendo de ajuste manual.`
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
                <label className="label">Clasificacion</label>
                <select
                  className="select"
                  value={form.documentDisposition}
                  onChange={(e) => setField("documentDisposition", e.target.value)}
                >
                  <option value="PRIMARY">Principal</option>
                  <option value="FRONT">Frente</option>
                  <option value="BACK">Reverso</option>
                  <option value="SUPPORTING">Soporte</option>
                  <option value="DUPLICATE">Duplicado</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem" }}>
                <Field label="Numero de documento" source={getSourceLabel(fieldSources.documentNumber)} value={form.documentNumber} onChange={(value) => setField("documentNumber", value)} />
                <Field label="Numero personal / PESEL" source={getSourceLabel(fieldSources.personalNumber)} value={form.personalNumber} onChange={(value) => setField("personalNumber", value)} />
                <Field label="Fecha de expedicion" source={getSourceLabel(fieldSources.issueDate)} type="date" value={form.issueDate} onChange={(value) => setField("issueDate", value)} />
                <Field label="Fecha de vencimiento" source={getSourceLabel(fieldSources.expiryDate)} type="date" value={form.expiryDate} onChange={(value) => setField("expiryDate", value)} />
                <Field label="Nombres" source={getSourceLabel(fieldSources.firstName)} value={form.firstName} onChange={(value) => setField("firstName", value)} />
                <Field label="Apellidos" source={getSourceLabel(fieldSources.lastName)} value={form.lastName} onChange={(value) => setField("lastName", value)} />
                <Field label="Nacionalidad" source={getSourceLabel(fieldSources.nationality)} value={form.nationality} onChange={(value) => setField("nationality", value)} />
                <Field label="Codigo pais / emisor" source={getSourceLabel(fieldSources.issuingCountry)} value={form.issuingCountry} onChange={(value) => setField("issuingCountry", value)} />
                <Field label="Fecha de nacimiento" source={getSourceLabel(fieldSources.dateOfBirth)} type="date" value={form.dateOfBirth} onChange={(value) => setField("dateOfBirth", value)} />
                <Field label="Sexo" source={getSourceLabel(fieldSources.sex)} value={form.sex} onChange={(value) => setField("sex", value)} />
                <Field label="Lugar de nacimiento" source={getSourceLabel(fieldSources.placeOfBirth)} value={form.placeOfBirth} onChange={(value) => setField("placeOfBirth", value)} />
                <Field label="Autoridad emisora" source={getSourceLabel(fieldSources.issuingAuthority)} value={form.issuingAuthority} onChange={(value) => setField("issuingAuthority", value)} />
                <Field label="Tipo de permiso" source={getSourceLabel(fieldSources.kartaPobytuType)} value={form.kartaPobytuType} onChange={(value) => setField("kartaPobytuType", value)} />
                <Field label="Estatura (cm)" source={getSourceLabel(fieldSources.heightCm)} type="number" value={form.heightCm} onChange={(value) => setField("heightCm", value)} />
                <Field label="Oficina / Urzad Gminy" source={getSourceLabel(fieldSources.municipalityOffice)} value={form.municipalityOffice} onChange={(value) => setField("municipalityOffice", value)} />
                <Field label="Observaciones" source={getSourceLabel(fieldSources.remarks)} value={form.remarks} onChange={(value) => setField("remarks", value)} />
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
  source?: string;
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
        {source ? <SourceBadge source={source as FieldSource} /> : null}
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

