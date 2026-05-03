"use client";

import { useState } from "react";
import { Car, MapPin, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { createLogisticsEvent } from "@/app/actions/logistics";

export default function LogisticsCard({ candidate }: { candidate: import("@prisma/client").Candidate & { logistics: import("@prisma/client").LogisticsEvent[] } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastEvent = candidate.logistics?.[0];

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await createLogisticsEvent(formData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      alert("Error: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ transition: "all 0.3s ease" }}>
      <div 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {candidate.firstName} {candidate.lastName}
            {!isExpanded && lastEvent && (
              <span style={{ fontSize: "0.75rem", backgroundColor: "var(--amber-flame)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                Planificado
              </span>
            )}
          </h3>
          {!isExpanded && (
            <div style={{ fontSize: "0.875rem", color: "var(--muted)", display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <span>{candidate.country}</span>
              {lastEvent && (
                <span><Calendar size={12} style={{ display: "inline" }}/> {lastEvent.arrivalDate ? new Date(lastEvent.arrivalDate).toLocaleString("es-ES") : "N/A"}</span>
              )}
            </div>
          )}
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer" }}>
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--grey-olive)", paddingTop: "1rem" }}>
          <p style={{ margin: "0 0 1rem 0", color: "var(--muted)" }}>{candidate.country}</p>
          
          {lastEvent ? (
            <div style={{ backgroundColor: "var(--white-smoke)", padding: "1rem", border: "1px solid var(--pitch-black)", marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Último Viaje Registrado:</p>
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Calendar size={16}/> {lastEvent.arrivalDate ? new Date(lastEvent.arrivalDate).toLocaleString("es-ES") : 'N/A'}</p>
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Car size={16}/> {lastEvent.transportType}</p>
              {lastEvent.terminal && (
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><MapPin size={16}/> Terminal: {lastEvent.terminal}</p>
              )}
              {lastEvent.pickedUpBy && (
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><Clock size={16}/> Recoge: {lastEvent.pickedUpBy}</p>
              )}
            </div>
          ) : (
            <div style={{ padding: "1rem", backgroundColor: "#fef3c7", border: "1px solid #d97706", marginBottom: "1rem" }}>
              Sin viaje planificado
            </div>
          )}

          <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            
            <label className="label" style={{ marginBottom: 0 }}>Transporte</label>
            <select name="transportType" className="input" required>
              <option value="AVION">Avión</option>
              <option value="TREN">Tren</option>
              <option value="COCHE_EMPRESA">Coche de Empresa</option>
              <option value="PROPIO">Propio</option>
            </select>

            <label className="label" style={{ marginBottom: 0 }}>Fecha y Hora de Llegada</label>
            <input type="datetime-local" name="arrivalDate" className="input" required />

            <label className="label" style={{ marginBottom: 0 }}>Terminal / Estación</label>
            <input type="text" name="terminal" className="input" placeholder="Ej. Modlin, Chopin, Kutno PKP" required />

            <label className="label" style={{ marginBottom: 0 }}>Responsable de recogida</label>
            <input type="text" name="pickedUpBy" className="input" placeholder="Nombre de quien recoge" />

            <button type="submit" className="button" style={{ marginTop: "0.5rem" }} disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar Llegada"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
