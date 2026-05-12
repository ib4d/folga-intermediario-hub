"use client";

import { AlertTriangle, CheckCircle, Send } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

export default function RequestLegalReview({
  candidateId,
  currentStatus,
  isReadyForLegal,
  blockers,
  missing,
}: {
  candidateId: string;
  currentStatus: string;
  isReadyForLegal: boolean;
  blockers: string[];
  missing: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(currentStatus === "EN_REVISION_LEGAL");
  const [lastError, setLastError] = useState<string | null>(null);

  const guidance = useMemo(() => {
    if (blockers.length > 0) return blockers;
    if (missing.length > 0) return missing.map((item) => `Falta ${item}`);
    return [];
  }, [blockers, missing]);

  const handleRequest = () => {
    startTransition(async () => {
      setLastError(null);
      try {
        const response = await fetch(`/api/candidates/${candidateId}/request-review`, {
          method: "POST",
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          setSent(true);
          return;
        }

        const nextError =
          typeof data?.error === "string" ? data.error : "Error al solicitar revision";
        setLastError(nextError);
        alert(nextError);
      } catch {
        const nextError = "Error de conexion";
        setLastError(nextError);
        alert(nextError);
      }
    });
  };

  if (sent) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "rgba(0,0,0,0.1)", borderRadius: "4px" }}>
        <CheckCircle size={20} />
        <span style={{ fontWeight: "bold" }}>Revision legal solicitada</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {!isReadyForLegal && guidance.length > 0 ? (
        <div
          style={{
            padding: "0.85rem",
            backgroundColor: "#fef3c7",
            border: "1px solid #d97706",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 900, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.35rem", color: "#92400e" }}>
            <AlertTriangle size={14} /> Antes de enviar a legal
          </div>
          <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.8rem", color: "#78350f", fontWeight: 700 }}>
            {guidance.slice(0, 3).map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {lastError ? (
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#991b1b" }}>{lastError}</div>
      ) : null}

      <button
        onClick={handleRequest}
        disabled={isPending || !isReadyForLegal}
        className="button"
        style={{
          width: "100%",
          backgroundColor: "var(--pitch-black)",
          color: "var(--amber-flame)",
          opacity: isPending || !isReadyForLegal ? 0.55 : 1,
          cursor: isPending || !isReadyForLegal ? "not-allowed" : "pointer",
        }}
      >
        <Send size={16} />
        {isPending ? "Enviando..." : "Solicitar Revision Legal"}
      </button>
    </div>
  );
}
