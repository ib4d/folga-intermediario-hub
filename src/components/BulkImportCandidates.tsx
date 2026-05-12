"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { importCandidatesFromExcel } from "@/app/actions/candidates";
import { useRouter } from "next/navigation";

export default function BulkImportCandidates() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await importCandidatesFromExcel(formData);
      if (res.success) {
        const summary = [
          `Filas leidas: ${res.totalRows ?? res.count ?? 0}`,
          `Creados: ${res.createdCount ?? 0}`,
          `Actualizados: ${res.updatedCount ?? res.count ?? 0}`,
          `Saltados: ${res.skippedCount ?? 0}`,
        ].join("\n");
        alert(`Importacion completada.\n\n${summary}`);
        router.refresh();
      } else {
        alert("Error al importar: " + res.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert("Error inesperado: " + msg);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleFileChange}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
        }}
        disabled={isUploading}
      />
      <button 
        className="button button-secondary" 
        style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        disabled={isUploading}
      >
        <Upload size={20} />
        {isUploading ? "Importando..." : "Añadir Database"}
      </button>
    </div>
  );
}
