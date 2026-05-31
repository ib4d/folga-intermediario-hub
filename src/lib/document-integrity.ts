import { DocumentType, type Prisma } from "@prisma/client";

export interface DocumentIntegrityRecord {
  id: string;
  type: DocumentType;
  number: string | null;
  url: string;
  candidateId: string;
  candidateName: string;
  ocrStatus: string | null;
  isVerified: boolean;
}

export interface DocumentIntegrityIssue extends DocumentIntegrityRecord {
  reason: string;
}

export interface DocumentIntegritySummary {
  checkedAt: string;
  totalDocuments: number;
  accessibleDocuments: number;
  brokenDocuments: number;
  verifiedDocuments: number;
  manualReviewDocuments: number;
  pendingReviewDocuments: number;
  issues: DocumentIntegrityIssue[];
}

export async function isDocumentUrlReachable(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;

  const timeoutMs = 5000;
  const createAbortSignal = () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timeout };
  };

  const checkWithMethod = async (method: "HEAD" | "GET") => {
    const { controller, timeout } = createAbortSignal();
    try {
      const response = await fetch(publicUrl, {
        method,
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
        ...(method === "GET"
          ? {
              headers: {
                Range: "bytes=0-0",
              },
            }
          : {}),
      });

      return response.ok || response.status === 206;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  };

  if (await checkWithMethod("HEAD")) {
    return true;
  }

  return checkWithMethod("GET");
}

export async function inspectDocumentIntegrity(
  documents: DocumentIntegrityRecord[]
): Promise<DocumentIntegritySummary> {
  const checks = await Promise.all(
    documents.map(async (document) => ({
      document,
      accessible: await isDocumentUrlReachable(document.url),
    }))
  );

  const issues: DocumentIntegrityIssue[] = checks
    .filter((entry) => !entry.accessible)
    .map(({ document }) => ({
      ...document,
      reason: "No se pudo acceder al archivo desde el storage configurado.",
    }));

  return {
    checkedAt: new Date().toISOString(),
    totalDocuments: documents.length,
    accessibleDocuments: checks.length - issues.length,
    brokenDocuments: issues.length,
    verifiedDocuments: documents.filter((document) => document.isVerified).length,
    manualReviewDocuments: documents.filter(
      (document) => document.ocrStatus === "manual_review" || document.ocrStatus === "REVIEW_REQUIRED"
    ).length,
    pendingReviewDocuments: documents.filter(
      (document) =>
        !document.isVerified &&
        (document.ocrStatus === "FAILED" ||
          document.ocrStatus === "PENDING" ||
          document.ocrStatus === "manual_review" ||
          document.ocrStatus === "REVIEW_REQUIRED" ||
          document.ocrStatus === "OCR_CAPTURED")
    ).length,
    issues,
  };
}

export function toDocumentIntegrityRecords(
  documents: Array<{
    id: string;
    type: DocumentType;
    number: string | null;
    url: string;
    candidateId: string;
    ocrStatus: string | null;
    isVerified: boolean;
    candidate: { firstName: string | null; lastName: string | null } | null;
  }>
): DocumentIntegrityRecord[] {
  return documents.map((document) => ({
    id: document.id,
    type: document.type,
    number: document.number,
    url: document.url,
    candidateId: document.candidateId,
    candidateName: `${document.candidate?.firstName ?? ""} ${document.candidate?.lastName ?? ""}`.trim() || "Sin candidato asignado",
    ocrStatus: document.ocrStatus,
    isVerified: document.isVerified,
  }));
}

export function getDocumentIntegrityWhere(
  organizationId: string,
  candidateWhere: Prisma.CandidateWhereInput
): Prisma.DocumentWhereInput {
  return {
    organizationId,
    candidate: candidateWhere,
  };
}
