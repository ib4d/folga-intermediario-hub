import { auth } from "@/auth";
import AuditTimeline from "@/components/audit/AuditTimeline";
import BatchUploadButton from "@/components/BatchUploadButton";
import DocumentIntegrityCard from "@/components/DocumentIntegrityCard";
import DocumentTable from "@/components/DocumentTable";
import ProviderStatusCard from "@/components/ProviderStatusCard";
import { DOCUMENT_REVIEW_PENDING_STATUSES } from "@/lib/document-checklist";
import { normalizeLanguage, t } from "@/lib/i18n";
import { getProviderStatus } from "@/lib/provider-status";
import { canAccessModule, canReviewCandidateDocuments, canUploadCandidateDocuments } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { canAccessAllCandidates, candidateAccessWhere, candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ComponentProps } from "react";

function toPlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isReviewQueueStatus(status?: string): boolean {
  if (!status) return false;
  return DOCUMENT_REVIEW_PENDING_STATUSES.has(status);
}

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; candidateId?: string }>;
}) {
  const { status, candidateId } = await searchParams;
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "documents")) redirect("/sin-permisos");

  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const providerStatus = getProviderStatus();
  const { storage, availableStorage, availableOcr, manualOcrMode } = providerStatus;
  const reviewQueueFilterActive = isReviewQueueStatus(status);
  const candidateFilter = candidateId
    ? await prisma.candidate.findFirst({
        where: candidateAccessWhere(tenant, candidateId),
        select: { id: true, firstName: true, lastName: true },
      })
    : null;

  const documentWhere: Prisma.DocumentWhereInput = {
    organizationId: tenant.organizationId,
    ...(reviewQueueFilterActive
      ? { ocrStatus: { in: Array.from(DOCUMENT_REVIEW_PENDING_STATUSES) } }
      : status
        ? { ocrStatus: status }
        : {}),
    ...(candidateFilter ? { candidateId: candidateFilter.id } : {}),
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
    where: { ...documentWhere, ocrStatus: { in: Array.from(DOCUMENT_REVIEW_PENDING_STATUSES) } },
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
      ocrStatus: { in: Array.from(DOCUMENT_REVIEW_PENDING_STATUSES) },
    },
  });

  const documentAuditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: tenant.organizationId,
      entityType: "Document",
      action: {
        in: [
          "DOCUMENT_UPLOADED",
          "DOCUMENT_VERIFIED",
          "DOCUMENT_DELETED",
          "OCR_EXTRACTED_PENDING_REVIEW",
          "OCR_FAILED",
          "DOCUMENT_INTEGRITY_CHECKED",
        ],
      },
    },
    include: {
      User: {
        select: { name: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <>
      <div
        className="hero-section"
        style={{ padding: "2rem", backgroundColor: "var(--pitch-black)", color: "var(--ghost-white)" }}
      >
        <h1 style={{ color: "var(--ghost-white)" }}>{labels("documents.title")}</h1>
        <p style={{ color: "var(--grey-olive)" }}>{labels("documents.description")}</p>
        {candidateFilter ? (
          <div
            style={{
              marginTop: "1rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 0.75rem",
              border: "1px solid rgba(252, 186, 4, 0.35)",
              background: "rgba(252, 186, 4, 0.12)",
              color: "var(--ghost-white)",
              fontSize: "0.85rem",
              fontWeight: 800,
            }}
          >
            {labels("documents.filteringCandidate")}: {candidateFilter.firstName} {candidateFilter.lastName}
            <Link
              href="/documentos"
              style={{
                marginLeft: "0.5rem",
                padding: "0.2rem 0.55rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.14)",
                color: "var(--ghost-white)",
                textDecoration: "none",
                fontSize: "0.78rem",
                fontWeight: 800,
              }}
            >
              {labels("documents.clearCandidateFilter")}
            </Link>
            <Link
              href={`/candidatos/${candidateFilter.id}`}
              style={{
                marginLeft: "0.25rem",
                padding: "0.2rem 0.55rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.1)",
                color: "var(--ghost-white)",
                textDecoration: "none",
                fontSize: "0.78rem",
                fontWeight: 800,
              }}
            >
              {labels("documents.openCandidate")}
            </Link>
          </div>
        ) : null}
      </div>

      <ProviderStatusCard
        title={labels("documents.providersTitle")}
        description={labels("documents.providersDescription")}
        storageLabel={labels("documents.storageProvider")}
        storageValue={storage.mode === "local" ? labels("documents.storageLocal") : labels("documents.storageSupabase")}
        storageNote={
          storage.mode === "local"
            ? labels("documents.storageLocalNote")
            : labels("documents.storageSupabaseNote")
        }
        storageAvailableLabel={labels("documents.providersAvailable")}
        storageAvailableValue={availableStorage.map((provider) => provider.statusLabel)}
        ocrLabel={labels("documents.ocrProvider")}
        ocrValue={manualOcrMode ? labels("documents.ocrManualMode") : labels("documents.ocrAutomaticMode")}
        ocrNote={manualOcrMode ? labels("documents.ocrManualNote") : labels("documents.ocrAutomaticNote")}
        ocrAvailableLabel={labels("documents.providersAvailable")}
        ocrAvailableValue={availableOcr.map((provider) => provider.statusLabel)}
      />

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <Link
          href="/documentos?status=REVIEW_REQUIRED"
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

      <DocumentIntegrityCard
        labels={{
          title: labels("documents.integrityTitle"),
          description: labels("documents.integrityDescription"),
          button: labels("documents.integrityButton"),
          checking: labels("documents.integrityChecking"),
          accessible: labels("documents.integrityAccessible"),
          broken: labels("documents.integrityBroken"),
          verified: labels("documents.integrityVerified"),
          manual: labels("documents.integrityManual"),
          pending: labels("documents.integrityPending"),
          lastChecked: labels("documents.integrityLastChecked"),
          emptyIssues: labels("documents.integrityEmptyIssues"),
          issueLabel: labels("documents.integrityIssueLabel"),
          candidateLabel: labels("documents.candidate"),
          statusLabel: labels("documents.ocrStatus"),
          urlLabel: labels("documents.integrityUrlLabel"),
          error: labels("documents.integrityError"),
        }}
      />

      <div className="card" style={{ marginBottom: "2rem", padding: "1.25rem 1.5rem" }}>
        <div className="card-header" style={{ marginBottom: "1rem" }}>
          <div>
            <h2 style={{ marginBottom: "0.35rem" }}>{labels("documents.activityTitle")}</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem", maxWidth: "760px" }}>
              {labels("documents.activityDescription")}
            </p>
          </div>
        </div>

        <AuditTimeline logs={documentAuditLogs as ComponentProps<typeof AuditTimeline>["logs"]} />
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
              ocrDescription={
                manualOcrMode
                  ? labels("documents.ocrManualNote")
                  : labels("documents.ocrAutomaticNote")
              }
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
