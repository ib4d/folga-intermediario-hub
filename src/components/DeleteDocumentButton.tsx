"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/app/actions/documents";

export default function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar este documento?")) return;
    
    setIsDeleting(true);
    try {
      await deleteDocument(documentId);
      router.refresh();
    } catch (err: any) {
      alert("Error al eliminar documento: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      style={{
        background: 'none',
        border: 'none',
        color: '#dc2626',
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        padding: '0.25rem',
        opacity: isDeleting ? 0.5 : 1
      }}
      title="Eliminar Documento"
    >
      <Trash2 size={16} />
    </button>
  );
}
