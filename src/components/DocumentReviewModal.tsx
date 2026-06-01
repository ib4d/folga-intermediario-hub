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

type ReviewChecklistItem = {
  label: string;
  value: string;
  required: boolean;
  missing: boolean;
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

function pickBestTextCandidate(...values: Array<string | null | undefined>): string {
  const candidates = values
    .map((value) => normalizeFallbackText(value))
    .filter((value): value is string => Boolean(value));

  if (candidates.length === 0) return "";

  return candidates.sort((left, right) => scoreTextCandidate(right) - scoreTextCandidate(left))[0];
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

function inferFromRawText(rawText: string, docType: string): RawTextFallback {
  if (!rawText) return {};

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeMrzLine(line))
    .filter(Boolean);

  const fallback: RawTextFallback = {};

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
    return fallback;
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
    return fallback;
  }

  if (docType === "PESEL") {
    const normalized = normalizeRawText(rawText);
    const peselMatch = normalized.match(/\b(\d{11})\b/);
    if (peselMatch) fallback.personalNumber = peselMatch[1];

    const labelValue = (labelPatterns: string[]) => {
      for (const line of lines) {
        if (!labelPatterns.some((pattern) => line.includes(pattern))) continue;
        const value = line.replace(new RegExp(`^.*?(?:${labelPatterns.join("|")})\\b[:\\s-]*`), "").trim();
        if (value) return value.replace(/</g, " ").trim();
      }
      return undefined;
    };

    fallback.firstName = labelValue(["IMIE", "IMIONA"]);
    fallback.lastName = labelValue(["NAZWISKO"]);
    fallback.dateOfBirth = labelValue(["DATA URODZENIA"])?.replace(/\./g, "-");
  }

  return fallback;
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

function buildManualReviewChecklist(form: {
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
}) {
  const passportChecklist: ReviewChecklistItem[] = [
    { label: "Numero de documento", value: form.documentNumber, required: true, missing: !isFilledReviewValue(form.documentNumber) },
    { label: "Fecha de expiracion", value: form.expiryDate, required: true, missing: !isFilledReviewValue(form.expiryDate) },
    { label: "Nombre", value: form.firstName, required: true, missing: !isFilledReviewValue(form.firstName) },
    { label: "Apellido", value: form.lastName, required: true, missing: !isFilledReviewValue(form.lastName) },
    { label: "Nacionalidad", value: form.nationality, required: true, missing: !isFilledReviewValue(form.nationality) },
    { label: "Pais emisor", value: form.issuingCountry, required: true, missing: !isFilledReviewValue(form.issuingCountry) },
    { label: "Fecha de nacimiento", value: form.dateOfBirth, required: true, missing: !isFilledReviewValue(form.dateOfBirth) },
    { label: "Pasaporte biometrico", value: form.passportBiometric ? "Si" : "", required: false, missing: !form.passportBiometric },
  ];

  const kartaChecklist: ReviewChecklistItem[] = [
    { label: "Numero de tarjeta", value: form.documentNumber, required: true, missing: !isFilledReviewValue(form.documentNumber) },
    { label: "Fecha de expiracion", value: form.expiryDate, required: true, missing: !isFilledReviewValue(form.expiryDate) },
    { label: "Nombre", value: form.firstName, required: true, missing: !isFilledReviewValue(form.firstName) },
    { label: "Apellido", value: form.lastName, required: true, missing: !isFilledReviewValue(form.lastName) },
    { label: "PESEL", value: form.personalNumber, required: true, missing: !isFilledReviewValue(form.personalNumber) },
    { label: "Tipo de karta", value: form.kartaPobytuType, required: true, missing: !isFilledReviewValue(form.kartaPobytuType) },
    { label: "Nacionalidad", value: form.nationality, required: true, missing: !isFilledReviewValue(form.nationality) },
    { label: "Pais emisor", value: form.issuingCountry, required: true, missing: !isFilledReviewValue(form.issuingCountry) },
    { label: "Fecha de nacimiento", value: form.dateOfBirth, required: true, missing: !isFilledReviewValue(form.dateOfBirth) },
  ];

  const peselChecklist: ReviewChecklistItem[] = [
    { label: "PESEL", value: form.personalNumber, required: true, missing: !isFilledReviewValue(form.personalNumber) },
    { label: "Nombre", value: form.firstName, required: true, missing: !isFilledReviewValue(form.firstName) },
    { label: "Apellido", value: form.lastName, required: true, missing: !isFilledReviewValue(form.lastName) },
    { label: "Fecha de nacimiento", value: form.dateOfBirth, required: true, missing: !isFilledReviewValue(form.dateOfBirth) },
    { label: "Nacionalidad", value: form.nationality, required: false, missing: !isFilledReviewValue(form.nationality) },
  ];

  const decisionChecklist: ReviewChecklistItem[] = [
    { label: "Numero de documento", value: form.documentNumber, required: false, missing: !isFilledReviewValue(form.documentNumber) },
    { label: "Nombre", value: form.firstName, required: false, missing: !isFilledReviewValue(form.firstName) },
    { label: "Apellido", value: form.lastName, required: false, missing: !isFilledReviewValue(form.lastName) },
    { label: "Fecha de expedicion", value: form.issueDate, required: false, missing: !isFilledReviewValue(form.issueDate) },
    { label: "Fecha de expiracion", value: form.expiryDate, required: false, missing: !isFilledReviewValue(form.expiryDate) },
  ];

  let items: ReviewChecklistItem[] = [];
  if (form.type === "PASSPORT") items = passportChecklist;
  else if (form.type === "KARTA_POBYTU") items = kartaChecklist;
  else if (form.type === "PESEL") items = peselChecklist;
  else if (form.type === "DECYZJA_WOJEWODY") items = decisionChecklist;
  else {
    items = [
      { label: "Numero de documento", value: form.documentNumber, required: false, missing: !isFilledReviewValue(form.documentNumber) },
      { label: "Nombre", value: form.firstName, required: false, missing: !isFilledReviewValue(form.firstName) },
      { label: "Apellido", value: form.lastName, required: false, missing: !isFilledReviewValue(form.lastName) },
    ];
  }

  return {
    items,
    missingRequired: items.filter((item) => item.required && item.missing),
    filledRequired: items.filter((item) => item.required && !item.missing),
  };
}

function deriveInitialState(doc: ReviewableDocument, candidateDefaults?: CandidateDefaults) {
  const extracted = getExtractedData(doc.extractedData);
  const rawTextFallback = inferFromRawText(getRawText(extracted), doc.type);
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

  return {
    type: initialType,
    documentDisposition: asString(extracted.documentDisposition) || "PRIMARY",
    documentNumber:
      asString(extracted.documentNumber) ||
      doc.number ||
      fallbackDocumentNumber ||
      rawTextFallback.documentNumber ||
      inferredDocumentNumber,
    personalNumber:
      asString(extracted.personalNumber) ||
      rawTextFallback.personalNumber ||
      normalizeFallbackText(candidateDefaults?.peselNumber) ||
      (initialType === "PESEL" && /^\d{11}$/.test(inferredDocumentNumber) ? inferredDocumentNumber : ""),
    expiryDate:
      toDateInputValue(doc.expiryDate) ||
      toDateInputValue(candidateDefaults?.passportExpiry) ||
      toDateInputValue(candidateDefaults?.kartaPobytuExpiry) ||
      rawTextFallback.expiryDate ||
      asString(extracted.dateOfExpiry),
    issueDate:
      toDateInputValue(doc.issueDate) ||
      toDateInputValue(candidateDefaults?.passportIssueDate) ||
      toDateInputValue(candidateDefaults?.kartaPobytuIssueDate) ||
      rawTextFallback.issueDate ||
      asString(extracted.dateOfIssue),
    firstName: pickBestTextCandidate(
      asString(extracted.firstName),
      rawTextFallback.firstName,
      normalizeFallbackText(candidateDefaults?.firstName),
      inferredNameParts?.firstName,
    ),
    lastName: pickBestTextCandidate(
      asString(extracted.lastName),
      rawTextFallback.lastName,
      normalizeFallbackText(candidateDefaults?.lastName),
      inferredNameParts?.lastName,
    ),
    nationality: pickBestTextCandidate(
      asString(extracted.nationality),
      rawTextFallback.nationality,
      normalizeFallbackText(candidateDefaults?.nationality),
    ),
    issuingCountry: pickBestTextCandidate(
      asString(extracted.issuingCountry),
      rawTextFallback.issuingCountry,
      normalizeFallbackText(candidateDefaults?.citizenship),
    ),
    dateOfBirth:
      asString(extracted.dateOfBirth) ||
      rawTextFallback.dateOfBirth ||
      toDateInputValue(candidateDefaults?.dateOfBirth),
    sex: asString(extracted.sex) || normalizeFallbackText(candidateDefaults?.gender),
    placeOfBirth:
      pickBestTextCandidate(
      asString(extracted.placeOfBirth),
      rawTextFallback.placeOfBirth ||
      normalizeFallbackText(candidateDefaults?.birthPlace),
      ),
    issuingAuthority: asString(extracted.issuingAuthority),
    passportBiometric: asBoolean(extracted.passportBiometric) || candidateDefaults?.passportBiometric === true,
    kartaPobytuType:
      pickBestTextCandidate(
      asString(extracted.kartaPobytuType),
      rawTextFallback.kartaPobytuType ||
      normalizeFallbackText(candidateDefaults?.kartaPobytuType),
      ),
    remarks: asString(extracted.remarks),
    municipalityOffice: asString(extracted.municipalityOffice),
    addressOfRegistration: asString(extracted.addressOfRegistration) || normalizeFallbackText(candidateDefaults?.polishAddress),
    heightCm: asNumber(extracted.heightCm),
    ocrError: asString(extracted.ocrError),
    markVerified: false,
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
  const [form, setForm] = useState(initialState);
  const [errorMessage, setErrorMessage] = useState("");
  const isManualReviewDocument = doc.ocrStatus === "FAILED" || isManualReviewOcrStatus(doc.ocrStatus);
  const reviewChecklist = useMemo(() => buildManualReviewChecklist(form), [form]);

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
          setForm(initialState);
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
                <Field label="Numero de documento" value={form.documentNumber} onChange={(value) => setField("documentNumber", value)} />
                <Field label="Numero personal / PESEL" value={form.personalNumber} onChange={(value) => setField("personalNumber", value)} />
                <Field label="Fecha de expedicion" type="date" value={form.issueDate} onChange={(value) => setField("issueDate", value)} />
                <Field label="Fecha de vencimiento" type="date" value={form.expiryDate} onChange={(value) => setField("expiryDate", value)} />
                <Field label="Nombres" value={form.firstName} onChange={(value) => setField("firstName", value)} />
                <Field label="Apellidos" value={form.lastName} onChange={(value) => setField("lastName", value)} />
                <Field label="Nacionalidad" value={form.nationality} onChange={(value) => setField("nationality", value)} />
                <Field label="Codigo pais / emisor" value={form.issuingCountry} onChange={(value) => setField("issuingCountry", value)} />
                <Field label="Fecha de nacimiento" type="date" value={form.dateOfBirth} onChange={(value) => setField("dateOfBirth", value)} />
                <Field label="Sexo" value={form.sex} onChange={(value) => setField("sex", value)} />
                <Field label="Lugar de nacimiento" value={form.placeOfBirth} onChange={(value) => setField("placeOfBirth", value)} />
                <Field label="Autoridad emisora" value={form.issuingAuthority} onChange={(value) => setField("issuingAuthority", value)} />
                <Field label="Tipo de permiso" value={form.kartaPobytuType} onChange={(value) => setField("kartaPobytuType", value)} />
                <Field label="Estatura (cm)" type="number" value={form.heightCm} onChange={(value) => setField("heightCm", value)} />
                <Field label="Oficina / Urzad Gminy" value={form.municipalityOffice} onChange={(value) => setField("municipalityOffice", value)} />
                <Field label="Observaciones" value={form.remarks} onChange={(value) => setField("remarks", value)} />
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
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}) {
  return (
    <div className="input-group" style={{ marginBottom: 0 }}>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
