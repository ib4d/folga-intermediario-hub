export function shouldTryBatchCandidateHeuristicMatch(input: {
  documentType: string | null | undefined;
  documentDisposition: string | null | undefined;
}) {
  const documentType = input.documentType?.trim().toUpperCase();
  const documentDisposition = input.documentDisposition?.trim().toUpperCase();

  if (documentDisposition === "BACK") return true;

  return !["PASSPORT", "KARTA_POBYTU", "PESEL"].includes(documentType ?? "");
}
