type ExtractedData = unknown;

type DisplayableDocument = {
  type: string;
  number?: string | null;
  expiryDate?: string | Date | null;
  extractedData?: ExtractedData;
};

export type DocumentDisposition = "PRIMARY" | "FRONT" | "BACK" | "SUPPORTING" | "DUPLICATE";
export type DocumentOcrStatus = string | null | undefined;

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeDigits(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function getExtractedData(value: ExtractedData): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
}

function getExtractedString(extractedData: ExtractedData, keys: string[]): string | null {
  const extracted = getExtractedData(extractedData);

  for (const key of keys) {
    const value = normalizeOptionalString(extracted[key]);
    if (value) return value;
  }

  return null;
}

export function getDocumentDisposition(doc: Pick<DisplayableDocument, "extractedData"> | null): DocumentDisposition | null {
  if (!doc) return null;

  const disposition = getExtractedString(doc.extractedData, ["documentDisposition"]);
  if (!disposition) return null;

  const normalized = disposition.toUpperCase();
  if (
    normalized === "PRIMARY" ||
    normalized === "FRONT" ||
    normalized === "BACK" ||
    normalized === "SUPPORTING" ||
    normalized === "DUPLICATE"
  ) {
    return normalized;
  }

  return null;
}

export function getDocumentDispositionLabel(disposition: DocumentDisposition | null): string | null {
  if (disposition === "FRONT") return "Frente";
  if (disposition === "BACK") return "Reverso";
  if (disposition === "SUPPORTING") return "Soporte";
  if (disposition === "DUPLICATE") return "Duplicado";
  if (disposition === "PRIMARY") return "Principal";
  return null;
}

export function getDocumentTypeLabel(type: string | null | undefined): string {
  if (type === "PASSPORT") return "Pasaporte";
  if (type === "KARTA_POBYTU") return "Karta Pobytu";
  if (type === "PESEL") return "PESEL";
  if (type === "DECYZJA_WOJEWODY") return "Decision Wojewody";
  if (!type) return "Documento";

  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getDocumentTypeWithDispositionLabel(
  doc: Pick<DisplayableDocument, "type" | "extractedData"> | null,
): string {
  if (!doc) return "Documento";

  const typeLabel = getDocumentTypeLabel(doc.type);
  const dispositionLabel = getDocumentDispositionLabel(getDocumentDisposition(doc));

  return dispositionLabel ? `${typeLabel} - ${dispositionLabel}` : typeLabel;
}

export function isManualReviewOcrStatus(status: DocumentOcrStatus): boolean {
  return status === "manual_review";
}

export function isOcrReviewRequiredStatus(status: DocumentOcrStatus): boolean {
  return status === "REVIEW_REQUIRED";
}

function parseDateValue(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPlaceholderValue(value: string | null): boolean {
  if (!value) return true;

  const normalized = value.trim().toUpperCase();
  if (!normalized) return true;

  const placeholders = new Set([
    "REMARKS",
    "UWAGI",
    "NUMER",
    "NUMBER",
    "DOCUMENT NUMBER",
    "PERSONAL NUMBER",
    "PESEL",
    "NUMER PESEL",
    "PERSONAL NUMSER",
    "PERSONAL NUMER",
    "ADDRESS OF REGISTRATION",
    "DOSTEP DO RYNKU PRACY",
  ]);

  return placeholders.has(normalized);
}

function sanitizeDocumentNumberCandidate(value: string | null): string | null {
  if (!value || isPlaceholderValue(value)) return null;

  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length < 5 || compact.length > 24) return null;
  if (!/[0-9]/.test(compact)) return null;
  if (!/^[A-Z0-9\-\/() ]+$/i.test(compact)) return null;
  if (compact.includes("(") || compact.includes(")")) return null;

  return compact.toUpperCase();
}

function sanitizePeselCandidate(value: string | null): string | null {
  const digits = normalizeDigits(value);
  return digits && digits.length === 11 ? digits : null;
}

export function getDocumentDisplayNumber(doc: DisplayableDocument | null): string | null {
  if (!doc) return null;

  const directNumber = normalizeOptionalString(doc.number);
  const extractedNumber = getExtractedString(doc.extractedData, [
    "documentNumber",
    "passportNumber",
    "kartaPobytuNumber",
  ]);
  const personalNumber = getExtractedString(doc.extractedData, [
    "personalNumber",
    "peselNumber",
  ]);

  if (doc.type === "PESEL") {
    return (
      sanitizePeselCandidate(personalNumber) ??
      sanitizePeselCandidate(directNumber) ??
      sanitizePeselCandidate(extractedNumber)
    );
  }

  if (doc.type === "KARTA_POBYTU") {
    return sanitizeDocumentNumberCandidate(extractedNumber) ?? sanitizeDocumentNumberCandidate(directNumber);
  }

  if (doc.type === "PASSPORT") {
    return sanitizeDocumentNumberCandidate(extractedNumber) ?? sanitizeDocumentNumberCandidate(directNumber);
  }

  return (
    sanitizeDocumentNumberCandidate(directNumber) ??
    sanitizeDocumentNumberCandidate(extractedNumber) ??
    sanitizePeselCandidate(personalNumber)
  );
}

export function getDocumentDisplayExpiry(doc: DisplayableDocument | null): Date | null {
  if (!doc) return null;
  if (doc.type === "PESEL") return null;

  return (
    parseDateValue(doc.expiryDate) ??
    parseDateValue(
      getExtractedString(doc.extractedData, [
        "dateOfExpiry",
        "expiryDate",
        "DateOfExpiry",
        "DateOfExpiration",
      ]),
    )
  );
}

export function formatDocumentDisplayDate(value: Date | null): string {
  if (!value) return "-";
  return value.toLocaleDateString();
}
