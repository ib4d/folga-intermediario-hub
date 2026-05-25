"use client";

import { Candidate, Document, Role, User } from "@prisma/client";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import { type AppLanguage, t } from "@/lib/i18n";
import { canViewCandidatePayment } from "@/lib/permissions";
import { AlertCircle, FileText, MapPin, ShieldAlert, User as UserIcon } from "lucide-react";
import { useState } from "react";
import ExpandableText from "@/components/ui/ExpandableText";
import LegalDecisionModal from "./LegalDecisionModal";
import Link from "next/link";

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
    <div className="card equal-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "2px solid var(--pitch-black)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              {candidate.firstName} {candidate.lastName}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem", fontWeight: "bold", color: "var(--muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <MapPin size={14} />
                {candidate.country}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <UserIcon size={14} />
                {candidate.intermediary.name}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
            {canViewPayment ? (
              <span
                className="status-badge"
                style={{
                  backgroundColor: candidate.paid400pln ? "#4ade80" : "var(--primary)",
                  fontSize: "0.65rem",
                  whiteSpace: "nowrap",
                }}
              >
                {candidate.paid400pln ? "400 PLN OK" : "PENDIENTE PAGO"}
              </span>
            ) : null}
            <span
              className="status-badge"
              style={{
                backgroundColor: checklist.isReadyForLegal ? "#d1fae5" : "#fee2e2",
                color: checklist.isReadyForLegal ? "#065f46" : "#991b1b",
                fontSize: "0.65rem",
                whiteSpace: "nowrap",
              }}
            >
              {checklist.isReadyForLegal ? "LISTO PARA DECISION" : `${checklist.blockers.length} BLOQUEOS`}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "1.25rem 1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          borderBottom: "2px solid var(--pitch-black)",
        }}
      >
        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: "900", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.25rem" }}>
            PASAPORTE
          </div>
          <div style={{ fontWeight: "900", fontSize: "0.9rem" }}>{candidate.passportNumber || "N/A"}</div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: "bold",
              color: isExpiringSoon(candidate.passportExpiry) ? "#e63946" : "var(--muted)",
            }}
          >
            EXP: {formatDate(candidate.passportExpiry)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: "900", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.25rem" }}>
            KARTA POBYTU
          </div>
          <div style={{ fontWeight: "900", fontSize: "0.9rem" }}>{candidate.kartaPobytuNumber || "NO TIENE"}</div>
          {candidate.kartaPobytuExpiry ? (
            <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--muted)" }}>
              EXP: {formatDate(candidate.kartaPobytuExpiry)}
            </div>
          ) : null}
        </div>

        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: "900", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.25rem" }}>
            PESEL / VOIVODATO
          </div>
          <div style={{ fontWeight: "900", fontSize: "0.9rem" }}>{candidate.peselNumber || "N/A"}</div>
          <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--muted)" }}>
            {candidate.voivodatoStatus || "SIN TRAMITE"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: "900", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.25rem" }}>
            DOCUMENTOS
          </div>
          <div style={{ fontWeight: "900", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <FileText size={14} />
            {checklist.stats.verifiedDocuments}/{checklist.stats.totalDocuments} VERIFICADOS
          </div>
          <div style={{ fontSize: "0.7rem", fontWeight: "900", color: checklist.missing.length > 0 ? "#e63946" : "var(--muted)" }}>
            {checklist.missing.length > 0
              ? `FALTAN: ${checklist.missing.join(", ")}`
              : `${checklist.stats.pendingReviewDocuments} POR REVISAR`}
          </div>
        </div>
      </div>

      {checklist.blockers.length > 0 ? (
        <div style={{ padding: "0.75rem 1.5rem", backgroundColor: "#fee2e2", borderBottom: "2px solid var(--pitch-black)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "900", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            <ShieldAlert size={14} strokeWidth={3} />
            BLOQUEOS LEGALES
          </div>
          <ExpandableText maxLength={120} style={{ display: "block", fontSize: "0.7rem", fontWeight: "bold", lineHeight: 1.5 }}>
            {checklist.blockers.map((blocker) => `- ${blocker}`).join(" | ")}
          </ExpandableText>
        </div>
      ) : null}

      {checklist.duplicates.length > 0 ? (
        <div style={{ padding: "0.75rem 1.5rem", backgroundColor: "#fff7ed", borderBottom: "2px solid var(--pitch-black)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "900", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            <ShieldAlert size={14} strokeWidth={3} />
            {labels("legal.duplicateReviewTitle")}
          </div>
          <div style={{ fontSize: "0.72rem", fontWeight: "bold", color: "#9a3412", marginBottom: "0.45rem", lineHeight: 1.5 }}>
            {labels("legal.duplicateReviewDescription")}
          </div>
          <ExpandableText maxLength={130} style={{ display: "block", fontSize: "0.72rem", fontWeight: "bold", lineHeight: 1.5, color: "#7c2d12" }}>
            {checklist.duplicates
              .map((group) => `${labels("legal.duplicateDetected")}: ${group.type}${group.number ? ` (${group.number})` : ""} x${group.count}`)
              .join(" | ")}
          </ExpandableText>
          <div style={{ marginTop: "0.45rem", fontSize: "0.7rem", fontWeight: "800", color: "#9a3412", lineHeight: 1.45 }}>
            {labels("legal.duplicateSuggestedAction")}: {getDuplicateSuggestion(checklist.duplicates, labels)}
          </div>
        </div>
      ) : null}

      {visibleWarnings.length > 0 ? (
        <div style={{ padding: "0.75rem 1.5rem", backgroundColor: "#ffccd5", borderBottom: "2px solid var(--pitch-black)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "900", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            <AlertCircle size={14} strokeWidth={3} />
            ALERTAS
          </div>
          <ExpandableText maxLength={120} style={{ display: "block", fontSize: "0.7rem", fontWeight: "bold", lineHeight: 1.5 }}>
            {visibleWarnings.map((warning) => `- ${warning}`).join(" | ")}
          </ExpandableText>
        </div>
      ) : null}

      {legalOutcome ? (
        <div style={{ padding: "0.85rem 1.5rem", backgroundColor: "#eef2ff", borderBottom: "2px solid var(--pitch-black)" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontWeight: "900", fontSize: "0.7rem", textTransform: "uppercase", color: "#4338ca" }}>
              Resultado legal
            </span>
            {legalOutcome.category ? (
              <span
                style={{
                  padding: "0.15rem 0.45rem",
                  backgroundColor: "#c7d2fe",
                  color: "#312e81",
                  fontSize: "0.65rem",
                  fontWeight: "900",
                }}
              >
                {legalOutcome.category.toUpperCase()}
              </span>
            ) : null}
          </div>

          {legalOutcome.summary ? (
            <ExpandableText maxLength={110} style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#3730a3", whiteSpace: "pre-line", margin: 0 }}>
              {legalOutcome.summary}
            </ExpandableText>
          ) : null}

          {legalOutcome.followUpActions.length > 0 ? (
            <ExpandableText maxLength={110} style={{ display: "block", marginTop: "0.6rem", color: "#3730a3", fontSize: "0.65rem", fontWeight: 800 }}>
              {legalOutcome.followUpActions.join(" | ")}
            </ExpandableText>
          ) : null}
        </div>
      ) : null}

      <div style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--white-smoke)", marginTop: "auto" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--muted)" }}>
          {new Date(candidate.updatedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href={`/candidatos/${candidate.id}`}
            className="button button-secondary"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }}
          >
            VER DETALLES
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="button"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.7rem" }}
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
