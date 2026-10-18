"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CandidateStatus, Prisma, Role } from "@prisma/client";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";
import { getStorageProvider } from "@/lib/providers/storage";
import { enqueueStoredObjectDeletion, processStorageDeletionJob } from "@/lib/storage-deletion-queue";
import {
  canCreateCandidates,
  canDeleteCandidates,
  canGenerateRegistrationLinks,
  canImportCandidates,
  canEditCandidateNotes,
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
type ParsedSpreadsheetRow = { rowNumber: number; values: SpreadsheetRow };

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

async function parseSpreadsheetRows(file: File): Promise<ParsedSpreadsheetRow[]> {
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

  if (scorePotentialHeaderRow(matrix[headerRowIndex] ?? []) < 1) {
    throw new Error("No se detectaron encabezados reconocibles. Revisa la fila de títulos del archivo.");
  }

  const headers = rowToHeaders(matrix[headerRowIndex] ?? []);
  const dataRows = matrix.slice(headerRowIndex + 1);

  return dataRows
    .map((row, index) => {
      const mappedRow: SpreadsheetRow = {};

      headers.forEach((header, index) => {
        mappedRow[header] = row[index] ?? null;
      });

      return { rowNumber: headerRowIndex + index + 2, values: mappedRow };
    })
    .filter((row) => Object.values(row.values).some(hasMeaningfulValue));
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

  const candidate = await prisma.$transaction(async (tx) => {
    const createdCandidate = await tx.candidate.create({
      data: {
        ...parsed.data,
        intermediaryId: tenant.userId,
        organizationId: tenant.organizationId!,
        status: CandidateStatus.RECOPILANDO_DOCS,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "CANDIDATE_CREATED",
        entityType: "Candidate",
        entityId: createdCandidate.id,
        details: { changedFields: Object.keys(parsed.data) } satisfies Prisma.InputJsonValue,
      },
    });

    return createdCandidate;
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

  if (!canCreateCandidates(tenant.role)) {
    throw new Error("Tu rol no puede editar perfiles de candidatos.");
  }

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

  await prisma.$transaction(async (tx) => {
    const updatedCount = await tx.candidate.updateMany({
      where: {
        id: candidateId,
        organizationId: tenant.organizationId,
        ...(tenant.role === Role.INTERMEDIARIO ? { intermediaryId: tenant.userId } : {}),
      },
      data: updateData,
    });
    if (updatedCount.count !== 1) {
      throw new Error("El candidato cambió de organización o propietario. Actualiza la página y vuelve a intentarlo.");
    }

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "CANDIDATE_UPDATED",
        entityType: "Candidate",
        entityId: candidateId,
        details: { changedFields: Object.keys(updateData) } satisfies Prisma.InputJsonValue,
      },
    });
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

  if (tenant.role === Role.LEGAL) {
    const legalDecisions = [
      CandidateStatus.APROBADO,
      CandidateStatus.RECHAZADO,
      CandidateStatus.REVISION_ADICIONAL,
    ];

    if (
      candidate.status !== CandidateStatus.EN_REVISION_LEGAL ||
      !legalDecisions.some((decision) => decision === parsedStatus)
    ) {
      throw new Error("Legal solo puede decidir candidatos en cola de revisión legal.");
    }
  }

  const checklist = getCandidateDocumentChecklist(candidate);

  if (parsedStatus === CandidateStatus.APROBADO && !checklist.isReadyForLegal) {
    throw new Error(`No se puede aprobar. Bloqueos activos: ${checklist.blockers.join("; ")}`);
  }

  if (parsedStatus === CandidateStatus.EN_REVISION_LEGAL && !checklist.isComplete) {
    throw new Error(`No se puede enviar a legal. Documentos faltantes: ${checklist.missing.join(", ")}`);
  }

  await prisma.$transaction(async (tx) => {
    const updatedCount = await tx.candidate.updateMany({
      where: {
        id: candidateId,
        organizationId: tenant.organizationId,
        status: candidate.status,
      },
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

    if (updatedCount.count !== 1) {
      throw new Error("El estado del candidato cambió durante la revisión. Actualiza la página y vuelve a intentarlo.");
    }

    await tx.statusHistory.create({
      data: {
        candidateId,
        organizationId: tenant.organizationId,
        fromStatus: candidate.status,
        toStatus: parsedStatus,
        changedById: tenant.userId,
        reason: rejectionReason ?? reviewNotes ?? null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "STATUS_CHANGED",
        entityType: "Candidate",
        entityId: candidateId,
        details: {
          from: candidate.status,
          to: parsedStatus,
        } satisfies Prisma.InputJsonValue,
      },
    });

    await tx.notification.create({
      data: {
        userId: candidate.intermediaryId,
        organizationId: tenant.organizationId!,
        candidateId,
        type: "STATUS_UPDATE",
        title: "Actualización de estado",
        message: `El estado de ${candidate.firstName ?? ""} ${candidate.lastName ?? ""} cambió a ${parsedStatus.replace(/_/g, " ")}${outcomeMeta?.category ? ` - Categoria: ${outcomeMeta.category}` : ""}${rejectionReason ? ` - Motivo: ${rejectionReason}` : ""}`.trim(),
      },
    });

    if (parsedStatus === CandidateStatus.APROBADO) {
      const adminLogistics = await tx.membership.findMany({
        where: {
          organizationId: tenant.organizationId!,
          role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.LOGISTICA] },
          isActive: true,
        },
        select: { userId: true },
      });

      if (adminLogistics.length > 0) {
        await tx.notification.createMany({
          data: adminLogistics.map((membership) => ({
            userId: membership.userId,
            organizationId: tenant.organizationId!,
            candidateId,
            type: "CANDIDATE_APPROVED",
            title: "Candidato aprobado",
            message: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""} ha sido aprobado. Pendiente de logística.`.trim(),
          })),
        });
      }
    }
  });

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
        tenant.userId,
      );

    await syncCandidateOperationalAlerts({
      candidateId,
      organizationId: tenant.organizationId!,
    });

    revalidatePath(`/candidatos/${candidateId}`);
    revalidatePath("/candidatos");
    revalidatePath("/legal");
    revalidatePath("/dashboard");
    revalidatePath("/logistica");
    revalidatePath("/notificaciones");

    return { success: true };
  }

export async function updateCandidateNotes(candidateId: string, notes: string) {
  const tenant = await requireTenant();

  if (!canEditCandidateNotes(tenant.role)) {
    throw new Error("Tu rol no puede modificar las notas internas del candidato.");
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

  await prisma.$transaction(async (tx) => {
    const updatedCount = await tx.candidate.updateMany({
      where: {
        id: candidateId,
        organizationId: tenant.organizationId,
        ...(tenant.role === Role.INTERMEDIARIO ? { intermediaryId: tenant.userId } : {}),
      },
      data: { notes },
    });
    if (updatedCount.count !== 1) {
      throw new Error("El candidato cambió de organización o propietario. Actualiza la página y vuelve a intentarlo.");
    }

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "CANDIDATE_NOTES_UPDATED",
        entityType: "Candidate",
        entityId: candidateId,
        details: { changedFields: ["notes"] } satisfies Prisma.InputJsonValue,
      },
    });
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
  if (file.size <= 0) return { success: false, error: "El archivo está vacío." };
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return { success: false, error: "Formato no admitido. Sube un archivo XLSX, XLS o CSV." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "El archivo supera el límite de 10 MB." };
  }

  try {
    const rows = await parseSpreadsheetRows(file);
    if (rows.length === 0) {
      return { success: false, error: "No se encontraron filas con datos debajo de los encabezados." };
    }
    if (rows.length > 5000) {
      return { success: false, error: "El archivo supera el límite de 5.000 filas. Divide la importación en lotes más pequeños." };
    }
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const rowErrors: Array<{ rowNumber: number; message: string }> = [];

    for (const { rowNumber, values: row } of rows) {
      try {
      const baseData = buildImportedCandidateBase(row);
      const firstName = baseData.firstName;
      const lastName = baseData.lastName;

      if (!firstName || !lastName) {
        skippedCount++;
        rowErrors.push({ rowNumber, message: "Falta nombre o apellido; no se importó." });
        continue;
      }
      const { peselNumber, passportNumber } = baseData;

      const matches = await prisma.candidate.findMany({
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
        take: 2,
        select: { id: true, intermediaryId: true },
      });

      if (matches.length > 1) {
        skippedCount++;
        rowErrors.push({ rowNumber, message: "Coincide con más de un candidato; no se modificó ningún registro para evitar una mezcla de datos." });
        continue;
      }

      const existing = matches[0] ?? null;

      if (existing) {
        if (
          tenant.role === Role.INTERMEDIARIO &&
          existing.intermediaryId !== tenant.userId
        ) {
          skippedCount++;
          rowErrors.push({ rowNumber, message: "Coincide con un candidato fuera de tu ámbito; no se modificó." });
          continue;
        }

        const patch = buildImportedCandidatePatch(row, baseData);
        if (Object.keys(patch).length === 0) {
          skippedCount++;
          rowErrors.push({ rowNumber, message: "No hay datos nuevos para aplicar." });
          continue;
        }

        const importedUpdate = await prisma.$transaction(async (tx) => {
          const result = await tx.candidate.updateMany({
            where: {
              id: existing.id,
              organizationId: tenant.organizationId,
              ...(tenant.role === Role.INTERMEDIARIO ? { intermediaryId: tenant.userId } : {}),
            },
            data: patch,
          });
          if (result.count === 1) {
            await tx.auditLog.create({
              data: {
                userId: tenant.userId,
                organizationId: tenant.organizationId!,
                action: "CANDIDATE_IMPORTED_UPDATED",
                entityType: "Candidate",
                entityId: existing.id,
                details: { changedFields: Object.keys(patch) } satisfies Prisma.InputJsonValue,
              },
            });
          }
          return result;
        });
        if (importedUpdate.count !== 1) {
          skippedCount++;
          rowErrors.push({ rowNumber, message: "El registro cambió durante la importación; vuelve a revisar esta fila." });
          continue;
        }
        updatedCount++;
      } else {
        await assertWithinPlanLimit(tenant.organizationId!, "candidates");
        await prisma.$transaction(async (tx) => {
          const created = await tx.candidate.create({
            data: {
              ...baseData,
              intermediaryId: tenant.userId,
              organizationId: tenant.organizationId!,
              status: CandidateStatus.RECOPILANDO_DOCS,
            },
            select: { id: true },
          });
          await tx.auditLog.create({
            data: {
              userId: tenant.userId,
              organizationId: tenant.organizationId!,
              action: "CANDIDATE_IMPORTED_CREATED",
              entityType: "Candidate",
              entityId: created.id,
              details: { source: "spreadsheet_import" },
            },
          });
        });
        createdCount++;
      }
      } catch (error) {
        skippedCount++;
        const databaseCode = (error as { code?: string } | null)?.code;
        const message = databaseCode === "P2002"
          ? "Conflicto con un dato único (correo o identificador); no se importó."
          : databaseCode === "P2003"
            ? "Referencia de relación no válida; no se importó."
            : "Error al guardar la fila; no se confirmó. Revisa los datos y vuelve a intentarlo.";
        rowErrors.push({
          rowNumber,
          message,
        });
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
      rowErrors,
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
    select: {
      id: true,
      intermediaryId: true,
      status: true,
      selfRegistered: true,
    },
  });

  if (!candidate) throw new Error("Candidato no encontrado");

  if (!canAccessCandidate(tenant.role, candidate.intermediaryId, tenant.userId)) {
    throw new Error("Sin permisos");
  }

  if (
    candidate.selfRegistered ||
    candidate.status === CandidateStatus.RECHAZADO ||
    candidate.status === CandidateStatus.RETIRADO
  ) {
    throw new Error("No se puede generar un enlace para un registro ya completado o cerrado.");
  }

  const token = crypto.randomUUID();
  const tokenCreated = await prisma.$transaction(async (tx) => {
    const result = await tx.candidate.updateMany({
      where: {
        id: candidateId,
        organizationId: tenant.organizationId,
        selfRegistered: false,
        status: { notIn: [CandidateStatus.RECHAZADO, CandidateStatus.RETIRADO] },
        ...(tenant.role === Role.INTERMEDIARIO ? { intermediaryId: tenant.userId } : {}),
      },
      data: { registrationToken: token },
    });
    if (result.count === 1) {
      await tx.auditLog.create({
        data: {
          userId: tenant.userId,
          organizationId: tenant.organizationId!,
          action: "CANDIDATE_REGISTRATION_LINK_GENERATED",
          entityType: "Candidate",
          entityId: candidateId,
          details: { tokenStored: true },
        },
      });
    }
    return result;
  });

  if (tokenCreated.count !== 1) {
    throw new Error("El candidato ya fue registrado, cerrado o cambio de propietario.");
  }

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
    },
  });

  if (!candidate) {
    throw new Error("Candidato no encontrado o sin permisos.");
  }

  const cleanupJobId = await prisma.$transaction(async (tx) => {
    const documents = await tx.document.findMany({
      where: {
        candidateId: candidate.id,
        organizationId: tenant.organizationId,
      },
      select: { id: true, url: true },
    });

    await tx.notification.updateMany({
      where: {
        candidateId: candidate.id,
        organizationId: tenant.organizationId,
      },
      data: {
        candidateId: null,
      },
    });

    const deletedDocuments = await tx.document.deleteMany({
      where: {
        candidateId: candidate.id,
        organizationId: tenant.organizationId,
      },
    });
    if (deletedDocuments.count !== documents.length) {
      throw new Error("Los documentos del candidato cambiaron durante el borrado. Actualiza e inténtalo de nuevo.");
    }
    const jobId = await enqueueStoredObjectDeletion(
      tx,
      tenant.organizationId!,
      documents.map((document) => document.url)
    );

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

    const deletedCount = await tx.candidate.deleteMany({
      where: {
        id: candidate.id,
        organizationId: tenant.organizationId,
        ...(tenant.role === Role.INTERMEDIARIO ? { intermediaryId: tenant.userId } : {}),
      },
    });
    if (deletedCount.count !== 1) {
      throw new Error("El candidato cambió de organización o propietario. Actualiza la página y vuelve a intentarlo.");
    }
    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "CANDIDATE_DELETED",
        entityType: "Candidate",
        entityId: candidate.id,
        details: {
          documentCount: documents.length,
          storageDeletionQueued: Boolean(jobId),
          storageDeletionJobId: jobId,
        },
      },
    });
    return jobId;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const storageCleanup = cleanupJobId
    ? await processStorageDeletionJob(cleanupJobId)
    : "complete";

  revalidatePath("/candidatos");
  revalidatePath("/dashboard");
  revalidatePath("/legal");
  revalidatePath("/logistica");

  return { success: true, storageCleanup };
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
    },
  });

  if (candidates.length === 0) {
    throw new Error("No se encontraron candidatos eliminables en esta seleccion.");
  }

  const candidateIdsToDelete = candidates.map((candidate) => candidate.id);

  const cleanupJobId = await prisma.$transaction(async (tx) => {
    const documents = await tx.document.findMany({
      where: {
        organizationId: tenant.organizationId,
        candidateId: { in: candidateIdsToDelete },
      },
      select: { id: true, candidateId: true, url: true },
    });

    await tx.notification.updateMany({
      where: {
        organizationId: tenant.organizationId,
        candidateId: { in: candidateIdsToDelete },
      },
      data: {
        candidateId: null,
      },
    });

    const deletedDocuments = await tx.document.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        candidateId: { in: candidateIdsToDelete },
      },
    });
    if (deletedDocuments.count !== documents.length) {
      throw new Error("Los documentos de la selección cambiaron durante el borrado. Actualiza e inténtalo de nuevo.");
    }
    const jobId = await enqueueStoredObjectDeletion(
      tx,
      tenant.organizationId!,
      documents.map((document) => document.url)
    );

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

    const deletedCandidates = await tx.candidate.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        id: { in: candidateIdsToDelete },
        ...(tenant.role === Role.INTERMEDIARIO ? { intermediaryId: tenant.userId } : {}),
      },
    });
    if (deletedCandidates.count !== candidateIdsToDelete.length) {
      throw new Error("Algunos candidatos cambiaron de organización o propietario. Actualiza la página y vuelve a intentarlo.");
    }
    await tx.auditLog.createMany({
      data: candidates.map((candidate) => ({
        userId: tenant.userId,
        organizationId: tenant.organizationId!,
        action: "CANDIDATE_DELETED",
        entityType: "Candidate",
        entityId: candidate.id,
        details: {
          documentCount: documents.filter((document) => document.candidateId === candidate.id).length,
          bulk: true,
          storageDeletionQueued: Boolean(jobId),
          storageDeletionJobId: jobId,
        },
      })),
    });
    return jobId;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const storageCleanup = cleanupJobId
    ? await processStorageDeletionJob(cleanupJobId)
    : "complete";

  revalidatePath("/candidatos");
  revalidatePath("/dashboard");
  revalidatePath("/legal");
  revalidatePath("/logistica");

  return {
    success: true,
    deletedCount: candidates.length,
    storageCleanup,
  };
}
