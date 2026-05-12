import { Candidate } from "@prisma/client";

export interface ParsedLegalOutcome {
  category: string | null;
  summary: string;
  followUpActions: string[];
}

export function parseStructuredLegalOutcome(source: string | null): ParsedLegalOutcome | null {
  if (!source || source.trim().length === 0) {
    return null;
  }

  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const getValue = (prefix: string) =>
    lines.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()))?.split(":").slice(1).join(":").trim() ?? null;

  const category = getValue("Categoria:");
  const notes = getValue("Notas:");
  const actions = getValue("Acciones:") ?? "";
  const decision = getValue("Decision:");

  return {
    category,
    summary: notes ?? decision ?? source.trim(),
    followUpActions: actions
      .split(",")
      .map((action) => action.trim())
      .filter(Boolean),
  };
}

export function getCandidateLegalOutcome(
  candidate: Pick<Candidate, "status" | "rejectionReason" | "reviewNotes">,
): ParsedLegalOutcome | null {
  return parseStructuredLegalOutcome(
    candidate.status === "RECHAZADO" ? candidate.rejectionReason : candidate.reviewNotes,
  );
}
