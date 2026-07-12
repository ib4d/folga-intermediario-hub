"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckSquare, FileText, Loader2, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DocumentReviewModal from "@/components/DocumentReviewModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PaginatedList from "@/components/ui/PaginatedList";
import {
  formatDocumentDisplayDate,
  getDocumentDisplayExpiry,
  getDocumentDisposition,
  getDocumentDispositionLabel,
  getDocumentDisplayNumber,
  getDocumentTypeLabel,
  isOcrReviewRequiredStatus,
  isManualReviewOcrStatus,
} from "@/lib/document-display";
import { deleteDocumentById } from "@/lib/document-client";

type Document = {
  id: string;
  url: string | null;
  type: string;
  number: string | null;
  expiryDate: string | Date | null;
  issueDate: string | Date | null;
  ocrStatus: string | null;
  extractedData: unknown;
  isVerified: boolean;
  candidateId: string;
  candidate: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

type DuplicateQueueItem = {
  key: string;
  candidateId: string;
  candidateName: string;
  type: string;
  number: string | null;
  count: number;
  suggestion: string;
  documents: Document[];
};

type DocumentTableLabels = {
  processedTitle: string;
  deleteSelected: string;
  clearSelection: string;
  deleteBulkTitle: string;
  deleteSingleTitle: string;
  deleteBulkDescription: string;
  deleteSingleDescription: string;
  deleteConfirm: string;
  empty: string;
  file: string;
  candidate: string;
  type: string;
  number: string;
  expiry: string;
  ocrStatus: string;
  action: string;
  ocrCaptured: string;
  ocrFailed: string;
  manualReview: string;
  pending: string;
  deletedManySuccess: string;
  deletedOneSuccess: string;
  deleteManyError: string;
  deleteOneError: string;
  fix: string;
  verify: string;
  review: string;
  duplicateWorkbenchTitle: string;
  duplicateWorkbenchDescription: string;
  duplicateWorkbenchPagination: string;
  duplicateWorkbenchBadge: string;
  duplicateSuggestedAction: string;
  duplicateSuggestFrontBack: string;
  duplicateSuggestReclassify: string;
  openCandidate: string;
};

export default function DocumentTable({
  initialDocuments,
  canReviewDocuments,
  canDeleteDocuments,
  ocrMode = "automatic",
  labels,
}: {
  initialDocuments: Document[];
  canReviewDocuments: boolean;
  canDeleteDocuments: boolean;
  ocrMode?: "manual" | "automatic";
  labels: DocumentTableLabels;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableMessage, setTableMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ type: "single"; id: string } | { type: "bulk"; ids: string[] } | null>(null);
  const router = useRouter();
  const interpolate = (template: string, replacements: Record<string, string | number>) =>
    Object.entries(replacements).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
      template,
    );
  const selectedCount = selectedIds.length;
  const visibleDocumentCount = initialDocuments.length;

  const duplicateQueueItems = useMemo<DuplicateQueueItem[]>(() => {
    const grouped = new Map<string, Document[]>();

    for (const doc of initialDocuments) {
      const disposition = getDocumentDisposition(doc);
      if (disposition === "BACK" || disposition === "SUPPORTING" || disposition === "DUPLICATE") {
        continue;
      }

      const displayNumber = getDocumentDisplayNumber(doc);
      if (!displayNumber) continue;

      const groupKey = `${doc.candidateId}:${doc.type}:${displayNumber.toUpperCase()}`;
      const current = grouped.get(groupKey) ?? [];
      current.push(doc);
      grouped.set(groupKey, current);
    }

    return Array.from(grouped.entries())
      .map(([key, documents]) => {
        if (documents.length < 2) return null;

        const representative = documents[0];
        const candidateName = `${representative.candidate?.firstName ?? ""} ${representative.candidate?.lastName ?? ""}`.trim();
        return {
          key,
          candidateId: representative.candidateId,
          candidateName: candidateName || "Sin candidato asignado",
          type: representative.type,
          number: getDocumentDisplayNumber(representative),
          count: documents.length,
          suggestion:
            documents.length <= 2
              ? labels.duplicateSuggestFrontBack
              : labels.duplicateSuggestReclassify,
          documents,
        } satisfies DuplicateQueueItem;
      })
      .filter((item): item is DuplicateQueueItem => Boolean(item))
      .sort((left, right) => right.count - left.count || left.candidateName.localeCompare(right.candidateName));
  }, [initialDocuments, labels.duplicateSuggestFrontBack, labels.duplicateSuggestReclassify]);

  const toggleSelectAll = () => {
    if (!canDeleteDocuments) return;

    if (selectedIds.length === initialDocuments.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(initialDocuments.map((doc) => doc.id));
  };

  const toggleSelect = (id: string) => {
    if (!canDeleteDocuments) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const getOcrBadgeClassName = (ocrStatus: string | null) => {
    if (ocrStatus === "FAILED") return "status-badge danger";
    if (isManualReviewOcrStatus(ocrStatus) || isOcrReviewRequiredStatus(ocrStatus)) {
      return "status-badge warning";
    }
    if (ocrStatus === "OCR_CAPTURED" || ocrStatus === "SUCCESS") {
      return "status-badge active";
    }
    return "status-badge";
  };

  const getOcrLabel = (ocrStatus: string | null) => {
    if (ocrStatus === "OCR_CAPTURED") return labels.ocrCaptured;
    if (ocrStatus === "FAILED") return labels.ocrFailed;
    if (isOcrReviewRequiredStatus(ocrStatus)) return labels.review;
    if (isManualReviewOcrStatus(ocrStatus)) return labels.manualReview;
    return ocrStatus || labels.pending;
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setConfirmTarget({ type: "bulk", ids: selectedIds });
  };

  const confirmDeleteSelected = async (ids: string[]) => {
    setConfirmTarget(null);
    setIsDeleting(true);
    setTableMessage(null);
    try {
      for (const id of ids) {
        await deleteDocumentById(id);
      }
      setSelectedIds([]);
      router.refresh();
      setTableMessage({ tone: "success", text: labels.deletedManySuccess });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setTableMessage({ tone: "error", text: interpolate(labels.deleteManyError, { message }) });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    setConfirmTarget({ type: "single", id });
  };

  const confirmDeleteSingle = async (id: string) => {
    setConfirmTarget(null);
    setIsDeleting(true);
    setTableMessage(null);
    try {
      await deleteDocumentById(id);
      router.refresh();
      setTableMessage({ tone: "success", text: labels.deletedOneSuccess });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setTableMessage({ tone: "error", text: interpolate(labels.deleteOneError, { message }) });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {duplicateQueueItems.length > 0 ? (
        <div className="card module-panel document-table-workbench-shell">
          <div>
            <div className="document-table-workbench-title">
              <AlertTriangle size={16} strokeWidth={2.75} />
              {labels.duplicateWorkbenchTitle}
            </div>
            <p className="document-table-workbench-copy">
              {labels.duplicateWorkbenchDescription}
            </p>
          </div>

          <PaginatedList
            items={duplicateQueueItems}
            pageSize={4}
            label={labels.duplicateWorkbenchPagination}
            className="equal-card-grid document-table-workbench-grid"
            renderItem={(item) => (
              <div key={item.key} className="card equal-card document-table-workbench-card">
                <div className="document-table-workbench-card-head">
                  <div>
                    <div className="document-table-workbench-name">
                      {item.candidateName}
                    </div>
                    <div className="document-table-workbench-meta">
                      {item.type}{item.number ? ` (${item.number})` : ""}
                    </div>
                  </div>
                  <span className="status-badge document-table-workbench-badge">
                    {labels.duplicateWorkbenchBadge}
                  </span>
                </div>

                <div className="document-table-workbench-count">
                  x{item.count}
                </div>

                <div className="document-table-workbench-suggestion">
                  {labels.duplicateSuggestedAction}: {item.suggestion}
                </div>

                <div className="document-table-workbench-actions">
                  {canReviewDocuments ? (
                    <DocumentReviewModal
                      doc={item.documents[0]}
                      allDocuments={initialDocuments.filter((candidateDoc) => candidateDoc.candidateId === item.candidateId)}
                      candidateDefaults={item.documents[0].candidate ?? undefined}
                    />
                  ) : null}
                  <Link href={`/candidatos/${item.candidateId}`} className="button button-secondary document-table-workbench-open">
                    {labels.openCandidate}
                  </Link>
                </div>
              </div>
            )}
          />
        </div>
      ) : null}

      <div className="card module-panel">
        {ocrMode === "manual" ? (
          <div className="document-manual-banner">
            Modo manual activo: los documentos se guardan correctamente, pero quedan en revisión antes de validar los datos.
          </div>
        ) : null}

        <div className="page-section-header document-table-header">
          <div className="page-section-copy">
            <h2 className="page-section-title">{labels.processedTitle}</h2>
            <p className="page-section-description">
              {visibleDocumentCount} documentos visibles - {selectedCount} seleccionados
            </p>
          </div>
          {canDeleteDocuments && selectedCount > 0 ? (
            <div className="document-table-summary-actions">
              <button
                className="button button-secondary document-table-bulk-delete"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {`${labels.deleteSelected} (${selectedCount})`}
              </button>
              <button
                className="button button-outline"
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={isDeleting}
              >
                {labels.clearSelection}
              </button>
            </div>
          ) : null}
        </div>

        {tableMessage ? (
          <p className={tableMessage.tone === "success" ? "form-message-success" : "form-message-error document-table-message"}>
            {tableMessage.text}
          </p>
        ) : null}

        <div className="table-container table-container--responsive document-table-scroll">
          <table>
            <thead>
              <tr>
                {canDeleteDocuments ? (
                  <th className="document-table-select-col">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="document-table-select-toggle"
                      aria-label={selectedIds.length === initialDocuments.length ? "Deseleccionar todos los documentos" : "Seleccionar todos los documentos"}
                    >
                      {selectedIds.length === initialDocuments.length && initialDocuments.length > 0 ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                ) : null}
                <th>{labels.file}</th>
                <th>{labels.candidate}</th>
                <th>{labels.type}</th>
                <th>{labels.number}</th>
                <th>{labels.expiry}</th>
                <th>{labels.ocrStatus}</th>
                <th>{labels.action}</th>
              </tr>
            </thead>
            <tbody>
              {initialDocuments.length === 0 ? (
                <tr>
                  <td colSpan={canDeleteDocuments ? 8 : 7} className="document-table-empty">
                    {labels.empty}
                  </td>
                </tr>
              ) : (
                initialDocuments.map((doc) => {
                  const displayNumber = getDocumentDisplayNumber(doc) ?? "-";
                  const displayExpiry = formatDocumentDisplayDate(getDocumentDisplayExpiry(doc));
                  const dispositionLabel = getDocumentDispositionLabel(getDocumentDisposition(doc));
                  const typeLabel = getDocumentTypeLabel(doc.type);
                  const candidateName = `${doc.candidate?.firstName ?? ""} ${doc.candidate?.lastName ?? ""}`.trim() || "Sin candidato asignado";
                  const filename = doc.url?.split("/").pop()?.trim() || `documento-${doc.id.slice(0, 8)}`;

                  return (
                    <tr key={doc.id}>
                {canDeleteDocuments ? (
                        <td>
                          <button
                            type="button"
                            onClick={() => toggleSelect(doc.id)}
                            className="document-table-select-toggle"
                            aria-label={selectedIds.includes(doc.id) ? `Quitar selección de ${filename}` : `Seleccionar ${filename}`}
                          >
                            {selectedIds.includes(doc.id) ? (
                              <CheckSquare size={18} color="var(--amber-flame)" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                      ) : null}
                      <td>
                        <div className="document-table-file-cell">
                          <FileText size={16} />
                          {filename}
                        </div>
                      </td>
                      <td>{candidateName}</td>
                      <td>
                        <div className="document-table-type-cell">
                          <span>{typeLabel}</span>
                          {dispositionLabel ? (
                            <span className="document-table-type-disposition">
                              {dispositionLabel}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="document-table-number">{displayNumber}</td>
                      <td>{displayExpiry}</td>
                      <td>
                        <span className={getOcrBadgeClassName(doc.ocrStatus)}>{getOcrLabel(doc.ocrStatus)}</span>
                      </td>
                      <td>
                        <div className="document-table-actions">
                          {canReviewDocuments ? (
                            <DocumentReviewModal
                              doc={doc}
                              allDocuments={initialDocuments.filter((candidateDoc) => candidateDoc.candidateId === doc.candidateId)}
                              candidateDefaults={doc.candidate ?? undefined}
                            />
                          ) : null}
                          <Link
                            href={`/candidatos/${doc.candidateId}`}
                            className="button button-secondary document-table-action-link"
                          >
                            {doc.ocrStatus === "FAILED"
                              ? labels.fix
                              : isOcrReviewRequiredStatus(doc.ocrStatus)
                                ? labels.review
                                : isManualReviewOcrStatus(doc.ocrStatus)
                                  ? "Revisión manual"
                                : labels.verify}
                          </Link>
                          {canDeleteDocuments ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(doc.id)}
                              disabled={isDeleting}
                              aria-label={`Eliminar documento ${filename}`}
                              className="document-table-delete-button"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ConfirmDialog
          open={confirmTarget !== null}
          title={confirmTarget?.type === "bulk" ? labels.deleteBulkTitle : labels.deleteSingleTitle}
          description={
            confirmTarget?.type === "bulk"
              ? interpolate(labels.deleteBulkDescription, { count: confirmTarget.ids.length })
              : labels.deleteSingleDescription
          }
          confirmLabel={labels.deleteConfirm}
          tone="danger"
          isBusy={isDeleting}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => {
            if (confirmTarget?.type === "bulk") {
              void confirmDeleteSelected(confirmTarget.ids);
              return;
            }
            if (confirmTarget?.type === "single") {
              void confirmDeleteSingle(confirmTarget.id);
            }
          }}
        />
      </div>
    </>
  );
}

