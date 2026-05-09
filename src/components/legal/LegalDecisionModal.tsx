"use client";

import { useState } from "react";
import { Candidate } from "@prisma/client";
import { updateCandidateStatus } from "@/app/actions/candidates";
import { X, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

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
    } catch {
      alert("Error al procesar la decisión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 50, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      padding: '1rem',
      backgroundColor: 'rgba(11, 5, 0, 0.75)'
    }}>
      <div className="card" style={{ 
        width: '100%', maxWidth: '520px', padding: 0, overflow: 'hidden',
        boxShadow: '8px 8px 0px var(--pitch-black)'
      }}>
        {/* Modal Header */}
        <div style={{ 
          padding: '1.25rem 1.5rem', 
          borderBottom: '2px solid var(--pitch-black)', 
          backgroundColor: 'var(--pitch-black)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ color: 'var(--primary)', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>DECISIÓN LEGAL</h2>
          <button 
            onClick={onClose} 
            className="icon-button"
            style={{ backgroundColor: 'transparent', borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--ghost-white)' }}>
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--white-smoke)', border: '2px solid var(--pitch-black)', fontSize: '0.875rem', fontWeight: 'bold' }}>
            CANDIDATO: <span style={{ fontWeight: '900' }}>{candidate.firstName?.toUpperCase()} {candidate.lastName?.toUpperCase()}</span>
          </div>

          {/* Decision Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={() => setDecision("APROBADO")}
              style={{
                padding: '1rem',
                fontWeight: '900',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                border: '2px solid var(--pitch-black)',
                cursor: 'pointer',
                backgroundColor: decision === "APROBADO" ? '#4ade80' : 'var(--background)',
                boxShadow: decision === "APROBADO" ? '4px 4px 0px var(--pitch-black)' : '2px 2px 0px var(--pitch-black)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.15s'
              }}
            >
              <CheckCircle size={24} strokeWidth={2.5} color={decision === "APROBADO" ? "var(--pitch-black)" : "#4ade80"} />
              APROBAR
            </button>
            <button
              onClick={() => setDecision("RECHAZADO")}
              style={{
                padding: '1rem',
                fontWeight: '900',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                border: '2px solid var(--pitch-black)',
                cursor: 'pointer',
                backgroundColor: decision === "RECHAZADO" ? '#e63946' : 'var(--background)',
                color: decision === "RECHAZADO" ? 'white' : 'var(--foreground)',
                boxShadow: decision === "RECHAZADO" ? '4px 4px 0px var(--pitch-black)' : '2px 2px 0px var(--pitch-black)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.15s'
              }}
            >
              <XCircle size={24} strokeWidth={2.5} />
              RECHAZAR
            </button>
            <button
              onClick={() => setDecision("REVISION_ADICIONAL")}
              style={{
                padding: '1rem',
                fontWeight: '900',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                border: '2px solid var(--pitch-black)',
                cursor: 'pointer',
                backgroundColor: decision === "REVISION_ADICIONAL" ? 'var(--primary)' : 'var(--background)',
                boxShadow: decision === "REVISION_ADICIONAL" ? '4px 4px 0px var(--pitch-black)' : '2px 2px 0px var(--pitch-black)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.15s'
              }}
            >
              <AlertTriangle size={24} strokeWidth={2.5} />
              REVISIÓN
            </button>
          </div>

          {/* Rejection Reason */}
          {decision === "RECHAZADO" && (
            <div className="input-group">
              <label className="label">MOTIVO DE RECHAZO</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="select"
              >
                <option value="">SELECCIONE UN MOTIVO...</option>
                {REJECTION_REASONS.map(r => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}

          {/* Additional Notes */}
          {(decision === "REVISION_ADICIONAL" || decision === "RECHAZADO") && (
            <div className="input-group">
              <label className="label">
                {decision === "RECHAZADO" ? "DETALLES ADICIONALES (OPCIONAL)" : "NOTAS DE REVISIÓN REQUERIDA"}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ESCRIBA AQUÍ LOS DETALLES..."
                className="input"
                style={{ height: '96px', resize: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ 
          padding: '1.25rem 1.5rem', 
          backgroundColor: 'var(--white-smoke)',
          borderTop: '2px solid var(--pitch-black)',
          display: 'flex', gap: '1rem'
        }}>
          <button
            onClick={onClose}
            className="button button-secondary"
            style={{ flex: 1 }}
          >
            CANCELAR
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || isSubmitting}
            className="button"
            style={{ 
              flex: 1,
              opacity: (!decision || isSubmitting) ? 0.5 : 1,
              cursor: (!decision || isSubmitting) ? 'not-allowed' : 'pointer',
              backgroundColor: decision === "APROBADO" ? '#4ade80' : decision === "RECHAZADO" ? '#e63946' : 'var(--primary)',
              color: decision === "RECHAZADO" ? 'white' : 'var(--pitch-black)'
            }}
          >
            {isSubmitting ? "PROCESANDO..." : "CONFIRMAR DECISIÓN"}
          </button>
        </div>
      </div>
    </div>
  );
}
