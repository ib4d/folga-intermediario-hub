"use client";

import { Candidate, Document, User } from "@prisma/client";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { Calendar, FileText, User as UserIcon, MapPin, AlertCircle } from "lucide-react";
import { useState } from "react";
import LegalDecisionModal from "./LegalDecisionModal";

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {candidate.firstName} {candidate.lastName}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <MapPin size={14} />
              <span>{candidate.country}</span>
              <span className="mx-1">•</span>
              <UserIcon size={14} />
              <span>{candidate.intermediary.name}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            candidate.paid400pln ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {candidate.paid400pln ? "400 PLN Pagado" : "Pendiente Pago"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="space-y-2">
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs uppercase font-semibold">Pasaporte</span>
              <span className="font-medium">{candidate.passportNumber || "N/A"}</span>
              <span className={`text-[10px] ${
                checklist.warnings.some(w => w.includes("Pasaporte")) ? "text-red-500" : "text-gray-500"
              }`}>
                Exp: {formatDate(candidate.passportExpiry)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs uppercase font-semibold">Karta Pobytu</span>
              <span className="font-medium">{candidate.kartaPobytuNumber || "No tiene"}</span>
              {candidate.kartaPobytuExpiry && (
                <span className="text-[10px] text-gray-500">Exp: {formatDate(candidate.kartaPobytuExpiry)}</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs uppercase font-semibold">PESEL / Voivodato</span>
              <span className="font-medium">{candidate.peselNumber || "N/A"}</span>
              <span className="text-[10px] text-gray-500">
                {candidate.voivodatoStatus || "Sin trámite"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs uppercase font-semibold">Documentos</span>
              <span className="font-medium flex items-center gap-1">
                <FileText size={14} />
                {candidate.documents.length} subidos
              </span>
              {checklist.missing.length > 0 && (
                <span className="text-[10px] text-red-500 font-bold">
                  Faltan: {checklist.missing.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {checklist.warnings.length > 0 && (
          <div className="mb-4 p-2 bg-red-50 rounded border border-red-100">
            <div className="flex items-center gap-1 text-red-700 text-[10px] font-bold uppercase mb-1">
              <AlertCircle size={12} />
              Alertas
            </div>
            <ul className="text-[10px] text-red-600 space-y-0.5">
              {checklist.warnings.slice(0, 2).map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
              {checklist.warnings.length > 2 && <li>• y {checklist.warnings.length - 2} más...</li>}
            </ul>
          </div>
        )}

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
        >
          Revisar Candidato
        </button>
      </div>

      <div className="bg-gray-50 px-5 py-2 border-t border-gray-100 flex justify-between items-center">
        <span className="text-[10px] text-gray-400">
          Último cambio: {new Date(candidate.updatedAt).toLocaleString("es-ES", { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        <a href={`/candidatos/${candidate.id}`} className="text-[10px] text-blue-600 font-bold hover:underline">
          Ver Detalles →
        </a>
      </div>

      <LegalDecisionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        candidate={candidate} 
      />
    </div>
  );
}
