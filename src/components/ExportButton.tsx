"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportCandidatesToXLSX } from "@/app/actions/exports";

export default function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const result = await exportCandidatesToXLSX();
      if (!result) {
        alert("No tienes permisos para exportar o la sesión expiró");
        return;
      }
      
      const { base64, filename } = result;
      
      // Convertir base64 a Blob y descargar
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("Error al exportar los datos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleExport} 
      className="button" 
      disabled={loading}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
      {loading ? "Generando..." : "Exportar Excel"}
    </button>
  );
}
