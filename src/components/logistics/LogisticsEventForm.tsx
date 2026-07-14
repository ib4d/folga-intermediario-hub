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
    <form onSubmit={handleSubmit} className="card logistics-event-form">
      <h3 className="logistics-event-form-title">
        Programar Nueva Llegada
      </h3>

      <div className="logistics-event-form-grid">
        <div className="input-group logistics-event-form-group">
          <label className="label">Candidato</label>
          <input type="hidden" name="candidateId" value={selectedCandidateId} />
          <div className="logistics-event-form-search">
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
                <div className="logistics-event-form-picker">
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
              className={`logistics-event-form-picker-item ${selectedCandidateId === candidate.id ? "is-selected" : ""}`}
            >
                       <strong className="logistics-event-form-picker-title">
                        {candidateLabel(candidate)}
                      </strong>
                      <span className="logistics-event-form-picker-meta">
                        {candidate.country?.toUpperCase() ?? "SIN PAIS"} - {candidate.status.replaceAll("_", " ")}
                        {candidate.passportNumber ? ` - PAS ${candidate.passportNumber}` : ""}
                        {candidate.peselNumber ? ` - PESEL ${candidate.peselNumber}` : ""}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="logistics-event-form-picker-empty">
                    Sin coincidencias. Prueba con nombre, pasaporte, PESEL o país.
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {candidates.length === 0 ? (
            <p className="logistics-event-form-help">
              No hay candidatos activos disponibles para programar.
            </p>
          ) : !selectedCandidateId ? (
            <p className="logistics-event-form-help">
              Escribe para filtrar y selecciona un candidato de la lista.
            </p>
          ) : null}
        </div>

        <div className="input-group logistics-event-form-group">
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

        <div className="input-group logistics-event-form-group">
          <label className="label">Fecha y Hora de Llegada</label>
          <input type="datetime-local" name="arrivalDate" className="input" required />
        </div>

        <div className="input-group logistics-event-form-group">
          <label className="label">Terminal / Estacion</label>
          <input
            type="text"
            name="terminal"
            className="input"
            placeholder="Ej: Chopin Airport, Kutno PKP..."
            required
          />
        </div>

        <div className="input-group logistics-event-form-group">
          <label className="label">Vuelo / Tren / Placa</label>
          <input
            type="text"
            name="flightOrTrain"
            className="input"
            placeholder="Ej: FR1234, WAW-KUT..."
          />
        </div>

        <div className="input-group logistics-event-form-group">
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
        <div className="logistics-event-form-summary">
          <div className="logistics-event-form-badges">
            <span className={`status-badge logistics-event-form-badge ${selectedChecklist?.isReadyForLegal ? "logistics-event-form-badge--success" : "logistics-event-form-badge--danger"}`}>
              {selectedChecklist?.isReadyForLegal ? "LISTO LEGAL" : "REVISAR DOCUMENTOS"}
            </span>
            {selectedArrivalReadiness ? (
              <span className={`status-badge logistics-event-form-badge ${selectedArrivalReadiness.isReadyForArrival ? "logistics-event-form-badge--success" : "logistics-event-form-badge--warning"}`}>
                {selectedArrivalReadiness.statusLabel.toUpperCase()}
              </span>
            ) : null}
            {selectedCandidate.logistics.length > 0 ? (
              <span className="status-badge logistics-event-form-badge logistics-event-form-badge--info">
                {selectedCandidate.logistics.length} EVENTO(S) PREVIOS
              </span>
            ) : null}
          </div>

          {selectedOutcome?.category ? (
            <div className="logistics-event-form-category">
              {selectedOutcome.category}
            </div>
          ) : null}

          {selectedOutcome?.followUpActions.length ? (
            <div className="logistics-event-form-note">
              Seguimiento: {selectedOutcome.followUpActions.join(", ")}
            </div>
          ) : (
            <div className="logistics-event-form-note">
              Sin acciones de seguimiento pendientes registradas por legal.
            </div>
          )}

          {selectedArrivalReadiness?.blockers.length ? (
            <div className="logistics-event-form-note logistics-event-form-note--danger">
              Bloqueos de llegada: {selectedArrivalReadiness.blockers.join(", ")}
            </div>
          ) : null}

          {selectedArrivalReadiness?.warnings.length ? (
            <div className="logistics-event-form-note logistics-event-form-note--warning">
              Alertas: {selectedArrivalReadiness.warnings.join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="input-group logistics-event-form-group">
        <label className="label">Notas Adicionales</label>
        <textarea
          name="notes"
          className="input logistics-event-form-notes"
          placeholder="Cualquier detalle relevante..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || candidates.length === 0 || !selectedCandidateId}
        className="button logistics-event-form-submit"
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
