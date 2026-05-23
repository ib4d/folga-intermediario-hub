"use client";

import { Candidate, Document, LogisticsEvent } from "@prisma/client";
import { Car, CheckCircle, Clock, MapPin, Plane, Train, User } from "lucide-react";
import { useState } from "react";

import { confirmLogisticsEvent, updateLogisticsEvent } from "@/app/actions/logistics";
import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import ExpandableText from "@/components/ui/ExpandableText";
import PaginatedList from "@/components/ui/PaginatedList";

interface Props {
  events: (LogisticsEvent & { candidate: Candidate & { documents: Document[]; logistics?: LogisticsEvent[] } })[];
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

export default function WeeklyArrivals({ events }: Props) {
  const [listMessage, setListMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const handleConfirm = async (id: string) => {
    setListMessage(null);
    try {
      await confirmLogisticsEvent(id);
      setListMessage({ tone: "success", text: "Llegada confirmada correctamente." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al confirmar la llegada.";
      setListMessage({ tone: "error", text: message });
    }
  };

  if (events.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
        <p style={{ fontWeight: "bold", textTransform: "uppercase" }}>No hay llegadas programadas para esta semana.</p>
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
        label="Llegadas"
        className="equal-card-grid logistics-card-grid"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
        renderItem={(event) => <WeeklyArrivalCard key={event.id} event={event} onConfirm={handleConfirm} />}
      />
    </div>
  );
}

function WeeklyArrivalCard({
  event,
  onConfirm,
}: {
  event: LogisticsEvent & { candidate: Candidate & { documents: Document[]; logistics?: LogisticsEvent[] } };
  onConfirm: (id: string) => Promise<void>;
}) {
  const outcome = getCandidateLegalOutcome(event.candidate);
  const arrivalReadiness = getArrivalReadiness({
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
      const message = error instanceof Error ? error.message : "No se pudo actualizar la llegada";
      setEditError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="card equal-card"
      style={{
        backgroundColor: event.confirmed ? "#f0fdf4" : "var(--background)",
        borderColor: event.confirmed ? "#4ade80" : "var(--pitch-black)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              padding: "0.5rem",
              backgroundColor: event.confirmed ? "#4ade80" : "var(--primary)",
              border: "2px solid var(--pitch-black)",
            }}
          >
            <TransportIcon type={event.transportType} />
          </div>
          <div>
            <h4 style={{ fontWeight: "900", fontSize: "1rem", textTransform: "uppercase" }}>
              {event.candidate.firstName} {event.candidate.lastName}
            </h4>
            <p style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--muted)", margin: 0 }}>
              {event.arrivalDate
                ? new Date(event.arrivalDate).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
                : "Fecha pendiente"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {event.confirmed ? (
            <span className="status-badge active" style={{ fontSize: "0.65rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <CheckCircle size={10} /> CONFIRMADO
            </span>
          ) : (
            <button
              onClick={() => onConfirm(event.id)}
              className="button"
              style={{ padding: "0.25rem 0.75rem", fontSize: "0.7rem" }}
            >
              Confirmar
            </button>
          )}
          <button
            type="button"
            className="button button-secondary"
            style={{ padding: "0.25rem 0.75rem", fontSize: "0.7rem" }}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? "Cerrar" : "Editar"}
          </button>
        </div>
      </div>

      {outcome?.followUpActions.length ? (
        <div
          style={{
            marginBottom: "0.9rem",
            padding: "0.65rem 0.75rem",
            border: "1px solid #fcd34d",
            backgroundColor: "#fffbeb",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          <div style={{ fontWeight: 900, textTransform: "uppercase", marginBottom: "0.25rem" }}>
            Seguimiento operativo
          </div>
          <ExpandableText maxLength={96}>
            {outcome.followUpActions.join(" | ")}
          </ExpandableText>
        </div>
      ) : null}

      <div
        style={{
          marginBottom: "0.9rem",
          padding: "0.55rem 0.75rem",
          border: "1px solid var(--border-subtle)",
          backgroundColor: arrivalReadiness.isReadyForArrival ? "#f0fdf4" : "#fff7ed",
          fontSize: "0.75rem",
          fontWeight: 700,
        }}
      >
        <div style={{ fontWeight: 900, textTransform: "uppercase", marginBottom: "0.25rem" }}>
          Estado de llegada
        </div>
        <div>{arrivalReadiness.statusLabel}</div>
        {arrivalReadiness.blockers.length > 0 ? (
          <ExpandableText maxLength={92} style={{ display: "block", marginTop: "0.2rem", color: "#991b1b" }}>
            {arrivalReadiness.blockers.join(" | ")}
          </ExpandableText>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem", fontWeight: "bold" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <MapPin size={14} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.terminal || "TBA"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <User size={14} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.pickedUpBy || "SIN ASIGNAR"}
          </span>
        </div>
        {event.flightOrTrain ? (
          <div
            style={{
              gridColumn: "1 / -1",
              marginTop: "0.5rem",
              padding: "0.25rem 0.5rem",
              backgroundColor: "var(--white-smoke)",
              border: "1px solid var(--pitch-black)",
              fontFamily: "monospace",
              fontSize: "0.75rem",
            }}
          >
            REF: {event.flightOrTrain}
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <form action={handleSave} style={{ marginTop: "1rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", display: "grid", gap: "0.75rem" }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Medio de transporte</label>
            <select name="transportType" className="select" defaultValue={event.transportType ?? "AVION"}>
              <option value="AVION">Avion</option>
              <option value="TREN">Tren</option>
              <option value="COCHE_EMPRESA">Coche empresa</option>
              <option value="PROPIO">Propio / Flixbus</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Fecha y hora</label>
            <input
              type="datetime-local"
              name="arrivalDate"
              className="input"
              defaultValue={toDateTimeLocalValue(event.arrivalDate)}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Terminal / estacion</label>
            <input type="text" name="terminal" className="input" defaultValue={event.terminal ?? ""} />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Referencia</label>
            <input type="text" name="flightOrTrain" className="input" defaultValue={event.flightOrTrain ?? ""} />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Responsable de recogida</label>
            <input type="text" name="pickedUpBy" className="input" defaultValue={event.pickedUpBy ?? ""} />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Notas operativas</label>
            <textarea
              name="description"
              className="input"
              defaultValue={event.description ?? ""}
              style={{ minHeight: "88px", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="button" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              style={{ flex: 1 }}
              onClick={() => setIsEditing(false)}
            >
              Cancelar
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
