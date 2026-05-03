import { Candidate, User } from "@prisma/client";

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
 * - SUPERADMIN: Always
 * - ADMIN/LEGAL: Always
 * - INTERMEDIARIO: Only if it's their own candidate
 */
export function canViewFullData(user: { id: string; role: string }, candidate: Candidate) {
  if (["SUPERADMIN", "ADMIN", "LEGAL"].includes(user.role)) return true;
  if (user.role === "INTERMEDIARIO" && candidate.intermediaryId === user.id) return true;
  return false;
}

/**
 * Returns an exportable object for a candidate (Right to Data Portability).
 */
export function exportCandidateData(candidate: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { registrationToken, ...exportData } = candidate;
  return exportData;
}

/**
 * Anonymizes a candidate's record (Right to be Forgotten).
 */
export async function anonymizeCandidate(prisma: any, candidateId: string) {
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
export async function archiveExpiredCandidates(prisma: any) {
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
