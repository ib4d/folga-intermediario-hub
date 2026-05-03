"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCandidateNotes } from "@/app/actions/candidates";

export default function UpdateNotes({ candidateId, initialNotes }: { candidateId: string, initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateCandidateNotes(candidateId, notes);
      router.refresh();
      alert("Notas guardadas correctamente.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      alert("Error: " + msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <textarea 
        className="input" 
        style={{ minHeight: '100px', marginBottom: '0.5rem', width: '100%', resize: 'vertical' }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Añadir notas del perfil..."
      />
      <button 
        className="button" 
        onClick={handleSave} 
        disabled={isSaving}
        style={{ width: '100%' }}
      >
        {isSaving ? "Guardando..." : "Guardar Notas"}
      </button>
    </div>
  );
}
