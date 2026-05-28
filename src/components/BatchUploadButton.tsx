"use client";

import type { CSSProperties } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Brain, UserCircle } from "lucide-react";

function normalizeBatchUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido";

  if (
    message.includes("Failed to find Server Action") ||
    message.includes("older or newer deployment") ||
    message.includes("was not found on the server")
  ) {
    return "La aplicacion se actualizo mientras esta pagina estaba abierta. Recarga la pagina y vuelve a intentar la subida por lotes.";
  }

  if (message.toLowerCase().includes("fetch failed")) {
    return "No se pudo completar la subida porque la conexion con el servidor se interrumpio. Recarga la pagina e intenta nuevamente.";
  }

  return `No se pudo completar la subida: ${message}`;
}

const DOC_TYPES = [
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "KARTA_POBYTU", label: "Karta Pobytu" },
  { value: "PESEL", label: "PESEL" },
  { value: "DECYZJA_WOJEWODY", label: "Decyzja Wojewody" },
  { value: "CV", label: "CV / Otros" },
  { value: "OTHER", label: "Otro" },
];

export default function BatchUploadButton({
  candidates,
  ocrMode,
}: {
  candidates: { id: string; name: string }[];
  ocrMode: "manual" | "automatic";
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [docType, setDocType] = useState("PASSPORT");
  const [files, setFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<
    {
      filename: string;
      success: boolean;
      message?: string;
      reviewRequired?: boolean;
      ocrStatus?: string;
    }[] | null
  >(null);
  const [isSmartMode, setIsSmartMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const automaticOcrAvailable = ocrMode === "automatic";

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
    if (isSmartMode && !automaticOcrAvailable) {
      setErrorMessage(
        "El modo inteligente no esta disponible en este momento. La carga manual sigue activa."
      );
      return;
    }
    if (!files || (!isSmartMode && !selectedCandidateId)) return;

    startTransition(async () => {
      setErrorMessage("");
      try {
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append("files", file));
        formData.append("candidateId", selectedCandidateId);
        formData.append("mode", isSmartMode ? "smart" : "manual");
        if (!isSmartMode) {
          formData.append("docType", docType);
        }

        const response = await fetch("/api/documents/batch-upload", {
          method: "POST",
          body: formData,
        });
        const res = (await response.json()) as {
          success: boolean;
          results?: {
            filename: string;
            success: boolean;
            message?: string;
            reviewRequired?: boolean;
            ocrStatus?: string;
          }[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            res.message ||
              "No se pudo iniciar la subida por lotes. Revisa permisos, archivos seleccionados e intenta de nuevo."
          );
        }

        if (res.success) {
          const nextResults = res.results || [];
          setResults(nextResults);
          const failedCount = nextResults.filter((result) => !result.success).length;
          const reviewCount = nextResults.filter((result) => result.reviewRequired).length;

          if (failedCount > 0) {
            setErrorMessage(
              `${failedCount} archivo(s) no se pudieron guardar. Los demas documentos procesados correctamente ya quedaron almacenados.`
            );
          } else if (reviewCount > 0) {
            setErrorMessage(
              `${reviewCount} archivo(s) quedaron guardados y requieren revision manual antes de completar datos del candidato.`
            );
          }
          router.refresh();
        } else {
          setErrorMessage(
            "No se pudo iniciar la subida por lotes. Revisa permisos, archivos seleccionados e intenta de nuevo."
          );
        }
      } catch (error) {
        console.error(error);
        setErrorMessage(normalizeBatchUploadErrorMessage(error));
      }
    });
  };

  const reset = () => {
    setIsOpen(false);
    setResults(null);
    setFiles(null);
    setDocType("PASSPORT");
    setSelectedCandidateId("");
    setIsSmartMode(false);
    setErrorMessage("");
  };

  const switchMode = (nextMode: "manual" | "smart") => {
    if (nextMode === "smart" && !automaticOcrAvailable) {
      setErrorMessage(
        "El modo inteligente no esta disponible en este momento. La carga manual sigue activa."
      );
      setIsSmartMode(false);
      return;
    }

    setErrorMessage("");
    setIsSmartMode(nextMode === "smart");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setResults(null);
          setErrorMessage("");
        }}
        className="button"
      >
        <Upload size={18} /> Subir Lote
      </button>

      {isOpen ? (
        <div className="modal-overlay" onClick={reset}>
          <div
            className="modal-panel card"
            style={{ maxWidth: "680px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={reset}
              className="icon-button"
              style={{ position: "absolute", right: "1rem", top: "1rem" }}
            >
              <X size={24} />
            </button>

            <h2 style={{ marginBottom: "0.5rem", paddingRight: "3rem" }}>Subida de Documentos</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
              Selecciona el modo de carga para procesar multiples archivos.
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1.5rem",
                padding: "0.5rem",
                backgroundColor: "var(--surface-muted)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => switchMode("manual")}
                style={modeButtonStyle(!isSmartMode)}
              >
                <UserCircle size={18} /> Manual
              </button>
              <button
                type="button"
                onClick={() => switchMode("smart")}
                style={{
                  ...modeButtonStyle(isSmartMode),
                  opacity: automaticOcrAvailable ? 1 : 0.55,
                  cursor: automaticOcrAvailable ? "pointer" : "not-allowed",
                }}
                disabled={!automaticOcrAvailable}
              >
                <Brain size={18} /> Inteligente
              </button>
            </div>

            {!results ? (
              <form onSubmit={handleSubmit} className="compact-stack">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="label">Seleccionar Candidato</label>
                  <select
                    className="select"
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    required={!isSmartMode}
                  >
                    <option value="">
                      {isSmartMode
                        ? "Opcional: dejar vacio para detectar o crear candidato"
                        : "Seleccione un candidato..."}
                    </option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="label">Tipo de Documento</label>
                  <select
                    className="select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    required
                    disabled={isSmartMode}
                  >
                    {DOC_TYPES.map((doc) => (
                      <option key={doc.value} value={doc.value}>
                        {doc.label}
                      </option>
                    ))}
                  </select>
                </div>

                {isSmartMode ? (
                  <div
                    style={{
                      padding: "1rem",
                      border: "1px dashed var(--amber-flame)",
                      backgroundColor: "rgba(252, 186, 4, 0.08)",
                      borderRadius: "8px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "0.875rem" }}>
                      <strong>Modo Inteligente:</strong> procesa documentos de forma automatica
                      cuando el proveedor OCR esta activo. Si no esta disponible, la carga manual
                      sigue activa.
                    </p>
                  </div>
                ) : !automaticOcrAvailable ? (
                  <div
                    style={{
                      padding: "1rem",
                      border: "1px dashed var(--amber-flame)",
                      backgroundColor: "rgba(252, 186, 4, 0.08)",
                      borderRadius: "8px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "0.875rem" }}>
                      <strong>Modo Manual activo:</strong> los documentos se guardaran de forma
                      real en la app y quedaran pendientes de revision manual.
                    </p>
                  </div>
                ) : null}

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="label">Archivos (puedes seleccionar varios)</label>
                  <input
                    type="file"
                    className="input"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={(e) => setFiles(e.target.files)}
                    required
                  />
                  {files ? (
                    <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                      {files.length} archivo(s) seleccionado(s)
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="button"
                  style={{ width: "100%" }}
                  disabled={isPending || !files || (!isSmartMode && !selectedCandidateId)}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={20} /> Subiendo documentos...
                    </>
                  ) : (
                    isSmartMode ? "Subir y procesar" : "Subir documentos"
                  )}
                </button>

                {errorMessage ? <p className="form-message-error">{errorMessage}</p> : null}
              </form>
            ) : (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>Resultados del Procesamiento</h3>
                <BatchResultSummary results={results} />
                {errorMessage ? <p className="form-message-error">{errorMessage}</p> : null}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {results.map((result, index) => (
                    <div
                      key={`${result.filename}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.75rem",
                        backgroundColor: "var(--white-smoke)",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {result.success ? (
                        result.reviewRequired ? (
                          <AlertCircle size={18} color="#d97706" />
                        ) : (
                          <CheckCircle2 size={18} color="green" />
                        )
                      ) : (
                        <AlertCircle size={18} color="red" />
                      )}
                      <span style={{ fontSize: "0.875rem", flex: 1, fontWeight: "bold" }}>
                        {result.filename}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: result.success
                            ? result.reviewRequired
                              ? "#b45309"
                              : "green"
                            : "red",
                        }}
                      >
                        {result.message ||
                          (result.success
                            ? result.reviewRequired
                              ? "Guardado; pendiente de revision manual"
                              : isSmartMode
                                ? "Procesado automaticamente"
                                : "Documento guardado"
                            : "Error")}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="button"
                  style={{ width: "100%", marginTop: "1.5rem" }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function BatchResultSummary({
  results,
}: {
  results: { success: boolean; reviewRequired?: boolean }[];
}) {
  const successCount = results.filter((result) => result.success).length;
  const reviewCount = results.filter((result) => result.reviewRequired).length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "0.5rem",
        marginBottom: "1rem",
      }}
    >
      <ResultMetric label="Archivos" value={results.length} tone="neutral" />
      <ResultMetric label="Guardados" value={successCount} tone="success" />
      <ResultMetric
        label="Revisar"
        value={reviewCount}
        tone={reviewCount > 0 ? "warning" : "neutral"}
      />
    </div>
  );
}

function ResultMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "warning";
}) {
  const colors = {
    neutral: { background: "var(--white-smoke)", border: "var(--border-subtle)", color: "var(--pitch-black)" },
    success: { background: "#dcfce7", border: "#86efac", color: "#166534" },
    warning: { background: "#fef3c7", border: "#f59e0b", color: "#92400e" },
  }[tone];

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.background,
        color: colors.color,
        padding: "0.75rem",
        borderRadius: "8px",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: "0.25rem 0 0", fontSize: "1.35rem", fontWeight: 900 }}>{value}</p>
    </div>
  );
}

function modeButtonStyle(active: boolean) {
  return {
    flex: 1,
    padding: "0.75rem",
    border: "1px solid transparent",
    borderRadius: "8px",
    backgroundColor: active ? "var(--amber-flame)" : "transparent",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  } satisfies CSSProperties;
}
