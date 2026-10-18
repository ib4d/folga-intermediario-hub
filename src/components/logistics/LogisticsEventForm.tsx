"use client";

import { useState } from "react";
import { Candidate, Document, LogisticsEvent } from "@prisma/client";
import { createLogisticsEvent } from "@/app/actions/logistics";
import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import { type AppLanguage, t } from "@/lib/i18n";

interface Props {
  candidates: (Candidate & { documents: Document[]; logistics: LogisticsEvent[] })[];
  language: AppLanguage;
  onSuccess?: () => void;
}

export default function LogisticsEventForm({ candidates, language, onSuccess }: Props) {
  const labels = t.bind(null, language);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [isCandidatePickerOpen, setIsCandidatePickerOpen] = useState(false);
  const [transportType, setTransportType] = useState("AVION");
  const [formMessage, setFormMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
  const selectedChecklist = selectedCandidate
    ? getCandidateDocumentChecklist(selectedCandidate, { includePaymentStatus: false })
    : null;
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
      setFormMessage({ tone: "success", text: labels("logistics.scheduleSuccess") });
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : labels("logistics.scheduleError");
      setFormMessage({ tone: "error", text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidateLabel = (candidate: Props["candidates"][number]) =>
    `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || labels("logistics.candidateUnnamed");

  const candidateSearchText = (candidate: Props["candidates"][number]) =>
    [
      candidateLabel(candidate),
      candidate.country,
      candidate.status,
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
    <form onSubmit={handleSubmit} className={`card logistics-event-form${selectedCandidate ? " has-selection" : ""}`}>
      <h3 className="logistics-event-form-title">
        {labels("logistics.scheduleTitle")}
      </h3>

      <div className="logistics-event-form-grid">
        <div className="input-group logistics-event-form-group">
          <label className="label" htmlFor="logistics-candidate-search">{labels("logistics.candidate")}</label>
          <input type="hidden" name="candidateId" value={selectedCandidateId} />
          <div className="logistics-event-form-search">
            <input
              type="search"
              id="logistics-candidate-search"
              className="input"
              required
              value={candidateQuery}
              onChange={(event) => {
                setCandidateQuery(event.target.value);
                setSelectedCandidateId("");
                setIsCandidatePickerOpen(true);
              }}
              onFocus={() => setIsCandidatePickerOpen(true)}
              placeholder={labels("logistics.candidateSearchPlaceholder")}
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
                        {candidate.country?.toUpperCase() ?? labels("logistics.noCountry")} - {getCandidateStatusLabel(candidate.status, labels)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="logistics-event-form-picker-empty">{labels("logistics.candidateNoMatches")}</div>
                )}
              </div>
            ) : null}
          </div>
          {candidates.length === 0 ? (
            <p className="logistics-event-form-help">
              {labels("logistics.noCandidatesToSchedule")}
            </p>
          ) : !selectedCandidateId ? (
            <p className="logistics-event-form-help">
              {labels("logistics.candidatePickerHelp")}
            </p>
          ) : null}
        </div>

        <div className="input-group logistics-event-form-group">
          <label className="label" htmlFor="logistics-transport-type">{labels("logistics.transportType")}</label>
          <select
            id="logistics-transport-type"
            name="transportType"
            className="select"
            required
            value={transportType}
            onChange={(event) => setTransportType(event.target.value)}
          >
            <option value="AVION">{labels("logistics.transportPlane")}</option>
            <option value="TREN">{labels("logistics.transportTrain")}</option>
            <option value="COCHE_EMPRESA">{labels("logistics.transportCompanyCar")}</option>
            <option value="PROPIO">{labels("logistics.transportOther")}</option>
          </select>
        </div>

        <div className="input-group logistics-event-form-group">
          <label className="label" htmlFor="logistics-arrival-date">{labels("logistics.arrivalDateTime")}</label>
          <input id="logistics-arrival-date" type="datetime-local" name="arrivalDate" className="input" required />
        </div>

        <div className="input-group logistics-event-form-group">
          <label className="label" htmlFor="logistics-terminal">{labels("logistics.terminal")}</label>
          <input
            id="logistics-terminal"
            type="text"
            name="terminal"
            className="input"
            placeholder={labels("logistics.terminalPlaceholder")}
            required
          />
        </div>

        <div className="input-group logistics-event-form-group">
          <label className="label" htmlFor="logistics-reference">{labels("logistics.reference")}</label>
          <input
            id="logistics-reference"
            type="text"
            name="flightOrTrain"
            className="input"
            placeholder={labels("logistics.referencePlaceholder")}
          />
        </div>

        <div className="input-group logistics-event-form-group">
          <label className="label" htmlFor="logistics-pickup-responsible">{labels("logistics.pickupResponsible")}</label>
          <input
            id="logistics-pickup-responsible"
            type="text"
            name="pickedUpBy"
            className="input"
            placeholder={labels("logistics.pickupPlaceholder")}
          />
        </div>
      </div>

      <div className="logistics-event-form-bottom">
        {selectedCandidate ? (
          <div className="logistics-event-form-summary">
          <div className="logistics-event-form-badges">
            <span className={`status-badge logistics-event-form-badge ${selectedChecklist?.isReadyForLegal ? "logistics-event-form-badge--success" : "logistics-event-form-badge--danger"}`}>
              {selectedChecklist?.isReadyForLegal ? labels("logistics.legalReady") : labels("logistics.reviewDocuments")}
            </span>
            {selectedArrivalReadiness ? (
              <span className={`status-badge logistics-event-form-badge ${selectedArrivalReadiness.isReadyForArrival ? "logistics-event-form-badge--success" : "logistics-event-form-badge--warning"}`}>
                {getArrivalStatusLabel(selectedArrivalReadiness, labels).toUpperCase()}
              </span>
            ) : null}
            {selectedCandidate.logistics.length > 0 ? (
              <span className="status-badge logistics-event-form-badge logistics-event-form-badge--info">
                {labels("logistics.previousEvents").replace("{count}", String(selectedCandidate.logistics.length))}
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
              {labels("logistics.followUpLabel")}: {selectedOutcome.followUpActions.join(", ")}
            </div>
          ) : (
            <div className="logistics-event-form-note">
              {labels("logistics.noLegalFollowUps")}
            </div>
          )}

          {selectedArrivalReadiness?.blockers.length ? (
            <div className="logistics-event-form-note logistics-event-form-note--danger">
              {labels("logistics.arrivalBlockers")}: {selectedArrivalReadiness.blockers.map((message) => translateArrivalMessage(message, labels)).join(", ")}
            </div>
          ) : null}

          {selectedArrivalReadiness?.warnings.length ? (
            <div className="logistics-event-form-note logistics-event-form-note--warning">
              {labels("logistics.alertsLabel")}: {selectedArrivalReadiness.warnings.map((message) => translateArrivalMessage(message, labels)).join(", ")}
            </div>
          ) : null}
          </div>
        ) : null}

        <div className="logistics-event-form-notes-submit">
          <div className="input-group logistics-event-form-group">
            <label className="label" htmlFor="logistics-additional-notes">{labels("logistics.operationalNotes")}</label>
            <textarea
              id="logistics-additional-notes"
              name="notes"
              className="input logistics-event-form-notes"
              placeholder={labels("logistics.notesPlaceholder")}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || candidates.length === 0 || !selectedCandidateId}
            className="button logistics-event-form-submit"
          >
            {isSubmitting ? labels("logistics.scheduling") : labels("logistics.scheduleButton")}
          </button>
        </div>
      </div>

      {formMessage ? (
        <p className={formMessage.tone === "success" ? "form-message-success" : "form-message-error"}>
          {formMessage.text}
        </p>
      ) : null}
    </form>
  );
}

function getCandidateStatusLabel(status: string, labels: (key: Parameters<typeof t>[1]) => string) {
  switch (status) {
    case "RECOPILANDO_DOCS":
      return labels("candidates.statusCollectingDocs");
    case "EN_REVISION_LEGAL":
      return labels("candidates.statusInLegalReview");
    case "APROBADO":
      return labels("candidates.statusApproved");
    case "RECHAZADO":
      return labels("candidates.statusRejected");
    case "REVISION_ADICIONAL":
      return labels("candidates.statusAdditionalReview");
    default:
      return status.replaceAll("_", " ");
  }
}

function getArrivalStatusLabel(
  readiness: NonNullable<ReturnType<typeof getArrivalReadiness>>,
  labels: (key: Parameters<typeof t>[1]) => string,
) {
  if (readiness.journeyState === "LISTO_PARA_LLEGADA" && readiness.legalFollowUpOpen) {
    return labels("logistics.journeyLegalFollowUp");
  }
  if (readiness.journeyState === "LISTO_PARA_LLEGADA" && !readiness.arrivalNotesPresent) {
    return labels("logistics.journeyCompleteNotes");
  }

  const keys: Record<string, Parameters<typeof t>[1]> = {
    SIN_TRANSPORTE: "logistics.journeyNoTransport",
    TRANSPORTE_PROGRAMADO: "logistics.journeyScheduled",
    PENDIENTE_RECOGIDA: "logistics.journeyPickupPending",
    PENDIENTE_ALOJAMIENTO: "logistics.journeyAccommodationPending",
    LISTO_PARA_LLEGADA: "logistics.journeyReady",
    EN_TRANSITO: "logistics.journeyTransit",
    LLEGADA_CONFIRMADA: "logistics.journeyConfirmed",
  };

  return labels(keys[readiness.journeyState] ?? "logistics.journeyPending");
}

function translateArrivalMessage(message: string, labels: (key: Parameters<typeof t>[1]) => string) {
  const keys: Record<string, Parameters<typeof t>[1]> = {
    "Falta transporte programado": "logistics.blockerNoTransport",
    "Falta responsable de recogida": "logistics.blockerPickup",
    "Falta alojamiento asignado": "logistics.blockerAccommodation",
    "Seguimiento legal pendiente": "logistics.warningLegalFollowUp",
    "Faltan notas de llegada": "logistics.warningArrivalNotes",
    "Llegada prevista hoy": "logistics.warningArrivalToday",
    "Llegada pasada sin confirmacion": "logistics.warningArrivalOverdue",
  };

  return keys[message] ? labels(keys[message]) : message;
}
