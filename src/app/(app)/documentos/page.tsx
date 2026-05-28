import { auth } from "@/auth";
import BatchUploadButton from "@/components/BatchUploadButton";
import DocumentTable from "@/components/DocumentTable";
import { normalizeLanguage, t } from "@/lib/i18n";
import { isManualOcrMode } from "@/lib/providers/ocr";
import { canAccessModule, canReviewCandidateDocuments, canUploadCandidateDocuments } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canAccessAllCandidates, candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

function toPlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "documents")) redirect("/sin-permisos");

  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const manualOcrMode = isManualOcrMode();

  const documentWhere: Prisma.DocumentWhereInput = {
    organizationId: tenant.organizationId,
    ...(status ? { ocrStatus: status } : {}),
    ...(canAccessAllCandidates(tenant.role)
      ? {}
      : { candidate: { intermediaryId: tenant.userId } }),
  };

  const documents = await prisma.document.findMany({
    where: documentWhere,
    include: { candidate: true },
    orderBy: { createdAt: "desc" },
    take: status ? undefined : 10,
  });

  const candidates = await prisma.candidate.findMany({
    where: candidateVisibilityWhere(tenant),
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  const formattedCandidates = candidates.map((candidate) => ({
    id: candidate.id,
    name: `${candidate.firstName} ${candidate.lastName}`,
  }));

  const pendingCount = await prisma.document.count({
    where: { ...documentWhere, ocrStatus: { in: ["PENDING", "REVIEW_REQUIRED"] } },
  });

  const completedCount = await prisma.document.count({
    where: {
      ...documentWhere,
      ocrStatus: { in: ["OCR_CAPTURED", "SUCCESS"] },
    },
  });

  const manualReviewCount = await prisma.document.count({
    where: {
      ...documentWhere,
      ocrStatus: { in: ["REVIEW_REQUIRED", "PENDING"] },
    },
  });

  return (
    <>
      <div
        className="hero-section"
        style={{ padding: "2rem", backgroundColor: "var(--pitch-black)", color: "var(--ghost-white)" }}
      >
        <h1 style={{ color: "var(--ghost-white)" }}>{labels("documents.title")}</h1>
        <p style={{ color: "var(--grey-olive)" }}>{labels("documents.description")}</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <Link
          href="/documentos?status=PENDING"
          className="card"
          style={{ backgroundColor: "var(--amber-flame)", textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>{labels("documents.pendingReview")}</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: 1 }}>{pendingCount}</div>
          <p style={{ margin: 0, marginTop: "0.5rem", color: "var(--pitch-black)" }}>
            {labels("documents.docsToValidate")}
          </p>
        </Link>

        <div className="card">
          <div className="card-header">
            <h3>
              {manualOcrMode
                ? labels("documents.manualQueueTitle")
                : labels("documents.ocrProcessed")}
            </h3>
            <CheckCircle size={24} />
          </div>
          <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: 1 }}>
            {manualOcrMode ? manualReviewCount : completedCount}
          </div>
          <p style={{ margin: 0, marginTop: "0.5rem" }}>
            {manualOcrMode
              ? labels("documents.manualQueueDescription")
              : labels("documents.ocrSuccess")}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div
          className="card-header"
          style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
        >
          <h2>{labels("documents.uploadTitle")}</h2>
          {canUploadCandidateDocuments(tenant.role) ? (
            <BatchUploadButton
              candidates={formattedCandidates}
              ocrMode={manualOcrMode ? "manual" : "automatic"}
            />
          ) : (
            <span style={{ color: "var(--muted)", fontWeight: 800, fontSize: "0.85rem" }}>
              {labels("documents.uploadRestricted")}
            </span>
          )}
        </div>
      </div>

      <DocumentTable
        initialDocuments={toPlainData(documents)}
        canReviewDocuments={canReviewCandidateDocuments(tenant.role)}
        canDeleteDocuments={canUploadCandidateDocuments(tenant.role)}
        ocrMode={manualOcrMode ? "manual" : "automatic"}
        labels={{
          processedTitle: labels("documents.processedTitle"),
          deleteSelected: labels("documents.deleteSelected"),
          deleteBulkTitle: labels("documents.deleteBulkTitle"),
          deleteSingleTitle: labels("documents.deleteSingleTitle"),
          deleteBulkDescription: labels("documents.deleteBulkDescription"),
          deleteSingleDescription: labels("documents.deleteSingleDescription"),
          deleteConfirm: labels("documents.deleteConfirm"),
          empty: labels("documents.empty"),
          file: labels("documents.file"),
          candidate: labels("documents.candidate"),
          type: labels("documents.type"),
          number: labels("documents.number"),
          expiry: labels("documents.expiry"),
          ocrStatus: labels("documents.ocrStatus"),
          action: labels("documents.action"),
          ocrCaptured: labels("documents.ocrCaptured"),
          ocrFailed: labels("documents.ocrFailed"),
          manualReview: labels("documents.manualReview"),
          pending: labels("documents.pending"),
          deletedManySuccess: labels("documents.deletedManySuccess"),
          deletedOneSuccess: labels("documents.deletedOneSuccess"),
          deleteManyError: labels("documents.deleteManyError"),
          deleteOneError: labels("documents.deleteOneError"),
          fix: labels("documents.fix"),
          verify: labels("documents.verify"),
          review: labels("documents.review"),
          duplicateWorkbenchTitle: labels("documents.duplicateWorkbenchTitle"),
          duplicateWorkbenchDescription: labels("documents.duplicateWorkbenchDescription"),
          duplicateWorkbenchPagination: labels("documents.duplicateWorkbenchPagination"),
          duplicateWorkbenchBadge: labels("documents.duplicateWorkbenchBadge"),
          duplicateSuggestedAction: labels("documents.duplicateSuggestedAction"),
          duplicateSuggestFrontBack: labels("documents.duplicateSuggestFrontBack"),
          duplicateSuggestReclassify: labels("documents.duplicateSuggestReclassify"),
          openCandidate: labels("documents.openCandidate"),
        }}
      />
    </>
  );
}
