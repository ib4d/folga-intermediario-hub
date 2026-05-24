import { Candidate, LocationStatus, LogisticsEvent } from "@prisma/client";

import { getCandidateLegalOutcome } from "@/lib/legal-outcome";

export type JourneyState =
  | "SIN_TRANSPORTE"
  | "TRANSPORTE_PROGRAMADO"
  | "PENDIENTE_RECOGIDA"
  | "PENDIENTE_ALOJAMIENTO"
  | "LISTO_PARA_LLEGADA"
  | "EN_TRANSITO"
  | "LLEGADA_CONFIRMADA";

export interface ArrivalReadiness {
  transportScheduled: boolean;
  pickupAssigned: boolean;
  accommodationAssigned: boolean;
  arrivalNotesPresent: boolean;
  legalFollowUpOpen: boolean;
  blockers: string[];
  warnings: string[];
  journeyState: JourneyState;
  arrivalDate: Date | null;
  confirmedArrival: boolean;
  isArrivalToday: boolean;
  isArrivalUpcoming: boolean;
  isArrivalOverdue: boolean;
  statusLabel: string;
  isReadyForArrival: boolean;
}

type ArrivalCandidate = Pick<
  Candidate,
  | "accommodation"
  | "arrivalDate"
  | "arrivalNotes"
  | "locationStatus"
  | "reviewNotes"
  | "rejectionReason"
  | "status"
> & {
  logistics?: Pick<
    LogisticsEvent,
    | "arrivalDate"
    | "confirmed"
    | "createdAt"
    | "flightOrTrain"
    | "pickedUpBy"
    | "terminal"
    | "transportType"
  >[];
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toSafeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getJourneyState(params: {
  accommodationAssigned: boolean;
  arrivalDate: Date | null;
  confirmedArrival: boolean;
  locationStatus: LocationStatus;
  pickupAssigned: boolean;
  transportScheduled: boolean;
}): JourneyState {
  const {
    accommodationAssigned,
    arrivalDate,
    confirmedArrival,
    locationStatus,
    pickupAssigned,
    transportScheduled,
  } = params;

  if (confirmedArrival) return "LLEGADA_CONFIRMADA";
  if (locationStatus === LocationStatus.EN_TRANSITO) return "EN_TRANSITO";
  if (!transportScheduled) return "SIN_TRANSPORTE";
  if (!arrivalDate) return "TRANSPORTE_PROGRAMADO";
  if (!pickupAssigned) return "PENDIENTE_RECOGIDA";
  if (!accommodationAssigned) return "PENDIENTE_ALOJAMIENTO";
  return "LISTO_PARA_LLEGADA";
}

function getJourneyLabel(journeyState: JourneyState) {
  switch (journeyState) {
    case "SIN_TRANSPORTE":
      return "Sin transporte";
    case "TRANSPORTE_PROGRAMADO":
      return "Transporte programado";
    case "PENDIENTE_RECOGIDA":
      return "Pendiente recogida";
    case "PENDIENTE_ALOJAMIENTO":
      return "Pendiente alojamiento";
    case "LISTO_PARA_LLEGADA":
      return "Listo para llegada";
    case "EN_TRANSITO":
      return "En transito";
    case "LLEGADA_CONFIRMADA":
      return "Llegada confirmada";
    default:
      return "Pendiente";
  }
}

export function getArrivalReadiness(candidate: ArrivalCandidate): ArrivalReadiness {
  const logistics = [...(candidate.logistics ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latestEvent = logistics[0] ?? null;
  const legalOutcome = getCandidateLegalOutcome(candidate);
  const now = new Date();

  const transportScheduled = logistics.length > 0;
  const pickupAssigned = Boolean(latestEvent?.pickedUpBy?.trim());
  const accommodationAssigned = Boolean(candidate.accommodation?.trim());
  const arrivalNotesPresent = Boolean(candidate.arrivalNotes?.trim());
  const legalFollowUpOpen = (legalOutcome?.followUpActions.length ?? 0) > 0;
  const arrivalDate = toSafeDate(latestEvent?.arrivalDate ?? candidate.arrivalDate);
  const confirmedArrival =
    Boolean(latestEvent?.confirmed) || candidate.locationStatus === LocationStatus.EN_POLONIA;
  const isArrivalToday = Boolean(arrivalDate && isSameDay(arrivalDate, now));
  const isArrivalUpcoming = Boolean(
    arrivalDate &&
      arrivalDate.getTime() >= now.getTime() &&
      arrivalDate.getTime() - now.getTime() <= 2 * DAY_IN_MS,
  );
  const isArrivalOverdue = Boolean(
    arrivalDate && arrivalDate.getTime() < now.getTime() && !confirmedArrival,
  );

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!transportScheduled) {
    blockers.push("Falta transporte programado");
  } else {
    if (!pickupAssigned) blockers.push("Falta responsable de recogida");
    if (!accommodationAssigned) blockers.push("Falta alojamiento asignado");
  }

  if (legalFollowUpOpen) warnings.push("Seguimiento legal pendiente");
  if (!arrivalNotesPresent) warnings.push("Faltan notas de llegada");
  if (isArrivalToday && !confirmedArrival) warnings.push("Llegada prevista hoy");
  if (isArrivalOverdue) warnings.push("Llegada pasada sin confirmacion");

  const journeyState = getJourneyState({
    accommodationAssigned,
    arrivalDate,
    confirmedArrival,
    locationStatus: candidate.locationStatus,
    pickupAssigned,
    transportScheduled,
  });

  let statusLabel = getJourneyLabel(journeyState);
  if (journeyState === "LISTO_PARA_LLEGADA" && legalFollowUpOpen) {
    statusLabel = "Seguimiento legal";
  } else if (journeyState === "LISTO_PARA_LLEGADA" && !arrivalNotesPresent) {
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
    journeyState,
    arrivalDate,
    confirmedArrival,
    isArrivalToday,
    isArrivalUpcoming,
    isArrivalOverdue,
    statusLabel,
    isReadyForArrival: blockers.length === 0,
  };
}
