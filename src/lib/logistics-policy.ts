import { CandidateStatus } from "@prisma/client";

export const LOGISTICS_BLOCKED_STATUSES = [
  CandidateStatus.RECHAZADO,
  CandidateStatus.RETIRADO,
] as const;

export function isLogisticsSchedulableStatus(status: CandidateStatus): boolean {
  return !LOGISTICS_BLOCKED_STATUSES.includes(
    status as (typeof LOGISTICS_BLOCKED_STATUSES)[number]
  );
}

