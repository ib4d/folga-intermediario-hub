"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2 } from "lucide-react";

function normalizeUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido";

  if (
    message.includes("Failed to find Server Action") ||
    message.includes("older or newer deployment") ||
    message.includes("was not found on the server")
  ) {
    return "La aplicacion se actualizo mientras esta pagina estaba abierta. Recarga la pagina e intenta subir el documento otra vez.";
  }

  if (message.toLowerCase().includes("fetch failed")) {
    return "No se pudo completar la subida porque la conexion con el servidor se interrumpio. Recarga la pagina e intenta nuevamente.";
  }

  return `No se pudo completar la subida: ${message}`;
}

export default function DocumentUploadButton({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState("PASSPORT");
  const [file, setFile] = useState<File | null>(null);
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
    if (!file) return;

    startTransition(async () => {
      setMessage(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("candidateId", candidateId);
        formData.append("type", type);

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const res = (await response.json()) as {
          success: boolean;
          message?: string;
          ocrStatus?: "captured" | "failed" | "not_supported";
        };

        if (!response.ok) {
          throw new Error(res.message || "Error al subir documento.");
        }

        if (res.success) {
          setIsOpen(false);
          setFile(null);
          router.refresh();
          setMessage({
            tone: res.ocrStatus === "failed" ? "warning" : "success",
            text: res.message || "Documento subido correctamente.",
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
                <label className="label">Archivo (PDF o Imagen)</label>
                <input
                  type="file"
                  className="input"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

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
                disabled={isPending || !file}
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Subiendo...
                  </>
                ) : (
                  "Empezar Proceso OCR"
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
