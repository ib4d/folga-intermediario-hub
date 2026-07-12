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
      setFormError("Debe agregar notas para la revisión adicional.");
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
    <div className="legal-decision-overlay">
      <div className="card legal-decision-modal">
        <div className="legal-decision-modal-header">
          <h2 className="legal-decision-title">
            Decision Legal
          </h2>
          <button
            onClick={onClose}
            className="icon-button legal-decision-close"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="legal-decision-modal-body">
          <div className="legal-decision-candidate">
            CANDIDATO:{" "}
            <span className="legal-decision-candidate-name">
              {candidate.firstName?.toUpperCase()} {candidate.lastName?.toUpperCase()}
            </span>
          </div>

          <div className="legal-decision-summary-grid">
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
            <div className="legal-decision-alert legal-decision-alert--danger">
              <div className="legal-decision-alert-title">
                <ShieldAlert size={16} /> Bloqueos que impiden aprobar
              </div>
              <ul className="legal-decision-alert-list">
                {checklist.blockers.map((blocker, index) => (
                  <li key={`${blocker}-${index}`}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {visibleWarnings.length > 0 ? (
            <div className="legal-decision-alert legal-decision-alert--warning">
              <div className="legal-decision-alert-title">
                <AlertTriangle size={16} /> Alertas operativas
              </div>
              <ul className="legal-decision-alert-list">
                {visibleWarnings.slice(0, 4).map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {checklist.duplicates.length > 0 ? (
            <div className="legal-decision-alert legal-decision-alert--duplicate">
              <div className="legal-decision-alert-title">
                <AlertTriangle size={16} /> Duplicados por clasificar
              </div>
              <ul className="legal-decision-alert-list legal-decision-alert-list--duplicate">
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

          <div className="legal-decision-actions-grid">
            <button
              onClick={() => handleDecisionChange("APROBADO")}
              disabled={!checklist.isReadyForLegal}
              className={`legal-decision-action-button legal-decision-action-button--approve${decision === "APROBADO" ? " is-active" : ""}`}
            >
              <CheckCircle size={24} strokeWidth={2.5} />
              APROBAR
            </button>

            <button
              onClick={() => handleDecisionChange("RECHAZADO")}
              className={`legal-decision-action-button legal-decision-action-button--reject${decision === "RECHAZADO" ? " is-active" : ""}`}
            >
              <XCircle size={24} strokeWidth={2.5} />
              RECHAZAR
            </button>

            <button
              onClick={() => handleDecisionChange("REVISION_ADICIONAL")}
              className={`legal-decision-action-button legal-decision-action-button--review${decision === "REVISION_ADICIONAL" ? " is-active" : ""}`}
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
            <div className="input-group legal-decision-field-group">
              <label className="label">Acciones de seguimiento</label>
              <div className="legal-decision-followup-grid">
                {FOLLOW_UP_ACTIONS.map((action) => (
                  <label
                    key={action}
                    className={`legal-decision-followup-item${followUpActions.includes(action) ? " is-selected" : ""}`}
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
                    ? "Notas de revisión requerida"
                    : "Notas de aprobación"}
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Escriba aqui los detalles..."
                className="input legal-decision-notes"
              />
            </div>
          ) : null}

          {formError ? (
            <div role="alert" className="legal-decision-error">
              {formError}
            </div>
          ) : null}
        </div>

        <div className="legal-decision-modal-footer">
          <button onClick={onClose} className="button button-secondary legal-decision-footer-button">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || isSubmitting}
            className={`button legal-decision-confirm-button${
              decision === "APROBADO"
                ? " legal-decision-confirm-button--approve"
                : decision === "RECHAZADO"
                  ? " legal-decision-confirm-button--reject"
                  : " legal-decision-confirm-button--review"
            }`}
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
  return (
    <div className={`legal-decision-summary-card legal-decision-summary-card--${tone}`}>
      <div className="legal-decision-summary-label">{label}</div>
      <div className="legal-decision-summary-value">{value}</div>
    </div>
  );
}
