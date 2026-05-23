"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/app/actions/documents";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleDelete = async () => {
    setIsConfirmOpen(false);
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteDocument(documentId);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrorMessage(`Error al eliminar documento: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: "0.35rem" }}>
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={isDeleting}
        style={{
          background: "none",
          border: "none",
          color: "#dc2626",
          cursor: isDeleting ? "not-allowed" : "pointer",
          padding: "0.25rem",
          opacity: isDeleting ? 0.5 : 1,
        }}
        title="Eliminar Documento"
      >
        <Trash2 size={16} />
      </button>
      {errorMessage ? (
        <span className="form-message-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
      <ConfirmDialog
        open={isConfirmOpen}
        title="Eliminar documento"
        description="Se eliminara este documento del expediente. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
        isBusy={isDeleting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </span>
  );
}
