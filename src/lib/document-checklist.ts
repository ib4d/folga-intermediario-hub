import { Candidate, Document, DocumentType } from "@prisma/client";
import {
  getDocumentDisplayExpiry,
  getDocumentDisplayNumber,
  getDocumentDisposition,
  getDocumentDispositionLabel,
} from "@/lib/document-display";

type CandidateWithDocuments = Candidate & { documents: Document[] };

export const DOCUMENT_REVIEW_PENDING_STATUSES = new Set([
  "PENDING",
  "OCR_CAPTURED",
  "REVIEW_REQUIRED",
  "manual_review",
  "FAILED",
]);

export interface DocumentDuplicateGroup {
  key: string;
  type: DocumentType;
  number: string | null;
  count: number;
}

export interface DocumentChecklist {
  required: string[];
  uploaded: string[];
  verified: string[];
  pendingReview: string[];
  missing: string[];
  warnings: string[];
  blockers: string[];
  duplicates: DocumentDuplicateGroup[];
  stats: {
    totalDocuments: number;
    uniqueDocumentTypes: number;
    verifiedDocuments: number;
    pendingReviewDocuments: number;
    expiringSoonDocuments: number;
    duplicateGroups: number;
  };
  isComplete: boolean;
  isReadyForLegal: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function addUnique(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function isExpiringWithinThirtyDays(value: Date | null): boolean {
  if (!value) return false;
  return value.getTime() < Date.now() + THIRTY_DAYS_MS;
}

function buildDuplicateGroups(documents: Document[]): DocumentDuplicateGroup[] {
  const groups = new Map<string, DocumentDuplicateGroup>();

  for (const document of documents) {
    const disposition = getDocumentDisposition(document);
    if (disposition === "BACK" || disposition === "SUPPORTING" || disposition === "DUPLICATE") {
      continue;
    }

    const number = getDocumentDisplayNumber(document);
    const key = `${document.type}:${number ?? "NO_NUMBER"}`;
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    groups.set(key, {
      key,
      type: document.type,
      number,
      count: 1,
    });
  }

  return Array.from(groups.values()).filter((group) => group.count > 1);
}

export function getCandidateDocumentChecklist(candidate: CandidateWithDocuments): DocumentChecklist {
  const required: string[] = ["PASSPORT"];
  const uploadedUnique: string[] = [];
  const verifiedUnique: string[] = [];
  const pendingReviewUnique: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (candidate.kartaPobytuNumber || candidate.kartaPobytuExpiry) {
    addUnique(required, "KARTA_POBYTU");
  }

  if (candidate.peselNumber) {
    addUnique(required, "PESEL");
  }

  if (candidate.voivodatoNumber) {
    addUnique(required, "DECYZJA_WOJEWODY");
  }

  for (const document of candidate.documents) {
    addUnique(uploadedUnique, document.type);

    if (document.isVerified) {
      addUnique(verifiedUnique, document.type);
    }

    if (!document.isVerified || (document.ocrStatus && DOCUMENT_REVIEW_PENDING_STATUSES.has(document.ocrStatus))) {
      addUnique(pendingReviewUnique, document.type);
    }
  }

  const missing = required.filter((type) => !uploadedUnique.includes(type as DocumentType));
  const duplicates = buildDuplicateGroups(candidate.documents);

  for (const type of required) {
    if (uploadedUnique.includes(type as DocumentType) && !verifiedUnique.includes(type as DocumentType)) {
      blockers.push(`${type} cargado pero aun no verificado`);
    }
  }

  const passportDocument = candidate.documents.find((document) => document.type === DocumentType.PASSPORT);
  const passportExpiry = getDocumentDisplayExpiry(passportDocument ?? null);
  if (!passportDocument) {
    blockers.push("Falta documento de pasaporte");
  } else if (!passportExpiry) {
    blockers.push("Pasaporte sin fecha de vencimiento confirmada");
  } else if (passportExpiry.getTime() < Date.now()) {
    blockers.push("Pasaporte vencido");
  }

  const kartaDocument = candidate.documents.find((document) => document.type === DocumentType.KARTA_POBYTU);
  const kartaExpiry = getDocumentDisplayExpiry(kartaDocument ?? null);
  if (candidate.kartaPobytuNumber && kartaDocument && !kartaExpiry) {
    blockers.push("Karta Pobytu sin fecha de vencimiento confirmada");
  }

  if (isExpiringWithinThirtyDays(passportExpiry)) {
    warnings.push("Pasaporte vence en menos de 30 dias");
  }

  if (isExpiringWithinThirtyDays(kartaExpiry)) {
    warnings.push("Karta Pobytu vence en menos de 30 dias");
  }

  if (!candidate.paid400pln) {
    warnings.push("Falta pago de 400 PLN");
  }

  if (!candidate.phone) {
    warnings.push("No tiene telefono");
  }

  if (!candidate.email) {
    warnings.push("No tiene email");
  }

  if (!candidate.polishAddress && candidate.documents.some((document) => document.type === DocumentType.KARTA_POBYTU)) {
    warnings.push("Falta direccion en Polonia");
  }

  for (const document of candidate.documents) {
    const disposition = getDocumentDisposition(document);
    const label = getDocumentDispositionLabel(disposition);
    if (label === "Duplicado") {
      warnings.push(`${document.type} marcado como duplicado; validar si puede archivarse o eliminarse`);
    }
  }

  for (const duplicate of duplicates) {
    const suffix = duplicate.number ? ` (${duplicate.number})` : "";
    warnings.push(`${duplicate.type}${suffix} aparece ${duplicate.count} veces; revisar front/back o duplicados`);
  }

  const expiringSoonDocuments = candidate.documents.filter((document) =>
    isExpiringWithinThirtyDays(getDocumentDisplayExpiry(document)),
  ).length;

  return {
    required,
    uploaded: uploadedUnique,
    verified: verifiedUnique,
    pendingReview: pendingReviewUnique,
    missing,
    warnings,
    blockers,
    duplicates,
    stats: {
      totalDocuments: candidate.documents.length,
      uniqueDocumentTypes: uploadedUnique.length,
      verifiedDocuments: candidate.documents.filter((document) => document.isVerified).length,
      pendingReviewDocuments: candidate.documents.filter(
        (document) => !document.isVerified || (document.ocrStatus && DOCUMENT_REVIEW_PENDING_STATUSES.has(document.ocrStatus)),
      ).length,
      expiringSoonDocuments,
      duplicateGroups: duplicates.length,
    },
    isComplete: missing.length === 0,
    isReadyForLegal: missing.length === 0 && blockers.length === 0,
  };
}
