"use client";

import { Candidate, LogisticsEvent } from "@prisma/client";
import { X } from "lucide-react";
import { useState } from "react";

import { updateArrivalReadinessDetails } from "@/app/actions/logistics";

interface Props {
  candidate: Candidate & {
    logistics: LogisticsEvent[];
  };
}

export default function ArrivalReadinessEditor({ candidate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const latestEvent = candidate.logistics[0] ?? null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      await updateArrivalReadinessDetails(formData);
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el handoff";
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="button"
        style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
        onClick={() => setIsOpen(true)}
      >
        Actualizar handoff
      </button>

      {isOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "rgba(11, 5, 0, 0.7)",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "640px", padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "2px solid var(--pitch-black)",
                backgroundColor: "var(--pitch-black)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ color: "var(--primary)", fontWeight: 900, textTransform: "uppercase" }}>
                  Actualizar handoff
                </div>
                <div style={{ color: "white", fontSize: "0.85rem", fontWeight: 700 }}>
                  {candidate.firstName} {candidate.lastName}
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsOpen(false)}
                style={{ backgroundColor: "transparent", borderColor: "var(--primary)", color: "var(--primary)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="hidden" name="candidateId" value={candidate.id} />

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Alojamiento</label>
                <input
                  type="text"
                  name="accommodation"
                  defaultValue={candidate.accommodation ?? ""}
                  className="input"
                  placeholder="Ej: Piso Kutno / Hotel / Casa compartida"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Responsable de recogida</label>
                <input
                  type="text"
                  name="pickedUpBy"
                  defaultValue={latestEvent?.pickedUpBy ?? ""}
                  className="input"
                  placeholder={latestEvent ? "Nombre del responsable..." : "Disponible cuando exista un evento de llegada"}
                  disabled={!latestEvent}
                />
                {!latestEvent ? (
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                    Primero programa una llegada para asignar responsable de recogida.
                  </p>
                ) : null}
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Notas de llegada</label>
                <textarea
                  name="arrivalNotes"
                  defaultValue={candidate.arrivalNotes ?? ""}
                  className="input"
                  style={{ minHeight: "96px", resize: "vertical" }}
                  placeholder="Puntos de contacto, instrucciones, observaciones de llegada..."
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
