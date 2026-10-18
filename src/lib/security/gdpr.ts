import { Candidate, Role } from "@prisma/client";

/**
 * Masks sensitive data for display purposes.
 * - passportNumber: show last 3 chars only
 * - peselNumber: show last 3 digits only
 */
export function maskSensitiveData(candidate: Partial<Candidate>) {
  const masked = { ...candidate };

  if (masked.passportNumber) {
    const len = masked.passportNumber.length;
    masked.passportNumber = len > 3 
      ? "*".repeat(len - 3) + masked.passportNumber.slice(-3) 
      : masked.passportNumber;
  }

  if (masked.peselNumber) {
    const len = masked.peselNumber.length;
    masked.peselNumber = len > 3 
      ? "*".repeat(len - 3) + masked.peselNumber.slice(-3) 
      : masked.peselNumber;
  }

  return masked;
}

/**
 * Checks if a user has permission to see full (unmasked) data.
 * Callers must pass the effective role from the current tenant context;
 * User.role and the session role are not authoritative for access decisions.
 * - SUPERADMIN: Always
 * - ADMIN/LEGAL: Always
 * - INTERMEDIARIO: Only if it's their own candidate
 */
export function canViewFullData(
  tenant: { userId: string; organizationId: string; role: Role },
  candidate: Candidate
) {
  if (candidate.organizationId !== tenant.organizationId) return false;
  if (
    tenant.role === Role.SUPERADMIN ||
    tenant.role === Role.ADMIN ||
    tenant.role === Role.LEGAL
  ) return true;
  if (tenant.role === Role.INTERMEDIARIO && candidate.intermediaryId === tenant.userId) return true;
  return false;
}

/**
 * Returns an exportable object for a candidate (Right to Data Portability).
 */
export function exportCandidateData(candidate: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { registrationToken, ...exportData } = candidate;
  return exportData;
}

/**
 * Anonymizes a candidate's record (Right to be Forgotten).
 */
export async function anonymizeCandidate(prisma: { candidate: { update: (args: { where: { id: string }, data: Record<string, unknown> }) => Promise<unknown> } }, candidateId: string) {
  return await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      firstName: "ANONYMIZED",
      lastName: "ANONYMIZED",
      email: `anon_${candidateId}@deleted.com`,
      phone: "000000000",
      passportNumber: "DELETED",
      peselNumber: "DELETED",
      kartaPobytuNumber: "DELETED",
      notes: "Candidato anonimizado por solicitud de GDPR",
      isArchived: true,
    }
  });
}

/**
 * Archives candidates whose data retention period has expired.
 */
export async function archiveExpiredCandidates(prisma: { candidate: { updateMany: (args: { where: Record<string, unknown>, data: Record<string, unknown> }) => Promise<unknown> } }) {
  const now = new Date();
  return await prisma.candidate.updateMany({
    where: {
      dataRetentionUntil: {
        lte: now
      },
      isArchived: false
    },
    data: {
      isArchived: true
    }
  });
}
