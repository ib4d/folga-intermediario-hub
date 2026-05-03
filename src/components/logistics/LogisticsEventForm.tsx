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
    } catch (err) {
      alert("Error al crear evento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Programar Nueva Llegada</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Candidato</label>
          <select name="candidateId" className="input" required>
            <option value="">Seleccione...</option>
            {candidates.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.country})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Medio de Transporte</label>
          <select name="transportType" className="input" required>
            <option value="AVION">Avión</option>
            <option value="TREN">Tren</option>
            <option value="COCHE_EMPRESA">Coche Empresa</option>
            <option value="PROPIO">Propio / Flixbus</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Fecha y Hora de Llegada</label>
          <input type="datetime-local" name="arrivalDate" className="input" required />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Terminal / Estación</label>
          <input type="text" name="terminal" className="input" placeholder="Ej: Chopin Airport, Kutno PKP..." required />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Vuelo / Tren / Placa</label>
          <input type="text" name="flightOrTrain" className="input" placeholder="Ej: FR1234, WAW-KUT..." />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Recoge</label>
          <input type="text" name="pickedUpBy" className="input" placeholder="Nombre del responsable..." />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-400 uppercase">Notas Adicionales</label>
        <textarea name="notes" className="input h-20 resize-none" placeholder="Cualquier detalle relevante..."></textarea>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-50"
      >
        {isSubmitting ? "Programando..." : "Programar Llegada"}
      </button>
    </form>
  );
}
