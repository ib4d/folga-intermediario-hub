import { Candidate, LogisticsEvent } from "@prisma/client";

import { getCandidateLegalOutcome } from "@/lib/legal-outcome";

export interface ArrivalReadiness {
  transportScheduled: boolean;
  pickupAssigned: boolean;
  accommodationAssigned: boolean;
  arrivalNotesPresent: boolean;
  legalFollowUpOpen: boolean;
  blockers: string[];
  warnings: string[];
  statusLabel: string;
  isReadyForArrival: boolean;
}

type ArrivalCandidate = Pick<Candidate, "accommodation" | "arrivalNotes" | "reviewNotes" | "rejectionReason" | "status"> & {
  logistics?: Pick<LogisticsEvent, "arrivalDate" | "pickedUpBy" | "confirmed" | "createdAt">[];
};

export function getArrivalReadiness(candidate: ArrivalCandidate): ArrivalReadiness {
  const logistics = [...(candidate.logistics ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latestEvent = logistics[0] ?? null;
  const legalOutcome = getCandidateLegalOutcome(candidate);

  const transportScheduled = logistics.length > 0;
  const pickupAssigned = Boolean(latestEvent?.pickedUpBy?.trim());
  const accommodationAssigned = Boolean(candidate.accommodation?.trim());
  const arrivalNotesPresent = Boolean(candidate.arrivalNotes?.trim());
  const legalFollowUpOpen = (legalOutcome?.followUpActions.length ?? 0) > 0;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!transportScheduled) blockers.push("Falta transporte programado");
  if (!pickupAssigned) blockers.push("Falta responsable de recogida");
  if (!accommodationAssigned) blockers.push("Falta alojamiento asignado");

  if (legalFollowUpOpen) warnings.push("Seguimiento legal pendiente");
  if (!arrivalNotesPresent) warnings.push("Faltan notas de llegada");

  let statusLabel = "Listo para llegada";
  if (!accommodationAssigned) {
    statusLabel = "Falta alojamiento";
  } else if (!pickupAssigned) {
    statusLabel = "Falta recogida";
  } else if (!transportScheduled) {
    statusLabel = "Falta transporte";
  } else if (legalFollowUpOpen) {
    statusLabel = "Seguimiento legal";
  } else if (!arrivalNotesPresent) {
    statusLabel = "Completar notas";
  }

  return {
    transportScheduled,
    pickupAssigned,
    accommodationAssigned,
    arrivalNotesPresent,
    legalFollowUpOpen,
    blockers,
    warnings,
    statusLabel,
    isReadyForArrival: blockers.length === 0,
  };
}
