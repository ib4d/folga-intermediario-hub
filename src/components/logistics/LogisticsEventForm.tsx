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
  const [candidateQuery, setCandidateQuery] = useState("");
  const [isCandidatePickerOpen, setIsCandidatePickerOpen] = useState(false);
  const [transportType, setTransportType] = useState("AVION");
  const [formMessage, setFormMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
  const selectedChecklist = selectedCandidate ? getCandidateDocumentChecklist(selectedCandidate) : null;
  const selectedOutcome = selectedCandidate ? getCandidateLegalOutcome(selectedCandidate) : null;
  const selectedArrivalReadiness = selectedCandidate ? getArrivalReadiness(selectedCandidate) : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await createLogisticsEvent(formData);
      form.reset();
      setSelectedCandidateId("");
      setCandidateQuery("");
      setTransportType("AVION");
      setFormMessage({ tone: "success", text: "Llegada programada correctamente." });
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear evento";
      setFormMessage({ tone: "error", text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidateLabel = (candidate: Props["candidates"][number]) =>
    `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Candidato sin nombre";

  const candidateSearchText = (candidate: Props["candidates"][number]) =>
    [
      candidateLabel(candidate),
      candidate.country,
      candidate.status,
      candidate.passportNumber,
      candidate.peselNumber,
      candidate.phone,
      candidate.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const filteredCandidates = candidates
    .filter((candidate) =>
      candidateSearchText(candidate).includes(candidateQuery.trim().toLowerCase())
    )
    .slice(0, 12);

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem" }}>
      <h3
        style={{
          fontSize: "1.5rem",
          fontWeight: "900",
          textTransform: "uppercase",
          marginBottom: "1.25rem",
          overflowWrap: "anywhere",
        }}
      >
        Programar Nueva Llegada
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Candidato</label>
          <input type="hidden" name="candidateId" value={selectedCandidateId} />
          <div style={{ position: "relative" }}>
            <input
              type="search"
              className="input"
              required
              value={candidateQuery}
              onChange={(event) => {
                setCandidateQuery(event.target.value);
                setSelectedCandidateId("");
                setIsCandidatePickerOpen(true);
              }}
              onFocus={() => setIsCandidatePickerOpen(true)}
              placeholder="Buscar por nombre, pasaporte, PESEL, país..."
              disabled={candidates.length === 0}
              autoComplete="off"
            />
            {isCandidatePickerOpen && candidates.length > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 20,
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    maxHeight: "260px",
                    overflowY: "auto",
                    overflowX: "hidden",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--background)",
                    boxShadow: "8px 8px 0 var(--shadow)",
                  }}
                >
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSelectedCandidateId(candidate.id);
                        setCandidateQuery(candidateLabel(candidate));
                        setIsCandidatePickerOpen(false);
                      }}
                      style={{
                        width: "100%",
                        border: 0,
                        borderBottom: "1px solid var(--border-subtle)",
                        background: selectedCandidateId === candidate.id ? "var(--primary)" : "var(--background)",
                        color: "var(--foreground)",
                        padding: "0.8rem",
                        textAlign: "left",
                        cursor: "pointer",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <strong style={{ display: "block", textTransform: "uppercase" }}>
                        {candidateLabel(candidate)}
                      </strong>
                      <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                        {candidate.country?.toUpperCase() ?? "SIN PAIS"} - {candidate.status.replaceAll("_", " ")}
                        {candidate.passportNumber ? ` - PAS ${candidate.passportNumber}` : ""}
                        {candidate.peselNumber ? ` - PESEL ${candidate.peselNumber}` : ""}
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "0.9rem", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                    Sin coincidencias. Prueba con nombre, pasaporte, PESEL o país.
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {candidates.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
              No hay candidatos activos disponibles para programar.
            </p>
          ) : !selectedCandidateId ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
              Escribe para filtrar y selecciona un candidato de la lista.
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
            <option value="AVION">Avión</option>
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

      {formMessage ? (
        <p className={formMessage.tone === "success" ? "form-message-success" : "form-message-error"}>
          {formMessage.text}
        </p>
      ) : null}
    </form>
  );
}
