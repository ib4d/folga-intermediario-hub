"use client";

import { updateCandidateStatus } from "@/app/actions/candidates";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { canViewCandidatePayment } from "@/lib/permissions";
import { Candidate, Document, Role } from "@prisma/client";
import { AlertTriangle, CheckCircle, ShieldAlert, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate & { documents: Document[] };
  viewerRole: Role;
}

const BASE_REJECTION_REASONS = [
  "Documentos faltantes",
  "Documento expirado",
  "Documento ilegible",
  "Historial negativo en FOLGA",
  "Proceso migratorio incompleto",
  "Falta pago 400 PLN",
  "Otro",
];

const REVIEW_CATEGORIES = [
  "Correccion OCR requerida",
  "Falta validar expiracion",
  "Falta clasificar duplicados",
  "Falta soporte adicional",
  "Pendiente confirmacion legal",
];

const FOLLOW_UP_ACTIONS = [
  "Solicitar nuevo pasaporte",
  "Solicitar mejor foto o escaneo",
  "Solicitar comprobante de pago",
  "Solicitar documento faltante",
  "Revisar duplicados / frente-reverso",
  "Escalar a legal senior",
  "Preparar para logistica",
];

function buildOutcomeSummary({
  decision,
  category,
  notes,
  followUpActions,
}: {
  decision: "APROBADO" | "RECHAZADO" | "REVISION_ADICIONAL";
  category: string;
  notes: string;
  followUpActions: string[];
}) {
  const lines = [
    `Decision: ${decision.replace(/_/g, " ")}`,
    category ? `Categoria: ${category}` : null,
    followUpActions.length > 0 ? `Acciones: ${followUpActions.join(", ")}` : null,
    notes.trim() ? `Notas: ${notes.trim()}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export default function LegalDecisionModal({ isOpen, onClose, candidate, viewerRole }: Props) {
  const checklist = useMemo(() => getCandidateDocumentChecklist(candidate), [candidate]);
  const canViewPayment = canViewCandidatePayment(viewerRole);
  const visibleWarnings = useMemo(
    () => (canViewPayment ? checklist.warnings : checklist.warnings.filter((warning) => !warning.toLowerCase().includes("400 pln"))),
    [canViewPayment, checklist.warnings],
  );
  const [decision, setDecision] = useState<"APROBADO" | "RECHAZADO" | "REVISION_ADICIONAL" | null>(null);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpActions, setFollowUpActions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const suggestedReasons = useMemo(() => {
    const reasons = new Set(BASE_REJECTION_REASONS);

    if (checklist.missing.length > 0) reasons.add("Documentos faltantes");
    if (checklist.warnings.some((warning) => warning.toLowerCase().includes("vence"))) {
      reasons.add("Documento expirado");
    }
    if (checklist.blockers.some((blocker) => blocker.toLowerCase().includes("verific"))) {
      reasons.add("Proceso migratorio incompleto");
    }
    if (canViewPayment && checklist.warnings.some((warning) => warning.toLowerCase().includes("400 pln"))) {
      reasons.add("Falta pago 400 PLN");
    }

    return Array.from(reasons);
  }, [canViewPayment, checklist]);

  if (!isOpen) return null;

  const defaultReviewNotes =
    checklist.blockers.length > 0 ? checklist.blockers.join("; ") : visibleWarnings.slice(0, 3).join("; ");

  const currentCategoryOptions =
    decision === "RECHAZADO"
      ? suggestedReasons
      : decision === "REVISION_ADICIONAL"
        ? REVIEW_CATEGORIES
        : ["Aprobacion completa", "Aprobacion con seguimiento operativo"];

  const handleDecisionChange = (nextDecision: "APROBADO" | "RECHAZADO" | "REVISION_ADICIONAL") => {
    setDecision(nextDecision);
    const nextCategory =
      nextDecision === "REVISION_ADICIONAL" && checklist.duplicates.length > 0
        ? "Falta clasificar duplicados"
        : "";
    const nextFollowUpActions =
      nextDecision === "REVISION_ADICIONAL" && checklist.duplicates.length > 0
        ? ["Revisar duplicados / frente-reverso"]
        : [];

    setCategory(nextCategory);
    setFollowUpActions(nextFollowUpActions);
    setFormError("");
    if (!notes.trim() && defaultReviewNotes) {
      setNotes(defaultReviewNotes);
    }
  };

  const toggleFollowUpAction = (action: string) => {
    setFollowUpActions((current) =>
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
    );
  };

  const handleSubmit = async () => {
    if (!decision) return;

    if (decision === "APROBADO" && !checklist.isReadyForLegal) {
      setFormError(`No se puede aprobar mientras existan bloqueos: ${checklist.blockers.join("; ")}`);
      return;
    }

    if ((decision === "RECHAZADO" || decision === "REVISION_ADICIONAL") && !category) {
      setFormError("Debe seleccionar una categoria antes de confirmar.");
      return;
    }

    if (decision === "REVISION_ADICIONAL" && !notes.trim()) {
      setFormError("Debe agregar notas para la revision adicional.");
      return;
    }

    const summary = buildOutcomeSummary({
      decision,
      category,
      notes,
      followUpActions,
    });

    setIsSubmitting(true);
    setFormError("");
    try {
      await updateCandidateStatus(
        candidate.id,
        decision,
        decision === "RECHAZADO" ? summary : undefined,
        decision !== "RECHAZADO" ? summary : notes || undefined,
        {
          category,
          followUpActions,
        },
      );
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al procesar la decision";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        padding: "0.5rem",
        backgroundColor: "rgba(11, 5, 0, 0.75)",
        overflow: "hidden",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "760px",
          padding: 0,
          overflow: "hidden",
          boxShadow: "8px 8px 0px var(--pitch-black)",
          maxHeight: "calc(100dvh - 1rem)",
          display: "flex",
          flexDirection: "column",
          margin: 0,
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "2px solid var(--pitch-black)",
            backgroundColor: "var(--pitch-black)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flex: "0 0 auto",
          }}
        >
          <h2 style={{ color: "var(--primary)", fontWeight: "900", textTransform: "uppercase", margin: 0 }}>
            Decision Legal
          </h2>
          <button
            onClick={onClose}
            className="icon-button"
            style={{ backgroundColor: "transparent", borderColor: "var(--primary)", color: "var(--primary)" }}
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            backgroundColor: "var(--ghost-white)",
            overflowY: "auto",
            overscrollBehavior: "contain",
            minHeight: 0,
            flex: "1 1 auto",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "var(--white-smoke)",
              border: "2px solid var(--pitch-black)",
              fontSize: "0.875rem",
              fontWeight: "bold",
            }}
          >
            CANDIDATO:{" "}
            <span style={{ fontWeight: "900" }}>
              {candidate.firstName?.toUpperCase()} {candidate.lastName?.toUpperCase()}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem" }}>
            <SummaryCard
              label="Documentos"
              value={`${checklist.stats.verifiedDocuments}/${checklist.stats.totalDocuments}`}
              tone="neutral"
            />
            <SummaryCard
              label="Bloqueos"
              value={String(checklist.blockers.length)}
              tone={checklist.blockers.length > 0 ? "danger" : "success"}
            />
            <SummaryCard
              label="Pendientes OCR"
              value={String(checklist.stats.pendingReviewDocuments)}
              tone={checklist.stats.pendingReviewDocuments > 0 ? "warning" : "success"}
            />
          </div>

          {checklist.blockers.length > 0 ? (
            <div style={{ padding: "1rem", backgroundColor: "#fee2e2", border: "2px solid #991b1b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "900", marginBottom: "0.5rem" }}>
                <ShieldAlert size={16} /> Bloqueos que impiden aprobar
              </div>
              <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.8rem", fontWeight: 700 }}>
                {checklist.blockers.map((blocker, index) => (
                  <li key={`${blocker}-${index}`}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {visibleWarnings.length > 0 ? (
            <div style={{ padding: "1rem", backgroundColor: "#fef3c7", border: "2px solid #92400e" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "900", marginBottom: "0.5rem" }}>
                <AlertTriangle size={16} /> Alertas operativas
              </div>
              <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.8rem", fontWeight: 700 }}>
                {visibleWarnings.slice(0, 4).map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {checklist.duplicates.length > 0 ? (
            <div style={{ padding: "1rem", backgroundColor: "#fff7ed", border: "2px solid #c2410c" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "900", marginBottom: "0.5rem" }}>
                <AlertTriangle size={16} /> Duplicados por clasificar
              </div>
              <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.55, color: "#7c2d12" }}>
                {checklist.duplicates.map((group) => (
                  <li key={group.key}>
                    {group.type}
                    {group.number ? ` (${group.number})` : ""} x{group.count}
                    {" - "}
                    {group.count <= 2
                      ? "Confirmar si es frente y reverso"
                      : "Mantener un principal y reclasificar soporte/duplicados"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
            <button
              onClick={() => handleDecisionChange("APROBADO")}
              disabled={!checklist.isReadyForLegal}
              style={decisionButtonStyle(decision === "APROBADO", "#4ade80", !checklist.isReadyForLegal)}
            >
              <CheckCircle size={24} strokeWidth={2.5} color={decision === "APROBADO" ? "var(--pitch-black)" : "#4ade80"} />
              APROBAR
            </button>

            <button
              onClick={() => handleDecisionChange("RECHAZADO")}
              style={decisionButtonStyle(decision === "RECHAZADO", "#e63946", false, true)}
            >
              <XCircle size={24} strokeWidth={2.5} />
              RECHAZAR
            </button>

            <button
              onClick={() => handleDecisionChange("REVISION_ADICIONAL")}
              style={decisionButtonStyle(decision === "REVISION_ADICIONAL", "var(--primary)", false)}
            >
              <AlertTriangle size={24} strokeWidth={2.5} />
              REVISION
            </button>
          </div>

          {decision ? (
            <div className="input-group">
              <label className="label">Categoria de decision</label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="select">
                <option value="">Seleccione una categoria...</option>
                {currentCategoryOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {decision ? (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="label">Acciones de seguimiento</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                {FOLLOW_UP_ACTIONS.map((action) => (
                  <label
                    key={action}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem",
                      border: "1px solid var(--grey-olive)",
                      backgroundColor: followUpActions.includes(action) ? "rgba(252, 186, 4, 0.14)" : "white",
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={followUpActions.includes(action)}
                      onChange={() => toggleFollowUpAction(action)}
                    />
                    {action}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {decision === "REVISION_ADICIONAL" || decision === "RECHAZADO" || decision === "APROBADO" ? (
            <div className="input-group">
              <label className="label">
                {decision === "RECHAZADO"
                  ? "Detalles adicionales"
                  : decision === "REVISION_ADICIONAL"
                    ? "Notas de revision requerida"
                    : "Notas de aprobacion"}
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Escriba aqui los detalles..."
                className="input"
                style={{ height: "112px", resize: "none" }}
              />
            </div>
          ) : null}

          {formError ? (
            <div
              role="alert"
              style={{
                padding: "0.85rem 1rem",
                backgroundColor: "#fee2e2",
                border: "2px solid #991b1b",
                color: "#7f1d1d",
                fontSize: "0.85rem",
                fontWeight: 800,
              }}
            >
              {formError}
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "var(--white-smoke)",
            borderTop: "2px solid var(--pitch-black)",
            display: "flex",
            gap: "1rem",
            flex: "0 0 auto",
          }}
        >
          <button onClick={onClose} className="button button-secondary" style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || isSubmitting}
            className="button"
            style={{
              flex: 1,
              opacity: !decision || isSubmitting ? 0.5 : 1,
              cursor: !decision || isSubmitting ? "not-allowed" : "pointer",
              backgroundColor:
                decision === "APROBADO"
                  ? "#4ade80"
                  : decision === "RECHAZADO"
                    ? "#e63946"
                    : "var(--primary)",
              color: decision === "RECHAZADO" ? "white" : "var(--pitch-black)",
            }}
          >
            {isSubmitting ? "Procesando..." : "Confirmar decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "warning" | "danger" | "success";
}) {
  const backgroundColor =
    tone === "danger"
      ? "#fee2e2"
      : tone === "warning"
        ? "#fef3c7"
        : tone === "success"
          ? "#d1fae5"
          : "var(--white-smoke)";

  return (
    <div style={{ padding: "0.85rem", border: "2px solid var(--pitch-black)", backgroundColor }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "0.35rem" }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function decisionButtonStyle(active: boolean, activeBackground: string, disabled: boolean, invertText = false) {
  return {
    padding: "1rem",
    fontWeight: "900",
    fontSize: "0.8rem",
    textTransform: "uppercase" as const,
    border: "2px solid var(--pitch-black)",
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundColor: active ? activeBackground : "var(--background)",
    color: active && invertText ? "white" : "var(--foreground)",
    boxShadow: active ? "4px 4px 0px var(--pitch-black)" : "2px 2px 0px var(--pitch-black)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    gap: "0.5rem",
    transition: "all 0.15s",
    opacity: disabled ? 0.45 : 1,
  };
}
