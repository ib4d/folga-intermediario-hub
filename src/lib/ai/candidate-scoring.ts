import { prisma } from "@/lib/prisma";

export interface ScoringResult {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  flags: string[];
}

/**
 * AI Candidate Scoring
 * Evaluates candidate readiness based on data and documents
 */
export async function calculateCandidateScore(
  candidateId: string,
  organizationId?: string
): Promise<ScoringResult> {
  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      documents: true
    }
  });

  if (!candidate) throw new Error("Candidato no encontrado");

  let score = 0;
  const flags: string[] = [];

  // 1. Data Completeness (Max 40 pts)
  if (candidate.firstName && candidate.lastName) score += 10;
  if (candidate.email) score += 10;
  if (candidate.phone) score += 10;
  if (candidate.passportNumber) score += 10;
  else flags.push("Falta número de pasaporte");

  // 2. Document Status (Max 40 pts)
  const approvedDocs = candidate.documents.filter(d => d.isVerified);
  const passportDoc = candidate.documents.find(d => d.type === "PASSPORT");
  
  if (passportDoc) {
    score += 10;
    if (passportDoc.isVerified) score += 15;
  } else {
    flags.push("No se ha subido el pasaporte");
  }

  if (approvedDocs.length >= 3) score += 15;
  else if (approvedDocs.length > 0) score += 5;

  // 3. Status Context (Max 20 pts)
  if (candidate.status === "APROBADO") score += 20;
  else if (candidate.status === "EN_REVISION_LEGAL") score += 10;
  
  if (candidate.status === "RECHAZADO") {
    score = 0;
    flags.push("Candidato rechazado");
  }

  // Determine Level
  let level: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (score >= 80) level = "HIGH";
  else if (score >= 40) level = "MEDIUM";

  // Update candidate in DB
  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      score,
      scoreLevel: level,
      scoreUpdatedAt: new Date()
    }
  });

  return { score, level, flags };
}
