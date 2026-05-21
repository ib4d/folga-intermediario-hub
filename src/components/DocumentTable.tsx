"use client";

import { useState } from "react";
import { CheckSquare, FileText, Loader2, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/app/actions/documents";
import DocumentReviewModal from "@/components/DocumentReviewModal";
import {
  formatDocumentDisplayDate,
  getDocumentDisplayExpiry,
  getDocumentDisposition,
  getDocumentDispositionLabel,
  getDocumentDisplayNumber,
} from "@/lib/document-display";

type Document = {
  id: string;
  url: string;
  type: string;
  number: string | null;
  expiryDate: string | Date | null;
  issueDate: string | Date | null;
  ocrStatus: string | null;
  extractedData: Record<string, unknown> | null;
  isVerified: boolean;
  candidateId: string;
  candidate: {
    firstName: string | null;
    lastName: string | null;
  };
};

export default function DocumentTable({
  initialDocuments,
  canReviewDocuments,
  canDeleteDocuments,
}: {
  initialDocuments: Document[];
  canReviewDocuments: boolean;
  canDeleteDocuments: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

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
    if (ocrStatus === "REVIEW_REQUIRED" || ocrStatus === "OCR_CAPTURED" || ocrStatus === "SUCCESS") {
      return "status-badge active";
    }
    return "status-badge";
  };

  const getOcrLabel = (ocrStatus: string | null) => {
    if (ocrStatus === "OCR_CAPTURED") return "OCR CAPTURADO";
    return ocrStatus || "PENDIENTE";
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Seguro que deseas eliminar ${selectedIds.length} documentos?`)) return;

    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteDocument(id);
      }
      setSelectedIds([]);
      router.refresh();
      alert("Documentos eliminados con exito");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      alert(`Error al eliminar algunos documentos: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm("Seguro que deseas eliminar este documento?")) return;

    setIsDeleting(true);
    try {
      await deleteDocument(id);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      alert(`Error al eliminar documento: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="card">
      <div
        className="card-header"
        style={{
          borderBottom: "2px solid var(--pitch-black)",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Documentos Procesados</h2>
        {canDeleteDocuments && selectedIds.length > 0 ? (
          <button
            className="button button-secondary"
            style={{ backgroundColor: "#fee2e2", color: "#dc2626", borderColor: "#dc2626" }}
            onClick={handleDeleteSelected}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            Eliminar Seleccionados ({selectedIds.length})
          </button>
        ) : null}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {canDeleteDocuments ? (
                <th style={{ width: "40px" }}>
                  <button onClick={toggleSelectAll} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    {selectedIds.length === initialDocuments.length && initialDocuments.length > 0 ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
              ) : null}
              <th>Archivo</th>
              <th>Candidato</th>
              <th>Tipo</th>
              <th>Numero</th>
              <th>Expiracion</th>
              <th>Estado OCR</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {initialDocuments.length === 0 ? (
              <tr>
                <td colSpan={canDeleteDocuments ? 8 : 7} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                  No hay documentos procesados
                </td>
              </tr>
            ) : (
              initialDocuments.map((doc) => {
                const displayNumber = getDocumentDisplayNumber(doc) ?? "-";
                const displayExpiry = formatDocumentDisplayDate(getDocumentDisplayExpiry(doc));
                const dispositionLabel = getDocumentDispositionLabel(getDocumentDisposition(doc));

                return (
                  <tr key={doc.id}>
                    {canDeleteDocuments ? (
                      <td>
                        <button
                          onClick={() => toggleSelect(doc.id)}
                          style={{ background: "none", border: "none", cursor: "pointer" }}
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
                      <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FileText size={16} />
                        {doc.url.split("/").pop()}
                      </div>
                    </td>
                    <td>
                      {doc.candidate.firstName} {doc.candidate.lastName}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <span>{doc.type}</span>
                        {dispositionLabel ? (
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)" }}>
                            {dispositionLabel}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.875rem" }}>{displayNumber}</td>
                    <td>{displayExpiry}</td>
                    <td>
                      <span className={getOcrBadgeClassName(doc.ocrStatus)}>{getOcrLabel(doc.ocrStatus)}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        {canReviewDocuments ? <DocumentReviewModal doc={doc} /> : null}
                        <Link
                          href={`/candidatos/${doc.candidateId}`}
                          className="button button-secondary"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          {doc.ocrStatus === "FAILED" ? "Corregir" : "Verificar"}
                        </Link>
                        {canDeleteDocuments ? (
                          <button
                            onClick={() => handleDeleteSingle(doc.id)}
                            disabled={isDeleting}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              opacity: isDeleting ? 0.5 : 1,
                            }}
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
    </div>
  );
}
