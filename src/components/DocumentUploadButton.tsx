"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadDocument } from "@/app/actions/documents";

export default function DocumentUploadButton({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState("PASSPORT");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("candidateId", candidateId);
        formData.append("type", type);

        const res = await uploadDocument(formData);
        if (res.success) {
          setIsOpen(false);
          setFile(null);
          router.refresh();
          alert("Documento subido correctamente");
        } else {
          alert(res.message || "Error al subir documento");
        }
      } catch (err) {
        console.error(err);
        alert("Error critico al subir documento");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="button"
        style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
      >
        <Upload size={16} /> Subir Documento
      </button>

      {isOpen ? (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel card"
            style={{ maxWidth: "560px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="icon-button"
              style={{ position: "absolute", right: "1rem", top: "1rem" }}
            >
              <X size={24} />
            </button>

            <h2 style={{ marginBottom: "1.5rem", paddingRight: "3rem" }}>Subir Nuevo Documento</h2>

            <form onSubmit={handleSubmit} className="compact-stack">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Tipo de Documento</label>
                <select
                  className="select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="KARTA_POBYTU">Karta Pobytu</option>
                  <option value="PESEL">PESEL</option>
                  <option value="DECYZJA_WOJEWODY">Decyzja Wojewody</option>
                  <option value="CV">CV / Otros</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Archivo (PDF o Imagen)</label>
                <input
                  type="file"
                  className="input"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <button
                type="submit"
                className="button"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                disabled={isPending || !file}
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Subiendo...
                  </>
                ) : (
                  "Empezar Proceso OCR"
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
