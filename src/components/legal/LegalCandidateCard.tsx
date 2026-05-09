"use client";

import { Candidate, Document, User } from "@prisma/client";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { FileText, User as UserIcon, MapPin, AlertCircle } from "lucide-react";
import { useState } from "react";
import LegalDecisionModal from "./LegalDecisionModal";
import Link from "next/link";

interface Props {
  candidate: Candidate & { 
    documents: Document[];
    intermediary: User;
  };
}

export default function LegalCandidateCard({ candidate }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const checklist = getCandidateDocumentChecklist(candidate);
  
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-ES");
  };

  const now = typeof window !== 'undefined' ? new Date().getTime() : 0;

  const isExpiringSoon = (date: Date | null) => {
    if (!date) return false;
    const diffDays = (new Date(date).getTime() - now) / (1000 * 60 * 60 * 24);
    return diffDays < 90;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Card Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--pitch-black)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {candidate.firstName} {candidate.lastName}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} />
                {candidate.country}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserIcon size={14} />
                {candidate.intermediary.name}
              </span>
            </div>
          </div>
          <span 
            className="status-badge"
            style={{ 
              backgroundColor: candidate.paid400pln ? '#4ade80' : 'var(--primary)',
              fontSize: '0.65rem',
              whiteSpace: 'nowrap'
            }}
          >
            {candidate.paid400pln ? "400 PLN ✓" : "PENDIENTE PAGO"}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderBottom: '2px solid var(--pitch-black)' }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>PASAPORTE</div>
          <div style={{ fontWeight: '900', fontSize: '0.9rem' }}>{candidate.passportNumber || "N/A"}</div>
          <div style={{ 
            fontSize: '0.7rem', 
            fontWeight: 'bold',
            color: isExpiringSoon(candidate.passportExpiry) ? '#e63946' : 'var(--muted)'
          }}>
            EXP: {formatDate(candidate.passportExpiry)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>KARTA POBYTU</div>
          <div style={{ fontWeight: '900', fontSize: '0.9rem' }}>{candidate.kartaPobytuNumber || "NO TIENE"}</div>
          {candidate.kartaPobytuExpiry && (
            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--muted)' }}>
              EXP: {formatDate(candidate.kartaPobytuExpiry)}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>PESEL / VOIVODATO</div>
          <div style={{ fontWeight: '900', fontSize: '0.9rem' }}>{candidate.peselNumber || "N/A"}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--muted)' }}>
            {candidate.voivodatoStatus || "SIN TRÁMITE"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>DOCUMENTOS</div>
          <div style={{ fontWeight: '900', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={14} />
            {candidate.documents.length} SUBIDOS
          </div>
          {checklist.missing.length > 0 && (
            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#e63946' }}>
              FALTAN: {checklist.missing.length}
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {checklist.warnings.length > 0 && (
        <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ffccd5', borderBottom: '2px solid var(--pitch-black)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '900', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            <AlertCircle size={14} strokeWidth={3} />
            ALERTAS
          </div>
          <ul style={{ fontSize: '0.7rem', fontWeight: 'bold', paddingLeft: '0.5rem' }}>
            {checklist.warnings.slice(0, 2).map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
            {checklist.warnings.length > 2 && <li>• y {checklist.warnings.length - 2} más...</li>}
          </ul>
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--white-smoke)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--muted)' }}>
          {new Date(candidate.updatedAt).toLocaleString("es-ES", { dateStyle: 'short', timeStyle: 'short' })}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link 
            href={`/candidatos/${candidate.id}`} 
            className="button button-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}
          >
            VER DETALLES
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="button"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}
          >
            REVISAR
          </button>
        </div>
      </div>

      <LegalDecisionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        candidate={candidate} 
      />
    </div>
  );
}
