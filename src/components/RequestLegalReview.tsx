"use client";

import { useTransition, useState } from "react";
import { CheckCircle } from "lucide-react";

export default function RequestLegalReview({ candidateId, currentStatus }: { candidateId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(currentStatus === "EN_REVISION");

  const handleRequest = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/candidates/${candidateId}/request-review`, {
          method: "POST",
        });
        if (res.ok) {
          setSent(true);
        } else {
          const data = await res.json();
          alert(data.error || "Error al solicitar revisión");
        }
      } catch {
        alert("Error de conexión");
      }
    });
  };

  if (sent) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "rgba(0,0,0,0.1)", borderRadius: "4px" }}>
        <CheckCircle size={20} />
        <span style={{ fontWeight: "bold" }}>Revisión legal solicitada</span>
      </div>
    );
  }

  return (
    <button 
      onClick={handleRequest}
      disabled={isPending}
      className="button" 
      style={{ width: '100%', backgroundColor: 'var(--pitch-black)', color: 'var(--amber-flame)' }}
    >
      {isPending ? "Enviando..." : "Solicitar Revisión Legal"}
    </button>
  );
}
