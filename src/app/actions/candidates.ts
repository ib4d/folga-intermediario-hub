"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CandidateStatus, Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";

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

function canChangeStatus(role: Role): boolean {
  const allowedRoles: Role[] = [Role.LEGAL, Role.ADMIN, Role.SUPERADMIN];

  return allowedRoles.includes(role);
}

function canAccessCandidate(
  role: Role,
  candidateIntermediaryId: string,
  userId: string
): boolean {
  const privilegedRoles: Role[] = [Role.ADMIN, Role.SUPERADMIN, Role.LEGAL, Role.LOGISTICA];
  if (privilegedRoles.includes(role)) {
    return true;
  }

  return candidateIntermediaryId === userId;
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

type ExcelRow = Record<string, unknown>;

function getCellValue(row: ExcelRow, aliases: string[]): unknown {
  const keys = Object.keys(row);

  const matchingKey = keys.find((candidateKey) =>
    aliases.some(
      (alias) => candidateKey.trim().toLowerCase() === alias.trim().toLowerCase()
    )
  );

  return matchingKey ? row[matchingKey] : undefined;
}

function excelCellToValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return undefined;

  if (value instanceof Date) return value;

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return value.result;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }

  return value;
}

function worksheetToRows(worksheet: ExcelJS.Worksheet): ExcelRow[] {
  const rows: ExcelRow[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values;

    if (!Array.isArray(values)) return;

    if (rowNumber === 1) {
      values.forEach((value, index) => {
        if (index === 0) return;

        const header = normalizeOptionalString(excelCellToValue(value as ExcelJS.CellValue));

        if (header) {
          headers[index] = header;
        }
      });

      return;
    }

    const rowData: ExcelRow = {};

    values.forEach((value, index) => {
      if (index === 0) return;

      const header = headers[index];

      if (!header) return;

      rowData[header] = excelCellToValue(value as ExcelJS.CellValue);
    });

    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

export async function createCandidate(formData: FormData) {
  const tenant = await requireTenant();

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

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "CANDIDATE_CREATED",
      entityType: "Candidate",
      entityId: candidate.id,
      details: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
      },
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

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "CANDIDATE_UPDATED",
      entityType: "Candidate",
      entityId: candidateId,
      details: { fields: Object.keys(raw) },
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");

  return { success: true };
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string,
  rejectionReason?: string,
  reviewNotes?: string
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
  });

  if (!candidate) throw new Error("Candidato no encontrado");

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

  await prisma.auditLog.create({
    data: {
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
      },
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
        } cambió a ${parsedStatus.replace(/_/g, " ")}${rejectionReason ? ` - Motivo: ${rejectionReason}` : ""
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

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "CANDIDATE_NOTES_UPDATED",
      entityType: "Candidate",
      entityId: candidateId,
      details: { notes },
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);

  return { success: true };
}

export async function importCandidatesFromExcel(formData: FormData) {
  const tenant = await requireTenant();

  const file = formData.get("file") as File | null;

  if (!file) return { success: false, error: "No file provided" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return { success: false, error: "El archivo no contiene hojas válidas" };
    }

    const rows = worksheetToRows(worksheet);

    let count = 0;

    for (const row of rows) {
      const firstName = normalizeOptionalString(
        getCellValue(row, ["imie", "firstname", "nombre"])
      );
      const lastName = normalizeOptionalString(
        getCellValue(row, ["nazwisko", "lastname", "apellido"])
      );

      if (!firstName || !lastName) continue;

      const peselNumber = normalizeOptionalString(getCellValue(row, ["pesel"]));
      const passportNumber = normalizeOptionalString(
        getCellValue(row, ["paszport_seria_numer", "passportnumber", "paszport"])
      );
      const email = normalizeOptionalString(getCellValue(row, ["email", "correo"]));

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

      const candidateData: Prisma.CandidateUncheckedCreateInput = {
        firstName,
        lastName,
        email,
        gender: normalizeOptionalString(getCellValue(row, ["plec", "gender", "sexo"])),
        country:
          normalizeOptionalString(
            getCellValue(row, ["obywatelstwo", "country", "pais"])
          ) ?? "COL",
        citizenship: normalizeOptionalString(
          getCellValue(row, ["obywatelstwo", "citizenship"])
        ),
        birthCountry: normalizeOptionalString(
          getCellValue(row, ["panstwo_urodzenia", "birthcountry"])
        ),
        nationality: normalizeOptionalString(
          getCellValue(row, ["narodowosc", "nationality"])
        ),
        phone: normalizeOptionalString(getCellValue(row, ["telefon", "phone", "tel"])),
        peselNumber,
        passportNumber,
        passportBiometric: parseBoolean(getCellValue(row, ["paszport_biometryczny"])),
        kartaPobytuNumber: normalizeOptionalString(
          getCellValue(row, ["karta_pobytu_seria_numer", "kartapobytu"])
        ),
        kartaPobytuType: normalizeOptionalString(
          getCellValue(row, ["karta_pobytu_typ"])
        ),
        voivodatoNumber: normalizeOptionalString(
          getCellValue(row, ["decyzja_seria_numer", "voivodato"])
        ),
        voivodatoStatus: normalizeOptionalString(
          getCellValue(row, ["decyzja_status"])
        ),
        recruiterId: normalizeOptionalString(
          getCellValue(row, ["opiekun_rekrutacji", "recruiter"])
        ),
        accommodation: normalizeOptionalString(
          getCellValue(row, ["zakwaterowanie", "accommodation"])
        ),
        accommodationNotes: normalizeOptionalString(
          getCellValue(row, ["szczegoly_zakwaterowania"])
        ),
        arrivalNotes: normalizeOptionalString(
          getCellValue(row, ["uwagi_do_przyjazdu"])
        ),
        rejectionReason: normalizeOptionalString(
          getCellValue(row, ["powod_rezygnacji", "rejectionreason"])
        ),
        paid400pln: parseBoolean(getCellValue(row, ["zaplacil_400pln"])),
        gdprConsent: parseBoolean(getCellValue(row, ["gdpr_rodo"])),
        polishAddress: normalizeOptionalString(
          getCellValue(row, ["adres_polska", "address"])
        ),
        polishCity: normalizeOptionalString(getCellValue(row, ["miasto_polska", "city"])),
        notes: normalizeOptionalString(getCellValue(row, ["uwagi", "notes"])),
        intermediaryId: tenant.userId,
        organizationId: tenant.organizationId!,
        status: CandidateStatus.RECOPILANDO_DOCS,
      };

      if (existing) {
        await prisma.candidate.update({
          where: { id: existing.id },
          data: candidateData,
        });
      } else {
        await assertWithinPlanLimit(tenant.organizationId!, "candidates");
        await prisma.candidate.create({ data: candidateData });
        count++;
      }
    }

    revalidatePath("/candidatos");

    return { success: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: message };
  }
}

export async function generateRegistrationLink(candidateId: string) {
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

  const token = crypto.randomUUID();

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { registrationToken: token },
  });

  revalidatePath(`/candidatos/${candidateId}`);

  return { token, url: `/registro/${token}` };
}