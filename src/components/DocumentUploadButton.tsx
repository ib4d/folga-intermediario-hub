"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2 } from "lucide-react";

type UploadResponse = {
  success: boolean;
  message?: string;
  ocrStatus?: "captured" | "failed" | "not_supported" | "manual_review";
  results?: Array<{ filename: string; success: boolean; message: string }>;
};

function normalizeUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido";

  if (
    message.includes("Failed to find Server Action") ||
    message.includes("older or newer deployment") ||
    message.includes("was not found on the server")
  ) {
    return "La aplicación se actualizó mientras esta página estaba abierta. Recarga la página e intenta subir el documento otra vez.";
  }

  if (message.toLowerCase().includes("fetch failed")) {
    return "No se pudo completar la subida porque la conexión con el servidor se interrumpió. Recarga la página e intenta nuevamente.";
  }

  return `No se pudo completar la subida: ${message}`;
}

async function parseUploadResponse(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return {} as UploadResponse;
  }

  try {
    return JSON.parse(raw) as UploadResponse;
  } catch {
    if (response.ok) {
      return {
        success: true,
        message:
          "Documento guardado. El servidor devolvió una respuesta inesperada, pero la subida probablemente ya quedó registrada. Recarga la página para confirmarlo.",
        ocrStatus: "manual_review",
      } satisfies UploadResponse;
    }

    throw new Error(
      raw.startsWith("<")
        ? "El servidor devolvió una página inesperada en lugar de JSON."
        : raw,
    );
  }
}

export default function DocumentUploadButton({
  candidateId,
  ocrMode = "automatic",
  ocrDescription,
}: {
  candidateId: string;
  ocrMode?: "manual" | "automatic";
  ocrDescription?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState("PASSPORT");
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    startTransition(async () => {
      setMessage(null);
      try {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }
        formData.append("candidateId", candidateId);
        formData.append("docType", type);
        formData.append("mode", "manual");

        const response = await fetch("/api/documents/batch-upload", {
          method: "POST",
          body: formData,
        });
        const res = await parseUploadResponse(response);
        const successfulResults = Array.isArray(res.results)
          ? res.results.filter((item) => item.success)
          : [];
        const failedResults = Array.isArray(res.results)
          ? res.results.filter((item) => !item.success)
          : [];
        const hasPartialSuccess = successfulResults.length > 0 && failedResults.length > 0;
        const hasAnySuccess = successfulResults.length > 0;

        if (!response.ok && !hasAnySuccess) {
          throw new Error(res.message || "Error al subir documento.");
        }

        if (res.success || hasAnySuccess) {
          setIsOpen(false);
          setFiles([]);
          router.refresh();
          const uploadedCount = files.length;
          setMessage({
            tone:
              hasPartialSuccess || res.ocrStatus === "failed" || res.ocrStatus === "manual_review"
                ? "warning"
                : "success",
            text:
              res.message ||
              (hasPartialSuccess
                ? `Se guardaron ${successfulResults.length} documento(s), pero ${failedResults.length} fallo/fallaron.`
                : res.ocrStatus === "failed" || res.ocrStatus === "manual_review"
                ? `Documento${uploadedCount > 1 ? "s guardados" : " guardado"}. Queda pendiente de revision manual.`
                : uploadedCount > 1
                  ? "Documentos subidos correctamente."
                  : "Documento subido correctamente."),
          });
        } else {
          setMessage({ tone: "error", text: res.message || "Error al subir documento." });
        }
      } catch (err) {
        console.error(err);
        setMessage({ tone: "error", text: normalizeUploadErrorMessage(err) });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="button"
        style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
      >
        <Upload size={16} /> Subir Documento
      </button>

      {message ? (
        <p className={messageClassName(message.tone)} style={{ marginTop: "0.75rem" }}>
          {message.text}
        </p>
      ) : null}

      {isOpen ? (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel card"
            style={{ maxWidth: "560px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="icon-button"
              style={{ position: "absolute", right: "1rem", top: "1rem" }}
            >
              <X size={24} />
            </button>

            <h2 style={{ marginBottom: "1.5rem", paddingRight: "3rem" }}>Subir Nuevo Documento</h2>

            {ocrDescription ? (
              <div className="form-message-warning" style={{ marginBottom: "1rem" }}>
                {ocrDescription}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="compact-stack">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Tipo de Documento</label>
                <select
                  className="select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="KARTA_POBYTU">Karta Pobytu</option>
                  <option value="PESEL">PESEL</option>
                  <option value="DECYZJA_WOJEWODY">Decyzja Wojewody</option>
                  <option value="CV">CV / Otros</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Archivo(s) (PDF o Imagen)</label>
                <input
                  type="file"
                  className="input"
                  accept="application/pdf,image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  required
                />
                {files.length > 0 ? (
                  <div className="text-xs text-gray-500">{files.length} archivo(s) seleccionado(s)</div>
                ) : null}
              </div>

              {ocrMode === "manual" ? (
                <div className="form-message-warning">
                  El documento se guardará correctamente y quedará pendiente de revisión manual.
                </div>
              ) : null}

              <button
                type="submit"
                className="button"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                disabled={isPending || files.length === 0}
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Subiendo...
                  </>
                ) : (
                  "Subir documento"
                )}
              </button>

              {message?.tone === "error" ? <p className="form-message-error">{message.text}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function messageClassName(tone: "success" | "warning" | "error") {
  if (tone === "success") return "form-message-success";
  if (tone === "warning") return "form-message-warning";
  return "form-message-error";
}
