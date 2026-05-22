"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CandidateStatus, Prisma, Role } from "@prisma/client";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { candidateSchema } from "@/lib/validations/candidate";
import { candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { getStorageProvider } from "@/lib/providers/storage";
import {
  canCreateCandidates,
  canDeleteCandidates,
  canGenerateRegistrationLinks,
  canImportCandidates,
  canMakeLegalDecision,
  canAccessCandidateByOwnership,
} from "@/lib/permissions";

function parseDateSafe(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") return value === 1;

  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();

  return ["true", "tak", "yes", "sí", "si", "1", "y"].includes(normalized);
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const stringValue = String(value).trim();

  return stringValue.length > 0 ? stringValue : null;
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function rowToHeaders(row: unknown[]): string[] {
  let emptyIndex = 0;

  return row.map((cell) => {
    const label = normalizeOptionalString(cell);
    if (label) {
      return label;
    }

    const generated = emptyIndex === 0 ? "__EMPTY" : `__EMPTY_${emptyIndex}`;
    emptyIndex++;
    return generated;
  });
}

function scorePotentialHeaderRow(row: unknown[]): number {
  const signals = [
    "firstname",
    "lastname",
    "nombre",
    "apellido",
    "dane podstawowe",
    "email",
    "e-mail",
    "telefon",
    "phone",
    "opiekun",
    "obywatelstwo",
    "nombres y apellidos / candidato",
    "candidato",
    "proveedor",
    "fuente",
    "zrodlo",
    "data zaaplikowania",
    "legalizacion",
    "transport",
  ];

  return row.reduce<number>((score, cell) => {
    const value = normalizeOptionalString(cell);
    if (!value) return score;

    const normalized = normalizeHeader(value);
    return score + (signals.some((signal) => normalized.includes(normalizeHeader(signal))) ? 1 : 0);
  }, 0);
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned.length > 0 ? cleaned : null;
}

function looksLikePhoneLine(value: string): boolean {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.length >= 7;
}

function splitImportedName(value: string | null) {
  if (!value) {
    return { firstName: null, lastName: null };
  }

  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return { firstName: null, lastName: null };
  }

  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: null };
  }

  if (tokens.length === 2) {
    return { firstName: tokens[0], lastName: tokens[1] };
  }

  if (tokens.length === 3) {
    return {
      firstName: tokens.slice(1).join(" "),
      lastName: tokens[0],
    };
  }

  return {
    firstName: tokens.slice(-2).join(" "),
    lastName: tokens.slice(0, -2).join(" "),
  };
}

