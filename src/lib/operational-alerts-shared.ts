import { LocationStatus } from "@prisma/client";
import type { Candidate, Document, LogisticsEvent } from "@prisma/client";

import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";

export type OperationalAlertType =
  | "LOGISTICS_MISSING_TRANSPORT"
  | "LOGISTICS_MISSING_PICKUP"
  | "LOGISTICS_MISSING_ACCOMMODATION"
  | "LOGISTICS_LEGAL_BLOCKER"
  | "LOGISTICS_DOCUMENT_BLOCKER"
  | "LOGISTICS_ARRIVAL_OVERDUE"
  | "LOGISTICS_ARRIVAL_TODAY";

export type OperationalAlertSeverity = "info" | "warning" | "danger";

export interface OperationalAlert {
  type: OperationalAlertType;
  severity: OperationalAlertSeverity;
  title: string;
  message: string;
}

export const TRACKED_OPERATIONAL_ALERT_TYPES: OperationalAlertType[] = [
  "LOGISTICS_MISSING_TRANSPORT",
  "LOGISTICS_MISSING_PICKUP",
  "LOGISTICS_MISSING_ACCOMMODATION",
  "LOGISTICS_LEGAL_BLOCKER",
  "LOGISTICS_DOCUMENT_BLOCKER",
  "LOGISTICS_ARRIVAL_OVERDUE",
  "LOGISTICS_ARRIVAL_TODAY",
];

export type OperationalCandidate = Candidate & {
  documents: Document[];
  logistics: LogisticsEvent[];
};

function getCandidateDisplayName(candidate: Pick<Candidate, "firstName" | "lastName">) {
  return `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "candidato";
}

function isJourneyTracked(candidate: OperationalCandidate) {
  return (
    candidate.status === "APROBADO" ||
    candidate.locationStatus === LocationStatus.EN_TRANSITO ||
    candidate.logistics.length > 0 ||
    Boolean(candidate.arrivalDate) ||
    Boolean(candidate.accommodation?.trim()) ||
    Boolean(candidate.arrivalNotes?.trim())
  );
}

export function getCandidateOperationalAlerts(candidate: OperationalCandidate): OperationalAlert[] {
  const arrivalReadiness = getArrivalReadiness(candidate);
  const checklist = getCandidateDocumentChecklist(candidate);
  const legalOutcome = getCandidateLegalOutcome(candidate);

  if (!isJourneyTracked(candidate)) {
    return [];
  }

  const alerts: OperationalAlert[] = [];
  const displayName = getCandidateDisplayName(candidate);
  const hasScheduledArrival =
    arrivalReadiness.transportScheduled &&
    (arrivalReadiness.isArrivalToday ||
      arrivalReadiness.isArrivalUpcoming ||
      arrivalReadiness.isArrivalOverdue);

  if (!arrivalReadiness.transportScheduled) {
    alerts.push({
      type: "LOGISTICS_MISSING_TRANSPORT",
      severity: "warning",
      title: "Falta transporte",
      message: `Todavia no hay transporte programado para ${displayName}.`,
    });
  }

  if (arrivalReadiness.transportScheduled && !arrivalReadiness.pickupAssigned) {
    alerts.push({
      type: "LOGISTICS_MISSING_PICKUP",
      severity: "danger",
      title: "Falta recogida",
      message: `Hay llegada programada para ${displayName} pero aun falta asignar responsable de recogida.`,
    });
  }

  if (arrivalReadiness.transportScheduled && !arrivalReadiness.accommodationAssigned) {
    alerts.push({
      type: "LOGISTICS_MISSING_ACCOMMODATION",
      severity: "danger",
      title: "Falta alojamiento",
      message: `Hay llegada programada para ${displayName} pero aun falta alojamiento asignado.`,
    });
  }

  if (hasScheduledArrival && legalOutcome?.followUpActions.length) {
    alerts.push({
      type: "LOGISTICS_LEGAL_BLOCKER",
      severity: "danger",
      title: "Bloqueo legal antes de llegada",
      message: `El viaje de ${displayName} tiene seguimiento legal pendiente: ${legalOutcome.followUpActions.join(", ")}.`,
    });
  }

  if (hasScheduledArrival && checklist.blockers.length > 0) {
    alerts.push({
      type: "LOGISTICS_DOCUMENT_BLOCKER",
      severity: "danger",
      title: "Bloqueo documental antes de llegada",
      message: `La llegada de ${displayName} sigue bloqueada por documentos: ${checklist.blockers.join(", ")}.`,
    });
  }

  if (arrivalReadiness.isArrivalOverdue) {
    alerts.push({
      type: "LOGISTICS_ARRIVAL_OVERDUE",
      severity: "danger",
      title: "Llegada vencida sin confirmar",
      message: `La llegada de ${displayName} ya paso y sigue sin confirmacion operativa.`,
    });
  } else if (arrivalReadiness.isArrivalToday && !arrivalReadiness.confirmedArrival) {
    alerts.push({
      type: "LOGISTICS_ARRIVAL_TODAY",
      severity: "info",
      title: "Llegada prevista hoy",
      message: `La llegada de ${displayName} esta prevista para hoy y sigue pendiente de confirmacion.`,
    });
  }

  return alerts;
}
