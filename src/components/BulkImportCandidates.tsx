"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { importCandidatesFromExcel } from "@/app/actions/candidates";
import { useRouter } from "next/navigation";

export default function BulkImportCandidates() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
    rowErrors?: Array<{ rowNumber: number; message: string }>;
  } | null>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);
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
        ].join(" | ");
        setMessage({
          tone: res.rowErrors?.length ? "error" : "success",
          text: `${res.rowErrors?.length ? "Importación parcial; revisa las filas indicadas." : "Importación completada."} ${summary}`,
          rowErrors: res.rowErrors,
        });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: `Error al importar: ${res.error}` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setMessage({ tone: "error", text: `Error inesperado: ${msg}` });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <input
          type="file"
          aria-label="Importar candidatos desde Excel o CSV"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
          }}
          disabled={isUploading}
        />
        <button
          className="button button-secondary"
          style={{ pointerEvents: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
          disabled={isUploading}
        >
          <Upload size={20} />
          {isUploading ? "Importando..." : "Anadir Database"}
        </button>
      </div>
      {message ? (
        <div
          role={message.tone === "error" ? "alert" : "status"}
          aria-live={message.tone === "error" ? "assertive" : "polite"}
          className={message.tone === "success" ? "form-message-success" : "form-message-error"}
        >
          <p style={{ margin: 0 }}>{message.text}</p>
          {message.rowErrors?.length ? (
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
              {message.rowErrors.slice(0, 8).map((item) => (
                <li key={`${item.rowNumber}-${item.message}`}>Fila {item.rowNumber}: {item.message}</li>
              ))}
              {message.rowErrors.length > 8 ? <li>Y {message.rowErrors.length - 8} filas más con incidencias.</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
