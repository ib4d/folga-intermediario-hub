import { Candidate, Document, DocumentType } from "@prisma/client";

export interface DocumentChecklist {
  required: string[];
  uploaded: string[];
  missing: string[];
  warnings: string[];
  isComplete: boolean;
}

export function getCandidateDocumentChecklist(
  candidate: Candidate & { documents: Document[] }
): DocumentChecklist {
  const required: string[] = ["PASSPORT"];
  const uploaded = candidate.documents.map((d) => d.type);
  const warnings: string[] = [];

  // Conditional requirements
  if (candidate.paid400pln) {
    // For now we don't have a specific PAYMENT_RECEIPT type in enum, 
    // but the prompt mentions it. Let's see the enum in schema.prisma.
    // DocumentType: PASSPORT, KARTA_POBYTU, PESEL, DECYZJA_WOJEWODY, CV, OTHER
    // I'll use OTHER for payment receipt if not specifically added.
  }

  if (candidate.kartaPobytuNumber || candidate.kartaPobytuExpiry) {
    required.push("KARTA_POBYTU");
  }

  if (candidate.peselNumber) {
    required.push("PESEL");
  }

  if (candidate.voivodatoNumber) {
    required.push("DECYZJA_WOJEWODY");
  }

  const missing = required.filter((type) => !uploaded.includes(type as DocumentType));

  // Warnings
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (candidate.passportExpiry && new Date(candidate.passportExpiry) < thirtyDaysFromNow) {
    warnings.push("Pasaporte vence en menos de 30 días");
  }

  if (candidate.kartaPobytuExpiry && new Date(candidate.kartaPobytuExpiry) < thirtyDaysFromNow) {
    warnings.push("Karta Pobytu vence en menos de 30 días");
  }

  if (!candidate.paid400pln) {
    warnings.push("Falta pago de 400 PLN");
  }

  if (!candidate.phone) {
    warnings.push("No tiene teléfono");
  }

  if (!candidate.email) {
    warnings.push("No tiene email");
  }

  return {
    required,
    uploaded: Array.from(new Set(uploaded)),
    missing,
    warnings,
    isComplete: missing.length === 0,
  };
}
