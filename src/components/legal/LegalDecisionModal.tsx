"use client";

import { useState } from "react";
import { Candidate } from "@prisma/client";
import { updateCandidateStatus } from "@/app/actions/candidates";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
}

const REJECTION_REASONS = [
  "Documentos faltantes",
  "Documento expirado",
  "Documento ilegible",
  "Historial negativo en FOLGA",
  "Proceso migratorio incompleto",
  "Falta pago 400 PLN",
  "Otro"
];

export default function LegalDecisionModal({ isOpen, onClose, candidate }: Props) {
  const [decision, setDecision] = useState<"APROBADO" | "RECHAZADO" | "REVISION_ADICIONAL" | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!decision) return;
    if (decision === "RECHAZADO" && !reason) {
      alert("Debe seleccionar un motivo de rechazo");
      return;
    }
    if (decision === "REVISION_ADICIONAL" && !notes) {
      alert("Debe agregar notas para la revisión adicional");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCandidateStatus(candidate.id, decision, reason || undefined, notes || undefined);
      onClose();
    } catch (err) {
      alert("Error al procesar la decisión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Decisión Legal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-sm text-gray-600">
            Candidato: <span className="font-bold text-gray-900">{candidate.firstName} {candidate.lastName}</span>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setDecision("APROBADO")}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                decision === "APROBADO" 
                ? "bg-green-600 text-white shadow-lg scale-105" 
                : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              Aprobar
            </button>
            <button 
              onClick={() => setDecision("RECHAZADO")}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                decision === "RECHAZADO" 
                ? "bg-red-600 text-white shadow-lg scale-105" 
                : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              Rechazar
            </button>
            <button 
              onClick={() => setDecision("REVISION_ADICIONAL")}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                decision === "REVISION_ADICIONAL" 
                ? "bg-amber-500 text-white shadow-lg scale-105" 
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Revisión
            </button>
          </div>

          {decision === "RECHAZADO" && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <label className="text-sm font-semibold text-gray-700">Motivo de Rechazo</label>
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="">Seleccione un motivo...</option>
                {REJECTION_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {(decision === "REVISION_ADICIONAL" || decision === "RECHAZADO") && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <label className="text-sm font-semibold text-gray-700">
                {decision === "RECHAZADO" ? "Detalles adicionales (Opcional)" : "Notas de revisión requerida"}
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escriba aquí los detalles..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!decision || isSubmitting}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
              !decision || isSubmitting ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-md"
            }`}
          >
            {isSubmitting ? "Procesando..." : "Confirmar Decisión"}
          </button>
        </div>
      </div>
    </div>
  );
}
