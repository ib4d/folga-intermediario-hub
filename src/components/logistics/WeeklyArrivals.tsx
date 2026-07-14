"use client";

import { Candidate, Document, LogisticsEvent } from "@prisma/client";
import { Car, CheckCircle, Clock, MapPin, Plane, Train, User } from "lucide-react";
import { useState } from "react";

import { confirmLogisticsEvent, updateLogisticsEvent } from "@/app/actions/logistics";
import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { type AppLanguage, t } from "@/lib/i18n";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import { getCandidateOperationalAlerts } from "@/lib/operational-alerts-shared";
import ExpandableText from "@/components/ui/ExpandableText";
import PaginatedList from "@/components/ui/PaginatedList";

interface Props {
  events: (LogisticsEvent & { candidate: Candidate & { documents: Document[]; logistics?: LogisticsEvent[] } })[];
  language: AppLanguage;
}

const TransportIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case "AVION":
      return <Plane size={20} strokeWidth={2.5} />;
    case "TREN":
      return <Train size={20} strokeWidth={2.5} />;
    case "COCHE_EMPRESA":
    case "PROPIO":
      return <Car size={20} strokeWidth={2.5} />;
    default:
      return <Clock size={20} strokeWidth={2.5} />;
  }
};

export default function WeeklyArrivals({ events, language }: Props) {
  const labels = t.bind(null, language);
  const [listMessage, setListMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const handleConfirm = async (id: string) => {
    setListMessage(null);
    try {
      await confirmLogisticsEvent(id);
      setListMessage({ tone: "success", text: labels("logistics.arrivalConfirmedSuccess") });
    } catch (error) {
      const message = error instanceof Error ? error.message : labels("logistics.arrivalConfirmedError");
      setListMessage({ tone: "error", text: message });
    }
  };

  if (events.length === 0) {
    return (
      <div className="card logistics-weekly-empty">
        <p className="logistics-weekly-empty-title">{labels("logistics.noWeeklyArrivals")}</p>
      </div>
    );
  }

  return (
    <div className="compact-stack">
      {listMessage ? (
        <p className={listMessage.tone === "success" ? "form-message-success" : "form-message-error"}>
          {listMessage.text}
        </p>
      ) : null}
      <PaginatedList
        items={events}
        pageSize={6}
        label={labels("logistics.weeklyTitle")}
        className="equal-card-grid logistics-card-grid logistics-weekly-grid"
        renderItem={(event) => (
          <WeeklyArrivalCard key={event.id} event={event} onConfirm={handleConfirm} language={language} />
        )}
      />
    </div>
  );
}

function WeeklyArrivalCard({
  event,
  onConfirm,
  language,
}: {
  event: LogisticsEvent & { candidate: Candidate & { documents: Document[]; logistics?: LogisticsEvent[] } };
  onConfirm: (id: string) => Promise<void>;
  language: AppLanguage;
}) {
  const labels = t.bind(null, language);
  const outcome = getCandidateLegalOutcome(event.candidate);
  const arrivalReadiness = getArrivalReadiness({
    ...event.candidate,
    logistics: [event],
  });
  const operationalAlerts = getCandidateOperationalAlerts({
    ...event.candidate,
    logistics: [event],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const handleSave = async (formData: FormData) => {
    setIsSubmitting(true);
    setEditError("");
    try {
      await updateLogisticsEvent(event.id, {
        transportType: formData.get("transportType"),
        arrivalDate: formData.get("arrivalDate"),
        terminal: formData.get("terminal"),
        flightOrTrain: formData.get("flightOrTrain"),
        pickedUpBy: formData.get("pickedUpBy"),
        description: formData.get("description"),
      });
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : labels("logistics.arrivalConfirmedError");
      setEditError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`card equal-card logistics-weekly-card ${event.confirmed ? "logistics-weekly-card--confirmed" : ""}`}>
      <div className="logistics-weekly-card-header">
        <div className="logistics-weekly-card-header-main">
          <div className={`logistics-weekly-card-icon ${event.confirmed ? "logistics-weekly-card-icon--confirmed" : ""}`}>
            <TransportIcon type={event.transportType} />
          </div>
          <div className="logistics-weekly-card-title-wrap">
            <h4 className="logistics-weekly-card-title">
              {event.candidate.firstName} {event.candidate.lastName}
            </h4>
            <p className="logistics-weekly-card-date">
              {event.arrivalDate
                ? new Date(event.arrivalDate).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
                : labels("logistics.pendingDate")}
            </p>
          </div>
        </div>
        <div className="logistics-weekly-card-actions">
          {event.confirmed ? (
            <span className="status-badge active logistics-weekly-card-status-badge">
              <CheckCircle size={10} /> CONFIRMADO
            </span>
          ) : (
            <button
              onClick={() => onConfirm(event.id)}
              className="button logistics-weekly-card-button"
            >
              Confirmar
            </button>
          )}
          <button
            type="button"
            className="button button-secondary logistics-weekly-card-button"
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? labels("logistics.close") : labels("logistics.edit")}
          </button>
        </div>
      </div>

      {outcome?.followUpActions.length ? (
        <div className="logistics-weekly-card-callout logistics-weekly-card-callout--followup">
          <div className="logistics-weekly-card-callout-title">
            {labels("logistics.operationalFollowUpTitle")}
          </div>
          <ExpandableText maxLength={96}>
            {outcome.followUpActions.join(" | ")}
          </ExpandableText>
        </div>
      ) : null}

      <div
        className="logistics-weekly-card-callout"
      >
        <div className="logistics-weekly-card-callout-title">
          {labels("logistics.arrivalStatusTitle")}
        </div>
        <div>{arrivalReadiness.statusLabel}</div>
        {arrivalReadiness.blockers.length > 0 ? (
          <ExpandableText maxLength={92} className="logistics-weekly-card-blockers">
            {arrivalReadiness.blockers.join(" | ")}
          </ExpandableText>
        ) : null}
      </div>

      {operationalAlerts.length > 0 ? (
        <div className="logistics-weekly-card-callout logistics-weekly-card-callout--alert">
          <ExpandableText maxLength={110}>
            {operationalAlerts.map((alert) => alert.title).join(" | ")}
          </ExpandableText>
        </div>
      ) : null}

      <div className="logistics-weekly-card-meta">
        <div className="logistics-weekly-card-meta-item">
          <MapPin size={14} />
          <span className="logistics-weekly-card-meta-value">
            {event.terminal || labels("logistics.tba")}
          </span>
        </div>
        <div className="logistics-weekly-card-meta-item">
          <User size={14} />
          <span className="logistics-weekly-card-meta-value">
            {event.pickedUpBy || labels("logistics.unassignedShort")}
          </span>
        </div>
        {event.flightOrTrain ? (
          <div className="logistics-weekly-card-reference">
            REF: {event.flightOrTrain}
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <form action={handleSave} className="logistics-weekly-card-edit">
          <div className="input-group logistics-event-form-group">
            <label className="label">{labels("logistics.transportType")}</label>
            <select name="transportType" className="select" defaultValue={event.transportType ?? "AVION"}>
              <option value="AVION">Avion</option>
              <option value="TREN">Tren</option>
              <option value="COCHE_EMPRESA">Coche empresa</option>
              <option value="PROPIO">Propio / Flixbus</option>
            </select>
          </div>

          <div className="input-group logistics-event-form-group">
            <label className="label">{labels("logistics.arrivalDateTime")}</label>
            <input
              type="datetime-local"
              name="arrivalDate"
              className="input"
              defaultValue={toDateTimeLocalValue(event.arrivalDate)}
            />
          </div>

          <div className="input-group logistics-event-form-group">
            <label className="label">{labels("logistics.terminal")}</label>
            <input type="text" name="terminal" className="input" defaultValue={event.terminal ?? ""} />
          </div>

          <div className="input-group logistics-event-form-group">
            <label className="label">{labels("logistics.reference")}</label>
            <input type="text" name="flightOrTrain" className="input" defaultValue={event.flightOrTrain ?? ""} />
          </div>

          <div className="input-group logistics-event-form-group">
            <label className="label">{labels("logistics.pickupResponsible")}</label>
            <input type="text" name="pickedUpBy" className="input" defaultValue={event.pickedUpBy ?? ""} />
          </div>

          <div className="input-group logistics-event-form-group">
            <label className="label">{labels("logistics.operationalNotes")}</label>
            <textarea
              name="description"
              className="input logistics-event-form-notes"
              defaultValue={event.description ?? ""}
            />
          </div>

          <div className="logistics-weekly-card-form-actions">
            <button type="submit" className="button logistics-weekly-card-submit" disabled={isSubmitting}>
              {isSubmitting ? labels("logistics.savingArrival") : labels("logistics.saveArrival")}
            </button>
            <button
              type="button"
              className="button button-secondary logistics-weekly-card-submit"
              onClick={() => setIsEditing(false)}
            >
              {labels("logistics.cancel")}
            </button>
          </div>

          {editError ? <p className="form-message-error">{editError}</p> : null}
        </form>
      ) : null}
    </div>
  );
}

function toDateTimeLocalValue(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