function parseBasicDataBlock(row: SpreadsheetRow) {
  const raw = normalizeOptionalString(getCellValue(row, ["dane podstawowe", "danepodstawowe"]));
  if (!raw) {
    return {
      fullName: null,
      firstName: null,
      lastName: null,
      phone: null,
      email: null,
    };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fullName = lines[0] ?? null;
  const phoneLine = lines.find(looksLikePhoneLine) ?? null;
  const emailLine =
    lines.find((line) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(line)) ?? null;
  const split = splitImportedName(fullName);

  return {
    fullName,
    firstName: split.firstName,
    lastName: split.lastName,
    phone: normalizePhone(phoneLine),
    email: emailLine,
  };
}

function findFullNameFallback(row: SpreadsheetRow): string | null {
  const explicit = normalizeOptionalString(
    getCellValue(row, [
      "nombres y apellidos / candidato",
      "candidato",
      "candidate",
      "full name",
      "fullname",
      "__EMPTY_1",
      "__EMPTY_3",
    ])
  );

  if (explicit) return explicit;

  const values = Object.values(row)
    .map(normalizeOptionalString)
    .filter((value): value is string => !!value);

  return (
    values.find((value) => {
      if (value.includes("@")) return false;
      if (looksLikePhoneLine(value)) return false;
      if (/^\d+([./-]\d+)*$/.test(value)) return false;
      if (value.length < 5) return false;
      return /[a-zA-ZÀ-ÿ]/.test(value);
    }) ?? null
  );
}

function findEmailFallback(row: SpreadsheetRow): string | null {
  const explicit = normalizeOptionalString(getCellValue(row, ["email", "e-mail", "correo"]));
  if (explicit) return explicit;

  return (
    Object.values(row)
      .map(normalizeOptionalString)
      .find((value) => !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) ?? null
  );
}

function findPhoneFallback(row: SpreadsheetRow): string | null {
  const explicit = normalizeOptionalString(getCellValue(row, ["telefon", "phone", "tel"]));
  if (explicit) return normalizePhone(explicit);

  const fallback =
    Object.values(row)
      .map(normalizeOptionalString)
      .find((value) => !!value && looksLikePhoneLine(value)) ?? null;

  return normalizePhone(fallback);
}

function mapNationalityToCountryCode(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeHeader(value);

  if (normalized.includes("kolumb")) return "COL";
  if (normalized.includes("polsk")) return "POL";
  if (normalized.includes("cuba")) return "CUB";
  if (normalized.includes("peru")) return "PER";
  if (normalized.includes("vene")) return "VEN";
  if (normalized.includes("brasil")) return "BRA";

  return value;
}

function canChangeStatus(role: Role): boolean {
  return canMakeLegalDecision(role);
}

function canAccessCandidate(
  role: Role,
  candidateIntermediaryId: string,
  userId: string
): boolean {
  return canAccessCandidateByOwnership(role, candidateIntermediaryId, userId);
}

function parseCandidateStatus(value: string): CandidateStatus {
  if (Object.values(CandidateStatus).includes(value as CandidateStatus)) {
    return value as CandidateStatus;
  }

  if (value === "EN_REVISION") {
    return CandidateStatus.EN_REVISION_LEGAL;
  }

  throw new Error(`Estado de candidato inválido: ${value}`);
}

type SpreadsheetRow = Record<string, unknown>;

function getCellValue(row: SpreadsheetRow, aliases: string[]): unknown {
  const keys = Object.keys(row);

  const matchingKey = keys.find((candidateKey) =>
    aliases.some(
      (alias) => normalizeHeader(candidateKey) === normalizeHeader(alias)
    )
  );

  return matchingKey ? row[matchingKey] : undefined;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

async function removeCandidateStoredFiles(documents: Array<{ url: string }>) {
  const storage = getStorageProvider();
  const paths = documents
    .map((document) => storage.getObjectPathFromPublicUrl(document.url))
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  try {
    await storage.removeObjects(paths);
  } catch (error) {
    console.error("[deleteCandidate] storage cleanup failed", error);
  }
}

async function parseSpreadsheetRows(file: File): Promise<SpreadsheetRow[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("El archivo no contiene hojas validas");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error("No se pudo leer la hoja principal del archivo");
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  const headerRowIndex = matrix.reduce(
    (best, row, index) => {
      const score = scorePotentialHeaderRow(row);
      if (score > best.score) {
        return { index, score };
      }

      return best;
    },
    { index: 0, score: -1 }
  ).index;

  const headers = rowToHeaders(matrix[headerRowIndex] ?? []);
  const dataRows = matrix.slice(headerRowIndex + 1);

  return dataRows
    .map((row) => {
      const mappedRow: SpreadsheetRow = {};

      headers.forEach((header, index) => {
        mappedRow[header] = row[index] ?? null;
      });

      return mappedRow;
    })
    .filter((row) => Object.values(row).some(hasMeaningfulValue));
}

function buildImportedCandidateBase(row: SpreadsheetRow) {
  const basicData = parseBasicDataBlock(row);
  const fallbackFullName = findFullNameFallback(row);
  const splitFallbackName = splitImportedName(fallbackFullName);
  const importedFirstName =
    normalizeOptionalString(getCellValue(row, ["imie", "firstname", "nombre"])) ??
    basicData.firstName ??
    splitFallbackName.firstName;
  const importedLastName =
    normalizeOptionalString(getCellValue(row, ["nazwisko", "lastname", "apellido"])) ??
    basicData.lastName ??
    splitFallbackName.lastName;
  const importedEmail =
    findEmailFallback(row) ?? basicData.email;
  const importedPhone =
    findPhoneFallback(row) ?? basicData.phone;
  const importedNationality =
    normalizeOptionalString(
      getCellValue(row, ["narodowosc", "nationality", "obywatelstwo", "legalizacion"])
    ) ??
    normalizeOptionalString(getCellValue(row, ["obywatelstwo", "citizenship"]));
  const mappedCountry =
    mapNationalityToCountryCode(
      normalizeOptionalString(getCellValue(row, ["country", "pais"])) ?? importedNationality
    ) ?? "COL";

  return {
    firstName: importedFirstName,
    lastName: importedLastName,
    email: importedEmail,
    gender: normalizeOptionalString(getCellValue(row, ["plec", "gender", "sexo"])),
    country: mappedCountry,
    citizenship: importedNationality,
    birthCountry: normalizeOptionalString(
      getCellValue(row, ["panstwo_urodzenia", "birthcountry"])
    ),
    nationality: importedNationality,
    phone: importedPhone,
    peselNumber: normalizeOptionalString(getCellValue(row, ["pesel"])),
    passportNumber: normalizeOptionalString(
      getCellValue(row, ["paszport_seria_numer", "passportnumber", "paszport"])
    ),
    passportBiometric: parseBoolean(getCellValue(row, ["paszport_biometryczny"])),
    kartaPobytuNumber: normalizeOptionalString(
      getCellValue(row, ["karta_pobytu_seria_numer", "kartapobytu"])
    ),
    kartaPobytuType: normalizeOptionalString(getCellValue(row, ["karta_pobytu_typ"])),
    voivodatoNumber: normalizeOptionalString(
      getCellValue(row, ["decyzja_seria_numer", "voivodato"])
    ),
    voivodatoStatus: normalizeOptionalString(getCellValue(row, ["decyzja_status"])),
    recruiterId: normalizeOptionalString(
      getCellValue(row, ["opiekun_rekrutacji", "recruiter", "dodany przez"])
    ),
    accommodation: normalizeOptionalString(
      getCellValue(row, ["zakwaterowanie", "accommodation"])
    ),
    accommodationNotes: normalizeOptionalString(
      getCellValue(row, ["szczegoly_zakwaterowania"])
    ),
    arrivalNotes: normalizeOptionalString(getCellValue(row, ["uwagi_do_przyjazdu"])),
    rejectionReason: normalizeOptionalString(
      getCellValue(row, ["powod_rezygnacji", "rejectionreason"])
    ),
    paid400pln: parseBoolean(getCellValue(row, ["zaplacil_400pln"])),
    gdprConsent: parseBoolean(getCellValue(row, ["gdpr_rodo"])),
    polishAddress: normalizeOptionalString(getCellValue(row, ["adres_polska", "address"])),
    polishCity: normalizeOptionalString(getCellValue(row, ["miasto_polska", "city"])),
    notes:
      normalizeOptionalString(getCellValue(row, ["uwagi", "notes", "notatka", "__EMPTY_2"])) ??
      basicData.fullName ??
      fallbackFullName,
  };
}

function buildImportedCandidatePatch(
  row: SpreadsheetRow,
  baseData: ReturnType<typeof buildImportedCandidateBase>
): Prisma.CandidateUncheckedUpdateInput {
  const patch: Prisma.CandidateUncheckedUpdateInput = {};

  if (hasMeaningfulValue(baseData.firstName)) patch.firstName = baseData.firstName;
  if (hasMeaningfulValue(baseData.lastName)) patch.lastName = baseData.lastName;
  if (hasMeaningfulValue(baseData.email)) patch.email = baseData.email;
  if (hasMeaningfulValue(baseData.gender)) patch.gender = baseData.gender;
  if (hasMeaningfulValue(baseData.country)) patch.country = baseData.country;
  if (hasMeaningfulValue(baseData.citizenship)) patch.citizenship = baseData.citizenship;
  if (hasMeaningfulValue(baseData.birthCountry)) patch.birthCountry = baseData.birthCountry;
  if (hasMeaningfulValue(baseData.nationality)) patch.nationality = baseData.nationality;
  if (hasMeaningfulValue(baseData.phone)) patch.phone = baseData.phone;
  if (hasMeaningfulValue(baseData.peselNumber)) patch.peselNumber = baseData.peselNumber;
  if (hasMeaningfulValue(baseData.passportNumber)) patch.passportNumber = baseData.passportNumber;
  if (hasMeaningfulValue(baseData.kartaPobytuNumber)) {
    patch.kartaPobytuNumber = baseData.kartaPobytuNumber;
  }
  if (hasMeaningfulValue(baseData.kartaPobytuType)) {
    patch.kartaPobytuType = baseData.kartaPobytuType;
  }
  if (hasMeaningfulValue(baseData.voivodatoNumber)) patch.voivodatoNumber = baseData.voivodatoNumber;
  if (hasMeaningfulValue(baseData.voivodatoStatus)) patch.voivodatoStatus = baseData.voivodatoStatus;
  if (hasMeaningfulValue(baseData.recruiterId)) patch.recruiterId = baseData.recruiterId;
  if (hasMeaningfulValue(baseData.accommodation)) patch.accommodation = baseData.accommodation;
  if (hasMeaningfulValue(baseData.accommodationNotes)) {
    patch.accommodationNotes = baseData.accommodationNotes;
  }
  if (hasMeaningfulValue(baseData.arrivalNotes)) patch.arrivalNotes = baseData.arrivalNotes;
  if (hasMeaningfulValue(baseData.rejectionReason)) patch.rejectionReason = baseData.rejectionReason;
  if (hasMeaningfulValue(baseData.polishAddress)) patch.polishAddress = baseData.polishAddress;
  if (hasMeaningfulValue(baseData.polishCity)) patch.polishCity = baseData.polishCity;
  if (hasMeaningfulValue(baseData.notes)) patch.notes = baseData.notes;

  if (getCellValue(row, ["paszport_biometryczny"]) !== undefined) {
    patch.passportBiometric = baseData.passportBiometric;
  }
  if (getCellValue(row, ["zaplacil_400pln"]) !== undefined) {
    patch.paid400pln = baseData.paid400pln;
  }
  if (getCellValue(row, ["gdpr_rodo"]) !== undefined) {
    patch.gdprConsent = baseData.gdprConsent;
  }

  const dateOfBirth = parseDateSafe(
    getCellValue(row, ["data_urodzenia", "dateofbirth", "fecha_nacimiento"])
  );
  if (dateOfBirth) patch.dateOfBirth = dateOfBirth;

  const passportIssueDate = parseDateSafe(
    getCellValue(row, ["paszport_data_wydania", "passportissuedate"])
  );
  if (passportIssueDate) patch.passportIssueDate = passportIssueDate;

  const passportExpiry = parseDateSafe(
    getCellValue(row, ["paszport_data_waznosci", "passportexpiry"])
  );
  if (passportExpiry) patch.passportExpiry = passportExpiry;

  const kartaPobytuIssueDate = parseDateSafe(getCellValue(row, ["karta_pobytu_data_wydania"]));
  if (kartaPobytuIssueDate) patch.kartaPobytuIssueDate = kartaPobytuIssueDate;

  const kartaPobytuExpiry = parseDateSafe(getCellValue(row, ["karta_pobytu_data_waznosci"]));
  if (kartaPobytuExpiry) patch.kartaPobytuExpiry = kartaPobytuExpiry;

  const voivodatoIssueDate = parseDateSafe(getCellValue(row, ["decyzja_data_wydania"]));
  if (voivodatoIssueDate) patch.voivodatoIssueDate = voivodatoIssueDate;

  const voivodatoExpiry = parseDateSafe(getCellValue(row, ["decyzja_data_waznosci"]));
  if (voivodatoExpiry) patch.voivodatoExpiry = voivodatoExpiry;

  const arrivalDate = parseDateSafe(getCellValue(row, ["data_przyjazdu", "arrivaldate"]));
  if (arrivalDate) patch.arrivalDate = arrivalDate;

  const paymentDate = parseDateSafe(getCellValue(row, ["data_platnosci", "paymentdate"]));
  if (paymentDate) patch.paymentDate = paymentDate;

  const gdprConsentDate = parseDateSafe(getCellValue(row, ["gdpr_data", "gdprconsentdate"]));
  if (gdprConsentDate) patch.gdprConsentDate = gdprConsentDate;

  const createdAt = parseDateSafe(getCellValue(row, ["data dodania i źródło", "datadodaniaizrodlo"]));
  if (createdAt) patch.createdAt = createdAt;

  return patch;
}

export async function createCandidate(formData: FormData) {
  const tenant = await requireTenant();

  if (!canCreateCandidates(tenant.role)) {
    throw new Error("Tu rol no puede crear candidatos.");
  }

  await assertWithinPlanLimit(tenant.organizationId!, "candidates");

  const raw = Object.fromEntries(formData.entries());
  const parsed = candidateSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.create({
    data: {
      ...parsed.data,
      intermediaryId: tenant.userId,
      organizationId: tenant.organizationId!,
      status: CandidateStatus.RECOPILANDO_DOCS,
    },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "CANDIDATE_CREATED",
    entityType: "Candidate",
    entityId: candidate.id,
    details: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    },
  });

  await prisma.notification.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      candidateId: candidate.id,
      type: "NEW_CANDIDATE",
      title: "Nuevo candidato",
      message: `Nuevo candidato creado: ${candidate.firstName ?? ""} ${candidate.lastName ?? ""
        }`.trim(),
    },
  });

  await emitEvent(
    "CANDIDATE_CREATED",
    tenant.organizationId!,
    {
      userId: tenant.userId,
      candidateId: candidate.id,
      candidate,
    },
    tenant.userId
  );

  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function updateCandidate(candidateId: string, formData: FormData) {
  const tenant = await requireTenant();

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  if (!candidate) throw new Error("Candidato no encontrado en esta organización");

  if (!canAccessCandidate(tenant.role, candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos sobre este candidato");
  }

  const raw = Object.fromEntries(formData.entries());

  const updateData: Prisma.CandidateUncheckedUpdateInput = {
    firstName: normalizeOptionalString(raw.firstName),
    lastName: normalizeOptionalString(raw.lastName),
    email: normalizeOptionalString(raw.email),
    phone: normalizeOptionalString(raw.phone),
    gender: normalizeOptionalString(raw.gender),
    birthPlace: normalizeOptionalString(raw.birthPlace),
    birthCountry: normalizeOptionalString(raw.birthCountry),
    citizenship: normalizeOptionalString(raw.citizenship),
    nationality: normalizeOptionalString(raw.nationality),
    country: normalizeOptionalString(raw.country) ?? undefined,
    polishAddress: normalizeOptionalString(raw.polishAddress),
    polishCity: normalizeOptionalString(raw.polishCity),
    passportNumber: normalizeOptionalString(raw.passportNumber),
    kartaPobytuNumber: normalizeOptionalString(raw.kartaPobytuNumber),
    kartaPobytuType: normalizeOptionalString(raw.kartaPobytuType),
    peselNumber: normalizeOptionalString(raw.peselNumber),
    voivodatoNumber: normalizeOptionalString(raw.voivodatoNumber),
    voivodatoStatus: normalizeOptionalString(raw.voivodatoStatus),
    recruiterId: normalizeOptionalString(raw.recruiterId),
    accommodation: normalizeOptionalString(raw.accommodation),
    accommodationNotes: normalizeOptionalString(raw.accommodationNotes),
    arrivalNotes: normalizeOptionalString(raw.arrivalNotes),
    notes: normalizeOptionalString(raw.notes),
    dateOfBirth: parseDateSafe(raw.dateOfBirth),
    passportIssueDate: parseDateSafe(raw.passportIssueDate),
    passportExpiry: parseDateSafe(raw.passportExpiry),
    kartaPobytuIssueDate: parseDateSafe(raw.kartaPobytuIssueDate),
    kartaPobytuExpiry: parseDateSafe(raw.kartaPobytuExpiry),
    voivodatoIssueDate: parseDateSafe(raw.voivodatoIssueDate),
    voivodatoExpiry: parseDateSafe(raw.voivodatoExpiry),
    arrivalDate: parseDateSafe(raw.arrivalDate),
    paymentDate: parseDateSafe(raw.paymentDate),
    gdprConsentDate: parseDateSafe(raw.gdprConsentDate),
    paid400pln: parseBoolean(raw.paid400pln),
    gdprConsent: parseBoolean(raw.gdprConsent),
    passportBiometric: parseBoolean(raw.passportBiometric),
  };

  if (typeof raw.heightCm === "string" && raw.heightCm.trim()) {
    const height = Number.parseInt(raw.heightCm, 10);
    if (!Number.isNaN(height)) updateData.heightCm = height;
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: updateData,
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "CANDIDATE_UPDATED",
    entityType: "Candidate",
    entityId: candidateId,
    details: { fields: Object.keys(raw) },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");

  return { success: true };
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string,
  rejectionReason?: string,
  reviewNotes?: string,
  outcomeMeta?: {
    category?: string;
    followUpActions?: string[];
  }
) {
  const tenant = await requireTenant();

  if (!canChangeStatus(tenant.role)) {
    throw new Error("Sin permisos para cambiar estado");
  }

  const parsedStatus = parseCandidateStatus(status);

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId!,
    },
    include: {
      documents: true,
    },
  });

  if (!candidate) throw new Error("Candidato no encontrado");

  const checklist = getCandidateDocumentChecklist(candidate);

  if (parsedStatus === CandidateStatus.APROBADO && !checklist.isReadyForLegal) {
    throw new Error(`No se puede aprobar. Bloqueos activos: ${checklist.blockers.join("; ")}`);
  }

  if (parsedStatus === CandidateStatus.EN_REVISION_LEGAL && !checklist.isComplete) {
    throw new Error(`No se puede enviar a legal. Documentos faltantes: ${checklist.missing.join(", ")}`);
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: parsedStatus,
      rejectionReason: rejectionReason ?? null,
      reviewNotes: reviewNotes ?? null,
      dataRetentionUntil:
        parsedStatus === CandidateStatus.RECHAZADO ||
          parsedStatus === CandidateStatus.RETIRADO
          ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 183)
          : candidate.dataRetentionUntil,
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      organizationId: tenant.organizationId!,
      fromStatus: candidate.status,
      toStatus: parsedStatus,
      changedById: tenant.userId,
      reason: rejectionReason ?? reviewNotes ?? null,
    },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "STATUS_CHANGED",
    entityType: "Candidate",
    entityId: candidateId,
    details: {
      from: candidate.status,
      to: parsedStatus,
      rejectionReason: rejectionReason ?? null,
      reviewNotes: reviewNotes ?? null,
      outcomeCategory: outcomeMeta?.category ?? null,
      followUpActions: outcomeMeta?.followUpActions ?? [],
    },
  });

  await prisma.notification.create({
    data: {
      userId: candidate.intermediaryId,
      organizationId: tenant.organizationId!,
      candidateId,
      type: "STATUS_UPDATE",
      title: "Actualización de estado",
      message: `El estado de ${candidate.firstName ?? ""} ${candidate.lastName ?? ""
        } cambió a ${parsedStatus.replace(/_/g, " ")}${outcomeMeta?.category ? ` - Categoria: ${outcomeMeta.category}` : ""}${rejectionReason ? ` - Motivo: ${rejectionReason}` : ""
        }`.trim(),
    },
  });

  if (parsedStatus === CandidateStatus.APROBADO) {
    const adminLogistics = await prisma.membership.findMany({
      where: {
        organizationId: tenant.organizationId!,
        role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.LOGISTICA] },
        isActive: true,
      },
      select: { userId: true },
    });

    if (adminLogistics.length > 0) {
      await prisma.notification.createMany({
        data: adminLogistics.map((membership) => ({
          userId: membership.userId,
          organizationId: tenant.organizationId!,
          candidateId,
          type: "CANDIDATE_APPROVED",
          title: "Candidato aprobado",
          message: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""
            } ha sido aprobado. Pendiente de logística.`.trim(),
        })),
      });
    }
  }

  await emitEvent(
    "STATUS_CHANGED",
    tenant.organizationId!,
    {
      userId: tenant.userId,
      candidateId,
      candidate: { ...candidate, status: parsedStatus },
      oldStatus: candidate.status,
      newStatus: parsedStatus,
    },
    tenant.userId
  );

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
  revalidatePath("/legal");

  return { success: true };
}

export async function updateCandidateNotes(candidateId: string, notes: string) {
  const tenant = await requireTenant();

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  if (!candidate) throw new Error("Candidato no encontrado");

  if (!canAccessCandidate(tenant.role, candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos");
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { notes },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId!,
    action: "CANDIDATE_NOTES_UPDATED",
    entityType: "Candidate",
    entityId: candidateId,
    details: { notes },
  });

  revalidatePath(`/candidatos/${candidateId}`);

  return { success: true };
}

export async function importCandidatesFromExcel(formData: FormData) {
  const tenant = await requireTenant();
  const file = formData.get("file") as File | null;

  if (!canImportCandidates(tenant.role)) {
    return { success: false, error: "Tu rol no puede importar bases de candidatos." };
  }

  if (!file) return { success: false, error: "No file provided" };

  try {
    const rows = await parseSpreadsheetRows(file);
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const baseData = buildImportedCandidateBase(row);
      const firstName = baseData.firstName;
      const lastName = baseData.lastName;

      if (!firstName || !lastName) {
        skippedCount++;
        continue;
      }
      const { peselNumber, passportNumber } = baseData;

      const existing = await prisma.candidate.findFirst({
        where: {
          organizationId: tenant.organizationId!,
          OR: [
            ...(peselNumber ? [{ peselNumber }] : []),
            ...(passportNumber ? [{ passportNumber }] : []),
            {
              AND: [
                { firstName: { equals: firstName, mode: "insensitive" } },
                { lastName: { equals: lastName, mode: "insensitive" } },
              ],
            },
          ],
        },
      });

      if (existing) {
        const patch = buildImportedCandidatePatch(row, baseData);
        if (Object.keys(patch).length === 0) {
          skippedCount++;
          continue;
        }

        await prisma.candidate.update({
          where: { id: existing.id },
          data: patch,
        });
        updatedCount++;
      } else {
        await assertWithinPlanLimit(tenant.organizationId!, "candidates");
        await prisma.candidate.create({
          data: {
            ...baseData,
            intermediaryId: tenant.userId,
            organizationId: tenant.organizationId!,
            status: CandidateStatus.RECOPILANDO_DOCS,
          },
        });
        createdCount++;
      }
    }

    revalidatePath("/candidatos");

    return {
      success: true,
      count: createdCount + updatedCount,
      createdCount,
      updatedCount,
      skippedCount,
      totalRows: rows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: message };
  }
}

export async function generateRegistrationLink(candidateId: string) {
  const tenant = await requireTenant();

  if (!canGenerateRegistrationLinks(tenant.role)) {
    throw new Error("Tu rol no puede generar links de registro.");
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId!,
    },
  });

  if (!candidate) throw new Error("Candidato no encontrado");

  if (!canAccessCandidate(tenant.role, candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos");
  }

  const token = crypto.randomUUID();

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { registrationToken: token },
  });

  revalidatePath(`/candidatos/${candidateId}`);

  return { token, url: `/registro/${token}` };
}

export async function deleteCandidate(candidateId: string) {
  const tenant = await requireTenant();

  if (!canDeleteCandidates(tenant.role)) {
    throw new Error("Tu rol no puede eliminar candidatos.");
  }

  const candidate = await prisma.candidate.findFirst({
    where: candidateVisibilityWhere(tenant, { id: candidateId }),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      organizationId: true,
      documents: {
        select: {
          url: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new Error("Candidato no encontrado o sin permisos.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.updateMany({
      where: {
        candidateId: candidate.id,
        organizationId: tenant.organizationId,
      },
      data: {
        candidateId: null,
      },
    });

    await tx.document.deleteMany({
      where: {
        candidateId: candidate.id,
        organizationId: tenant.organizationId,
      },
    });

    await tx.logisticsEvent.deleteMany({
      where: {
        candidateId: candidate.id,
        organizationId: tenant.organizationId,
      },
    });

    await tx.statusHistory.deleteMany({
      where: {
        candidateId: candidate.id,
        organizationId: tenant.organizationId,
      },
    });

    await tx.candidate.delete({
      where: { id: candidate.id },
    });
  });

  await removeCandidateStoredFiles(candidate.documents);

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "CANDIDATE_DELETED",
    entityType: "Candidate",
    entityId: candidate.id,
    details: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    },
  });

  revalidatePath("/candidatos");
  revalidatePath("/dashboard");
  revalidatePath("/legal");
  revalidatePath("/logistica");

  return { success: true };
}

export async function deleteCandidatesBulk(candidateIds: string[]) {
  const tenant = await requireTenant();

  if (!canDeleteCandidates(tenant.role)) {
    throw new Error("Tu rol no puede eliminar candidatos.");
  }

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    throw new Error("No se recibieron candidatos para eliminar.");
  }

  const candidates = await prisma.candidate.findMany({
    where: candidateVisibilityWhere(tenant, {
      id: { in: candidateIds },
    }),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documents: {
        select: {
          url: true,
        },
      },
    },
  });

  if (candidates.length === 0) {
    throw new Error("No se encontraron candidatos eliminables en esta seleccion.");
  }

  const candidateIdsToDelete = candidates.map((candidate) => candidate.id);

  await prisma.$transaction(async (tx) => {
    await tx.notification.updateMany({
      where: {
        organizationId: tenant.organizationId,
        candidateId: { in: candidateIdsToDelete },
      },
      data: {
        candidateId: null,
      },
    });

    await tx.document.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        candidateId: { in: candidateIdsToDelete },
      },
    });

    await tx.logisticsEvent.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        candidateId: { in: candidateIdsToDelete },
      },
    });

    await tx.statusHistory.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        candidateId: { in: candidateIdsToDelete },
      },
    });

    await tx.candidate.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        id: { in: candidateIdsToDelete },
      },
    });
  });

  await removeCandidateStoredFiles(candidates.flatMap((candidate) => candidate.documents));

  await Promise.all(
    candidates.map((candidate) =>
      writeAuditLog({
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        action: "CANDIDATE_DELETED",
        entityType: "Candidate",
        entityId: candidate.id,
        details: {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          bulk: true,
        },
      })
    )
  );

  revalidatePath("/candidatos");
  revalidatePath("/dashboard");
  revalidatePath("/legal");
  revalidatePath("/logistica");

  return {
    success: true,
    deletedCount: candidates.length,
  };
}
