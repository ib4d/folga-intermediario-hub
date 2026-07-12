"use client";

import Link from "next/link";
import { Candidate, Document, Role, User } from "@prisma/client";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import { type AppLanguage, t } from "@/lib/i18n";
import { canViewCandidatePayment } from "@/lib/permissions";
import { AlertCircle, FileText, MapPin, ShieldAlert, User as UserIcon } from "lucide-react";
import { useState } from "react";
import ExpandableText from "@/components/ui/ExpandableText";
import LegalDecisionModal from "./LegalDecisionModal";

interface Props {
  candidate: Candidate & {
    documents: Document[];
    intermediary: User;
  };
  viewerRole: Role;
  language: AppLanguage;
}

export default function LegalCandidateCard({ candidate, viewerRole, language }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const labels = t.bind(null, language);
  const checklist = getCandidateDocumentChecklist(candidate);
  const legalOutcome = getCandidateLegalOutcome(candidate);
  const canViewPayment = canViewCandidatePayment(viewerRole);
  const visibleWarnings = canViewPayment
    ? checklist.warnings
    : checklist.warnings.filter((warning) => !warning.toLowerCase().includes("400 pln"));

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-ES");
  };

  const now = typeof window !== "undefined" ? new Date().getTime() : 0;

  const isExpiringSoon = (date: Date | null) => {
    if (!date) return false;
    const diffDays = (new Date(date).getTime() - now) / (1000 * 60 * 60 * 24);
    return diffDays < 90;
  };

  return (
    <div className="card equal-card legal-candidate-card">
      <div className="legal-candidate-card-section legal-candidate-card-header">
        <div className="legal-candidate-card-header-main">
          <div>
            <h3 className="legal-candidate-card-title">
              {candidate.firstName} {candidate.lastName}
            </h3>
            <div className="legal-candidate-card-meta">
              <span className="legal-candidate-card-pill">
                <MapPin size={14} />
                {candidate.country}
              </span>
              <span className="legal-candidate-card-pill">
                <UserIcon size={14} />
                {candidate.intermediary.name}
              </span>
            </div>
          </div>

          <div className="legal-candidate-card-status-stack">
            {canViewPayment ? (
              <span className={`status-badge legal-candidate-card-status-badge ${candidate.paid400pln ? "legal-candidate-card-status-badge--paid" : "legal-candidate-card-status-badge--pending"}`}>
                {candidate.paid400pln ? "400 PLN OK" : "PENDIENTE PAGO"}
              </span>
            ) : null}
            <span
              className={`status-badge legal-candidate-card-status-badge ${
                checklist.isReadyForLegal
                  ? "legal-candidate-card-status-badge--ready"
                  : "legal-candidate-card-status-badge--blocked"
              }`}
            >
              {checklist.isReadyForLegal ? "LISTO PARA DECISION" : `${checklist.blockers.length} BLOQUEOS`}
            </span>
          </div>
        </div>
      </div>

      <div className="legal-candidate-card-section legal-candidate-card-grid">
        <div>
          <div className="legal-candidate-card-kicker">PASAPORTE</div>
          <div className="legal-candidate-card-value">{candidate.passportNumber || "N/A"}</div>
          <div className={`legal-candidate-card-subvalue ${isExpiringSoon(candidate.passportExpiry) ? "legal-candidate-card-subvalue--danger" : "legal-candidate-card-subvalue--muted"}`}>
            EXP: {formatDate(candidate.passportExpiry)}
          </div>
        </div>

        <div>
          <div className="legal-candidate-card-kicker">KARTA POBYTU</div>
          <div className="legal-candidate-card-value">{candidate.kartaPobytuNumber || "NO TIENE"}</div>
          {candidate.kartaPobytuExpiry ? (
            <div className="legal-candidate-card-subvalue">
              EXP: {formatDate(candidate.kartaPobytuExpiry)}
            </div>
          ) : null}
        </div>

        <div>
          <div className="legal-candidate-card-kicker">
            PESEL / VOIVODATO
          </div>
          <div className="legal-candidate-card-value">{candidate.peselNumber || "N/A"}</div>
          <div className="legal-candidate-card-subvalue">
            {candidate.voivodatoStatus || "SIN TRAMITE"}
          </div>
        </div>

        <div>
          <div className="legal-candidate-card-kicker">DOCUMENTOS</div>
          <div className="legal-candidate-card-value legal-candidate-card-value--with-icon">
            <FileText size={14} />
            {checklist.stats.verifiedDocuments}/{checklist.stats.totalDocuments} VERIFICADOS
          </div>
          <div className={`legal-candidate-card-subvalue ${checklist.missing.length > 0 ? "legal-candidate-card-subvalue--danger" : "legal-candidate-card-subvalue--muted"}`}>
            {checklist.missing.length > 0
              ? `FALTAN: ${checklist.missing.join(", ")}`
              : `${checklist.stats.pendingReviewDocuments} POR REVISAR`}
          </div>
        </div>
      </div>

      {checklist.blockers.length > 0 ? (
        <div className="legal-candidate-card-alert legal-candidate-card-alert--danger">
          <div className="legal-candidate-card-alert-title">
            <ShieldAlert size={14} strokeWidth={3} />
            BLOQUEOS LEGALES
          </div>
          <ExpandableText maxLength={120} className="legal-candidate-card-alert-text legal-candidate-card-alert-text--danger">
            {checklist.blockers.map((blocker) => `- ${blocker}`).join(" | ")}
          </ExpandableText>
        </div>
      ) : null}

      {checklist.duplicates.length > 0 ? (
        <div className="legal-candidate-card-alert legal-candidate-card-alert--warning">
          <div className="legal-candidate-card-alert-title">
            <ShieldAlert size={14} strokeWidth={3} />
            {labels("legal.duplicateReviewTitle")}
          </div>
          <div className="legal-candidate-card-alert-text legal-candidate-card-alert-text--warning legal-candidate-card-alert-text--gap-sm">
            {labels("legal.duplicateReviewDescription")}
          </div>
          <ExpandableText maxLength={130} className="legal-candidate-card-alert-text legal-candidate-card-alert-text--warning">
            {checklist.duplicates
              .map((group) => `${labels("legal.duplicateDetected")}: ${group.type}${group.number ? ` (${group.number})` : ""} x${group.count}`)
              .join(" | ")}
          </ExpandableText>
          <div className="legal-candidate-card-alert-text legal-candidate-card-alert-text--warning legal-candidate-card-alert-text--gap-sm">
            {labels("legal.duplicateSuggestedAction")}: {getDuplicateSuggestion(checklist.duplicates, labels)}
          </div>
        </div>
      ) : null}

      {visibleWarnings.length > 0 ? (
        <div className="legal-candidate-card-alert legal-candidate-card-alert--danger">
          <div className="legal-candidate-card-alert-title">
            <AlertCircle size={14} strokeWidth={3} />
            ALERTAS
          </div>
          <ExpandableText maxLength={120} className="legal-candidate-card-alert-text legal-candidate-card-alert-text--danger">
            {visibleWarnings.map((warning) => `- ${warning}`).join(" | ")}
          </ExpandableText>
        </div>
      ) : null}

      {legalOutcome ? (
        <div className="legal-candidate-card-alert legal-candidate-card-alert--info">
          <div className="legal-candidate-card-legal-header">
            <span className="legal-candidate-card-alert-title legal-candidate-card-alert-title--info">
              Resultado legal
            </span>
            {legalOutcome.category ? (
              <span className="legal-candidate-card-legal-category">
                {legalOutcome.category.toUpperCase()}
              </span>
            ) : null}
          </div>

          {legalOutcome.summary ? (
            <ExpandableText maxLength={110} className="legal-candidate-card-alert-text legal-candidate-card-alert-text--info legal-candidate-card-alert-text--preline">
              {legalOutcome.summary}
            </ExpandableText>
          ) : null}

          {legalOutcome.followUpActions.length > 0 ? (
            <ExpandableText maxLength={110} className="legal-candidate-card-alert-text legal-candidate-card-alert-text--info legal-candidate-card-alert-text--followup">
              {legalOutcome.followUpActions.join(" | ")}
            </ExpandableText>
          ) : null}
        </div>
      ) : null}

      <div className="legal-candidate-card-footer">
        <div className="legal-candidate-card-footer-timestamp">
          {new Date(candidate.updatedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
        </div>
        <div className="legal-candidate-card-footer-actions">
          <Link
            href={`/candidatos/${candidate.id}`}
            className="button button-secondary legal-candidate-card-footer-button"
          >
            VER DETALLES
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="button legal-candidate-card-footer-button"
          >
            REVISAR
          </button>
        </div>
      </div>

      <LegalDecisionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} candidate={candidate} viewerRole={viewerRole} />
    </div>
  );
}

function getDuplicateSuggestion(
  duplicates: Array<{
    count: number;
  }>,
  labels: (key: Parameters<typeof t>[1]) => string,
) {
  const maxCount = duplicates.reduce((highest, group) => Math.max(highest, group.count), 0);
  if (maxCount <= 2) {
    return labels("legal.duplicateSuggestFrontBack");
  }

  return labels("legal.duplicateSuggestReclassify");
}
