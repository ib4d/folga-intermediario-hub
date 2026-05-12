"use client";

import { useState } from "react";
import { Candidate, Document, LogisticsEvent } from "@prisma/client";
import { createLogisticsEvent } from "@/app/actions/logistics";
import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";

interface Props {
  candidates: (Candidate & { documents: Document[]; logistics: LogisticsEvent[] })[];
  onSuccess?: () => void;
}

export default function LogisticsEventForm({ candidates, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [transportType, setTransportType] = useState("AVION");
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
  const selectedChecklist = selectedCandidate ? getCandidateDocumentChecklist(selectedCandidate) : null;
  const selectedOutcome = selectedCandidate ? getCandidateLegalOutcome(selectedCandidate) : null;
  const selectedArrivalReadiness = selectedCandidate ? getArrivalReadiness(selectedCandidate) : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      await createLogisticsEvent(formData);
      e.currentTarget.reset();
      setSelectedCandidateId("");
      setTransportType("AVION");
      onSuccess?.();
    } catch {
      alert("Error al crear evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem" }}>
      <h3
        style={{
          fontSize: "1.5rem",
          fontWeight: "900",
          textTransform: "uppercase",
          marginBottom: "1.25rem",
        }}
      >
        Programar Nueva Llegada
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Candidato</label>
          <select
            name="candidateId"
            className="select"
            required
            value={selectedCandidateId}
            onChange={(event) => setSelectedCandidateId(event.target.value)}
            disabled={candidates.length === 0}
          >
            <option value="">Seleccione...</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.firstName?.toUpperCase()} {candidate.lastName?.toUpperCase()} (
                {candidate.country?.toUpperCase()})
              </option>
            ))}
          </select>
          {candidates.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
              No hay candidatos aprobados disponibles para programar.
            </p>
          ) : null}
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Medio de Transporte</label>
          <select
            name="transportType"
            className="select"
            required
            value={transportType}
            onChange={(event) => setTransportType(event.target.value)}
          >
            <option value="AVION">Avion</option>
            <option value="TREN">Tren</option>
            <option value="COCHE_EMPRESA">Coche Empresa</option>
            <option value="PROPIO">Propio / Flixbus</option>
          </select>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Fecha y Hora de Llegada</label>
          <input type="datetime-local" name="arrivalDate" className="input" required />
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Terminal / Estacion</label>
          <input
            type="text"
            name="terminal"
            className="input"
            placeholder="Ej: Chopin Airport, Kutno PKP..."
            required
          />
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Vuelo / Tren / Placa</label>
          <input
            type="text"
            name="flightOrTrain"
            className="input"
            placeholder="Ej: FR1234, WAW-KUT..."
          />
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Recoge</label>
          <input
            type="text"
            name="pickedUpBy"
            className="input"
            placeholder="Nombre del responsable..."
          />
        </div>
      </div>

      {selectedCandidate ? (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            backgroundColor: "var(--white-smoke)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <span className="status-badge" style={{ backgroundColor: selectedChecklist?.isReadyForLegal ? "#dcfce7" : "#fee2e2", color: selectedChecklist?.isReadyForLegal ? "#166534" : "#991b1b" }}>
              {selectedChecklist?.isReadyForLegal ? "LISTO LEGAL" : "REVISAR DOCUMENTOS"}
            </span>
            {selectedArrivalReadiness ? (
              <span
                className="status-badge"
                style={{
                  backgroundColor: selectedArrivalReadiness.isReadyForArrival ? "#dcfce7" : "#fef3c7",
                  color: selectedArrivalReadiness.isReadyForArrival ? "#166534" : "#92400e",
                }}
              >
                {selectedArrivalReadiness.statusLabel.toUpperCase()}
              </span>
            ) : null}
            {selectedCandidate.logistics.length > 0 ? (
              <span className="status-badge" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
                {selectedCandidate.logistics.length} EVENTO(S) PREVIOS
              </span>
            ) : null}
          </div>

          {selectedOutcome?.category ? (
            <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#4338ca", textTransform: "uppercase" }}>
              {selectedOutcome.category}
            </div>
          ) : null}

          {selectedOutcome?.followUpActions.length ? (
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--muted-foreground)" }}>
              Seguimiento: {selectedOutcome.followUpActions.join(", ")}
            </div>
          ) : (
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--muted-foreground)" }}>
              Sin acciones de seguimiento pendientes registradas por legal.
            </div>
          )}

          {selectedArrivalReadiness?.blockers.length ? (
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#991b1b" }}>
              Bloqueos de llegada: {selectedArrivalReadiness.blockers.join(", ")}
            </div>
          ) : null}

          {selectedArrivalReadiness?.warnings.length ? (
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#92400e" }}>
              Alertas: {selectedArrivalReadiness.warnings.join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="label">Notas Adicionales</label>
        <textarea
          name="notes"
          className="input"
          style={{ minHeight: "88px", resize: "vertical" }}
          placeholder="Cualquier detalle relevante..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || candidates.length === 0 || !selectedCandidateId}
        className="button"
        style={{ width: "100%", marginTop: "1rem" }}
      >
        {isSubmitting ? "Programando..." : "Programar Llegada"}
      </button>
    </form>
  );
}
