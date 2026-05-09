"use client";

import { useState } from "react";
import { Candidate } from "@prisma/client";
import { createLogisticsEvent } from "@/app/actions/logistics";

interface Props {
  candidates: Candidate[];
  onSuccess?: () => void;
}

export default function LogisticsEventForm({ candidates, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    try {
      await createLogisticsEvent(formData);
      e.currentTarget.reset();
      onSuccess?.();
    } catch {
      alert("Error al crear evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1.5rem' }}>PROGRAMAR NUEVA LLEGADA</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Candidato</label>
          <select name="candidateId" className="select" required>
            <option value="">SELECCIONE...</option>
            {candidates.map(c => (
              <option key={c.id} value={c.id}>{c.firstName?.toUpperCase()} {c.lastName?.toUpperCase()} ({c.country?.toUpperCase()})</option>
            ))}
          </select>
        </div>
 
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Medio de Transporte</label>
          <select name="transportType" className="select" required>
            <option value="AVION">AVIÓN</option>
            <option value="TREN">TREN</option>
            <option value="COCHE_EMPRESA">COCHE EMPRESA</option>
            <option value="PROPIO">PROPIO / FLIXBUS</option>
          </select>
        </div>
 
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Fecha y Hora de Llegada</label>
          <input type="datetime-local" name="arrivalDate" className="input" required />
        </div>
 
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Terminal / Estación</label>
          <input type="text" name="terminal" className="input" placeholder="EJ: CHOPIN AIRPORT, KUTNO PKP..." required />
        </div>
 
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Vuelo / Tren / Placa</label>
          <input type="text" name="flightOrTrain" className="input" placeholder="EJ: FR1234, WAW-KUT..." />
        </div>
 
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Recoge</label>
          <input type="text" name="pickedUpBy" className="input" placeholder="NOMBRE DEL RESPONSABLE..." />
        </div>
      </div>
 
      <div className="input-group">
        <label className="label">Notas Adicionales</label>
        <textarea name="notes" className="input" style={{ height: '80px', resize: 'none' }} placeholder="CUALQUIER DETALLE RELEVANTE..."></textarea>
      </div>
 
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="button"
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {isSubmitting ? "PROGRAMANDO..." : "PROGRAMAR LLEGADA"}
      </button>
    </form>
  );
}
