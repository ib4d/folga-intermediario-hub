"use client";

import { useState, useTransition } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { batchUploadDocuments, smartBatchUpload } from "@/app/actions/documents";
import { Brain, UserCircle } from "lucide-react";

const DOC_TYPES = [
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "KARTA_POBYTU", label: "Karta Pobytu" },
  { value: "PESEL", label: "PESEL" },
  { value: "DECYZJA_WOJEWODY", label: "Decyzja Wojewody" },
  { value: "CV", label: "CV / Otros" },
  { value: "OTHER", label: "Otro" },
];

export default function BatchUploadButton({ candidates }: { candidates: { id: string, name: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id || "");
  const [docType, setDocType] = useState("PASSPORT");
  const [files, setFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<{ filename: string, success: boolean, message?: string }[] | null>(null);
  const [isSmartMode, setIsSmartMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || !selectedCandidateId) return;

    startTransition(async () => {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append("files", file));
      
      let res;
      if (isSmartMode) {
        res = await smartBatchUpload(formData);
      } else {
        formData.append("docType", docType);
        res = await batchUploadDocuments(selectedCandidateId, formData);
      }

      if (res.success) {
        setResults(res.results || []);
      } else {
        alert("Error en la subida por lotes");
      }
    });
  };

  const reset = () => {
    setIsOpen(false);
    setResults(null);
    setFiles(null);
    setDocType("PASSPORT");
  };

  return (
    <>
      <button 
        onClick={() => { setIsOpen(true); setResults(null); }}
        className="button" 
      >
        <Upload size={18} /> Subir Lote
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              onClick={reset}
              style={{ position: 'absolute', right: '1rem', top: '1rem', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '0.5rem' }}>Subida de Documentos</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Selecciona el modo de carga para procesar múltiples archivos.
            </p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', padding: '0.5rem', backgroundColor: 'var(--white-smoke)', border: '2px solid var(--pitch-black)' }}>
               <button 
                  onClick={() => setIsSmartMode(false)}
                  style={{ 
                     flex: 1, 
                     padding: '0.75rem', 
                     border: 'none', 
                     backgroundColor: !isSmartMode ? 'var(--amber-flame)' : 'transparent',
                     fontWeight: 'bold',
                     cursor: 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '0.5rem'
                  }}
               >
                  <UserCircle size={18} /> Manual
               </button>
               <button 
                  onClick={() => setIsSmartMode(true)}
                  style={{ 
                     flex: 1, 
                     padding: '0.75rem', 
                     border: 'none', 
                     backgroundColor: isSmartMode ? 'var(--amber-flame)' : 'transparent',
                     fontWeight: 'bold',
                     cursor: 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '0.5rem'
                  }}
               >
                  <Brain size={18} /> Inteligente
               </button>
            </div>
            
            {!results ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {!isSmartMode ? (
                   <>
                      <div className="input-group">
                        <label className="label">Seleccionar Candidato</label>
                        <select 
                          className="input" 
                          value={selectedCandidateId} 
                          onChange={(e) => setSelectedCandidateId(e.target.value)}
                          required
                        >
                          <option value="">Seleccione un candidato...</option>
                          {candidates.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="input-group">
                        <label className="label">Tipo de Documento</label>
                        <select 
                          className="input" 
                          value={docType} 
                          onChange={(e) => setDocType(e.target.value)}
                          required
                        >
                          {DOC_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                   </>
                ) : (
                   <div style={{ padding: '1rem', border: '1px dashed var(--amber-flame)', backgroundColor: 'rgba(252, 186, 4, 0.05)', borderRadius: '4px' }}>
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>
                        <strong>Modo Inteligente:</strong> El sistema usará OCR para identificar el tipo de documento y asignar automáticamente cada archivo al candidato correspondiente (o crear un perfil nuevo si no existe).
                      </p>
                   </div>
                )}

                <div className="input-group">
                  <label className="label">Archivos (puedes seleccionar varios)</label>
                  <input 
                    type="file" 
                    className="input" 
                    multiple
                    accept="application/pdf,image/*"
                    onChange={(e) => setFiles(e.target.files)}
                    required
                  />
                  {files && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                      {files.length} archivo(s) seleccionado(s)
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="button" 
                  style={{ width: '100%' }}
                  disabled={isPending || !files || (!isSmartMode && !selectedCandidateId)}
                >
                  {isPending ? <><Loader2 className="animate-spin" size={20} /> Procesando con OCR...</> : "Subir y Procesar"}
                </button>
              </form>
            ) : (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Resultados del Procesamiento</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {results.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--white-smoke)', borderRadius: '4px', border: '1px solid var(--pitch-black)' }}>
                      {r.success ? <CheckCircle2 size={18} color="green" /> : <AlertCircle size={18} color="red" />}
                      <span style={{ fontSize: '0.875rem', flex: 1, fontWeight: 'bold' }}>{r.filename}</span>
                      <span style={{ fontSize: '0.75rem', color: r.success ? 'green' : 'red' }}>
                        {r.success ? 'OCR procesado' : r.message}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={reset} className="button" style={{ width: '100%', marginTop: '1.5rem' }}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
