"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, PencilLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { reviewDocumentOcr } from "@/app/actions/documents";

type ReviewableDocument = {
  id: string;
  type: string;
  number: string | null;
  expiryDate: string | Date | null;
  issueDate: string | Date | null;
  extractedData: Record<string, unknown> | null;
};

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  }

  return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function deriveInitialState(doc: ReviewableDocument) {
  const extracted = doc.extractedData ?? {};
  return {
    type: doc.type,
    documentDisposition: asString(extracted.documentDisposition) || "PRIMARY",
    documentNumber: asString(extracted.documentNumber) || doc.number || "",
    personalNumber: asString(extracted.personalNumber),
    expiryDate: toDateInputValue(doc.expiryDate) || asString(extracted.dateOfExpiry),
    issueDate: toDateInputValue(doc.issueDate) || asString(extracted.dateOfIssue),
    firstName: asString(extracted.firstName),
    lastName: asString(extracted.lastName),
    nationality: asString(extracted.nationality),
    issuingCountry: asString(extracted.issuingCountry),
    dateOfBirth: asString(extracted.dateOfBirth),
    sex: asString(extracted.sex),
    placeOfBirth: asString(extracted.placeOfBirth),
    issuingAuthority: asString(extracted.issuingAuthority),
    passportBiometric: asBoolean(extracted.passportBiometric),
    kartaPobytuType: asString(extracted.kartaPobytuType),
    remarks: asString(extracted.remarks),
    municipalityOffice: asString(extracted.municipalityOffice),
    addressOfRegistration: asString(extracted.addressOfRegistration),
    heightCm: asNumber(extracted.heightCm),
    markVerified: false,
  };
}

export default function DocumentReviewModal({ doc }: { doc: ReviewableDocument }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const initialState = useMemo(() => deriveInitialState(doc), [doc]);
  const [form, setForm] = useState(initialState);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setErrorMessage("");
      try {
        await reviewDocumentOcr({
          documentId: doc.id,
          type: form.type as
            | "PASSPORT"
            | "KARTA_POBYTU"
            | "PESEL"
            | "DECYZJA_WOJEWODY"
            | "CV"
            | "OTHER",
          documentDisposition: form.documentDisposition,
          documentNumber: form.documentNumber,
          personalNumber: form.personalNumber,
          expiryDate: form.expiryDate,
          issueDate: form.issueDate,
          firstName: form.firstName,
          lastName: form.lastName,
          nationality: form.nationality,
          issuingCountry: form.issuingCountry,
          dateOfBirth: form.dateOfBirth,
          sex: form.sex,
          placeOfBirth: form.placeOfBirth,
          issuingAuthority: form.issuingAuthority,
          passportBiometric: form.passportBiometric,
          kartaPobytuType: form.kartaPobytuType,
          remarks: form.remarks,
          municipalityOffice: form.municipalityOffice,
          addressOfRegistration: form.addressOfRegistration,
          heightCm: form.heightCm ? Number.parseInt(form.heightCm, 10) : undefined,
          markVerified: form.markVerified,
        });

        setIsOpen(false);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al guardar la revision";
        setErrorMessage(message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="button button-outline"
        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
        onClick={() => {
          setForm(initialState);
          setErrorMessage("");
          setIsOpen(true);
        }}
      >
        <PencilLine size={14} /> Revisar OCR
      </button>

      {isOpen ? (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel card"
            style={{ maxWidth: "720px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="icon-button"
              style={{ position: "absolute", right: "1rem", top: "1rem" }}
            >
              <X size={20} />
            </button>

            <h2 style={{ marginBottom: "0.5rem", paddingRight: "3rem" }}>Revision OCR</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.25rem", fontSize: "0.875rem" }}>
              Corrige los campos detectados y guarda la version confiable del documento.
            </p>

            <div className="compact-stack">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Tipo</label>
                <select className="select" value={form.type} onChange={(e) => setField("type", e.target.value)}>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="KARTA_POBYTU">Karta Pobytu</option>
                  <option value="PESEL">PESEL</option>
                  <option value="DECYZJA_WOJEWODY">Decyzja Wojewody</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Clasificacion</label>
                <select
                  className="select"
                  value={form.documentDisposition}
                  onChange={(e) => setField("documentDisposition", e.target.value)}
                >
                  <option value="PRIMARY">Principal</option>
                  <option value="FRONT">Frente</option>
                  <option value="BACK">Reverso</option>
                  <option value="SUPPORTING">Soporte</option>
                  <option value="DUPLICATE">Duplicado</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem" }}>
                <Field label="Numero de documento" value={form.documentNumber} onChange={(value) => setField("documentNumber", value)} />
                <Field label="Numero personal / PESEL" value={form.personalNumber} onChange={(value) => setField("personalNumber", value)} />
                <Field label="Fecha de expedicion" type="date" value={form.issueDate} onChange={(value) => setField("issueDate", value)} />
                <Field label="Fecha de vencimiento" type="date" value={form.expiryDate} onChange={(value) => setField("expiryDate", value)} />
                <Field label="Nombres" value={form.firstName} onChange={(value) => setField("firstName", value)} />
                <Field label="Apellidos" value={form.lastName} onChange={(value) => setField("lastName", value)} />
                <Field label="Nacionalidad" value={form.nationality} onChange={(value) => setField("nationality", value)} />
                <Field label="Codigo pais / emisor" value={form.issuingCountry} onChange={(value) => setField("issuingCountry", value)} />
                <Field label="Fecha de nacimiento" type="date" value={form.dateOfBirth} onChange={(value) => setField("dateOfBirth", value)} />
                <Field label="Sexo" value={form.sex} onChange={(value) => setField("sex", value)} />
                <Field label="Lugar de nacimiento" value={form.placeOfBirth} onChange={(value) => setField("placeOfBirth", value)} />
                <Field label="Autoridad emisora" value={form.issuingAuthority} onChange={(value) => setField("issuingAuthority", value)} />
                <Field label="Tipo de permiso" value={form.kartaPobytuType} onChange={(value) => setField("kartaPobytuType", value)} />
                <Field label="Estatura (cm)" type="number" value={form.heightCm} onChange={(value) => setField("heightCm", value)} />
                <Field label="Oficina / Urzad Gminy" value={form.municipalityOffice} onChange={(value) => setField("municipalityOffice", value)} />
                <Field label="Observaciones" value={form.remarks} onChange={(value) => setField("remarks", value)} />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="label">Direccion de registro</label>
                <input
                  className="input"
                  value={form.addressOfRegistration}
                  onChange={(e) => setField("addressOfRegistration", e.target.value)}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={form.passportBiometric}
                  onChange={(e) => setField("passportBiometric", e.target.checked)}
                />
                Pasaporte biometrico
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={form.markVerified}
                  onChange={(e) => setField("markVerified", e.target.checked)}
                />
                Marcar documento como verificado
              </label>

              {errorMessage ? <p className="form-message-error">{errorMessage}</p> : null}

              <button type="button" className="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Guardando revision...
                  </>
                ) : (
                  "Guardar revision"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}) {
  return (
    <div className="input-group" style={{ marginBottom: 0 }}>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
