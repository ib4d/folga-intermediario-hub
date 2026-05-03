"use client";

import { useState } from "react";
import { FileText, Trash2, CheckSquare, Square, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/app/actions/documents";

type Document = {
  id: string;
  url: string;
  type: string;
  ocrStatus: string | null;
  candidateId: string;
  candidate: {
    firstName: string | null;
    lastName: string | null;
  };
};

export default function DocumentTable({ initialDocuments }: { initialDocuments: Document[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const toggleSelectAll = () => {
    if (selectedIds.length === initialDocuments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(initialDocuments.map(doc => doc.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.length} documentos?`)) return;

    setIsDeleting(true);
    try {
      // Deleting in sequence for simplicity, but could be Promise.all
      for (const id of selectedIds) {
        await deleteDocument(id);
      }
      setSelectedIds([]);
      router.refresh();
      alert("Documentos eliminados con éxito");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert("Error al eliminar algunos documentos: " + msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este documento?")) return;
    
    setIsDeleting(true);
    try {
      await deleteDocument(id);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert("Error al eliminar documento: " + msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Documentos Procesados</h2>
        {selectedIds.length > 0 && (
          <button 
            className="button button-secondary" 
            style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' }}
            onClick={handleDeleteSelected}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            Eliminar Seleccionados ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  {selectedIds.length === initialDocuments.length && initialDocuments.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </th>
              <th>Archivo</th>
              <th>Candidato</th>
              <th>Tipo</th>
              <th>Estado OCR</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {initialDocuments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No hay documentos procesados</td>
              </tr>
            ) : (
              initialDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <button onClick={() => toggleSelect(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {selectedIds.includes(doc.id) ? <CheckSquare size={18} color="var(--amber-flame)" /> : <Square size={18} />}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} /> {doc.url.split('/').pop()}
                    </div>
                  </td>
                  <td>{doc.candidate.firstName} {doc.candidate.lastName}</td>
                  <td>{doc.type}</td>
                  <td>
                    <span className={`status-badge ${doc.ocrStatus === 'SUCCESS' ? 'active' : doc.ocrStatus === 'FAILED' ? 'danger' : ''}`}>
                      {doc.ocrStatus || 'PENDIENTE'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Link href={`/candidatos/${doc.candidateId}`} className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        {doc.ocrStatus === 'FAILED' ? 'Corregir' : 'Verificar'}
                      </Link>
                      <button 
                        onClick={() => handleDeleteSingle(doc.id)}
                        disabled={isDeleting}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', opacity: isDeleting ? 0.5 : 1 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
