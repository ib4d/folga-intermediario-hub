"use server";

import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import type { CandidateStatus, Prisma, Role } from "@prisma/client";
const CandidateStatus = {
  RECOPILANDO_DOCS: 'RECOPILANDO_DOCS',
  DOCUMENTACION_PENDIENTE: 'DOCUMENTACION_PENDIENTE',
  EN_REVISION_LEGAL: 'EN_REVISION_LEGAL',
  REVISION_ADICIONAL: 'REVISION_ADICIONAL',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  EN_PROCESO_PERMISO: 'EN_PROCESO_PERMISO',
  CONTRATADO: 'CONTRATADO',
  RETIRADO: 'RETIRADO'
} as any;
const Role = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  INTERMEDIARIO: 'INTERMEDIARIO',
  LEGAL: 'LEGAL',
  LOGISTICA: 'LOGISTICA'
} as any;
import { requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";

function parseDateSafe(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "Tak" || value === "yes" || value === "1";
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function canChangeStatus(role: Role): boolean {
  return ([Role.LEGAL, Role.ADMIN, Role.SUPERADMIN] as Role[]).includes(role);
}

function canAccessCandidate(role: Role, candidateIntermediaryId: string, userId: string): boolean {
  if (([Role.ADMIN, Role.SUPERADMIN, Role.LEGAL, Role.LOGISTICA] as Role[]).includes(role)) return true;
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
      entity: "Candidate",
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
      message: `Nuevo candidato creado: ${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim(),
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
      entity: "Candidate",
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
        parsedStatus === CandidateStatus.RECHAZADO || parsedStatus === CandidateStatus.RETIRADO
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
      changedBy: tenant.userId,
      reason: rejectionReason ?? reviewNotes ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "STATUS_CHANGED",
      entity: "Candidate",
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
      data: { ...(candidate as any), intermediaryId: candidate.intermediaryId, organizationId: tenant.organizationId!, candidateId, type: "STATUS_UPDATE", message: `El estado de ${candidate.firstName ?? ""} ${candidate.lastName ?? ""} cambió a ${parsedStatus.replace(/_/g, " ")}${rejectionReason ? ` - Motivo: ${rejectionReason}` : ""}`.trim() } as any,
  });

  if (parsedStatus === CandidateStatus.APROBADO) {
    const memberships = await prisma.membership.findMany({ where: { organizationId: tenant.organizationId! } });
    const isPlatformAdmin = memberships.some((membership: any) => (membership as any).role === "SUPERADMIN");
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
        data: adminLogistics.map((membership: any) => ({
          userId: membership.userId,
          organizationId: tenant.organizationId!,
          candidateId,
          type: "CANDIDATE_APPROVED",
          message: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""} ha sido aprobado. Pendiente de logística.`.trim(),
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
      entity: "Candidate",
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
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    let count = 0;

    for (const row of rows) {
      const keys = Object.keys(row);

      const findValue = (aliases: string[]) => {
        const key = keys.find((candidateKey) =>
          aliases.some((alias) => candidateKey.toLowerCase() === alias.toLowerCase())
        );
        return key ? row[key] : undefined;
      };

      const firstName = normalizeOptionalString(findValue(["imie", "firstname", "nombre"]));
      const lastName = normalizeOptionalString(findValue(["nazwisko", "lastname", "apellido"]));

      if (!firstName || !lastName) continue;

      const peselNumber = normalizeOptionalString(findValue(["pesel"]));
      const passportNumber = normalizeOptionalString(findValue(["paszport_seria_numer", "passportnumber", "paszport"]));
      const email = normalizeOptionalString(findValue(["email", "correo"]));

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
        gender: normalizeOptionalString(findValue(["plec", "gender", "sexo"])),
        country: normalizeOptionalString(findValue(["obywatelstwo", "country", "pais"])) ?? "COL",
        citizenship: normalizeOptionalString(findValue(["obywatelstwo", "citizenship"])),
        birthCountry: normalizeOptionalString(findValue(["panstwo_urodzenia", "birthcountry"])),
        nationality: normalizeOptionalString(findValue(["narodowosc", "nationality"])),
        phone: normalizeOptionalString(findValue(["telefon", "phone", "tel"])),
        peselNumber,
        passportNumber,
        passportBiometric: parseBoolean(findValue(["paszport_biometryczny"])),
        kartaPobytuNumber: normalizeOptionalString(findValue(["karta_pobytu_seria_numer", "kartapobytu"])),
        kartaPobytuType: normalizeOptionalString(findValue(["karta_pobytu_typ"])),
        voivodatoNumber: normalizeOptionalString(findValue(["decyzja_seria_numer", "voivodato"])),
        voivodatoStatus: normalizeOptionalString(findValue(["decyzja_status"])),
        recruiterId: normalizeOptionalString(findValue(["opiekun_rekrutacji", "recruiter"])),
        accommodation: normalizeOptionalString(findValue(["zakwaterowanie", "accommodation"])),
        accommodationNotes: normalizeOptionalString(findValue(["szczegoly_zakwaterowania"])),
        arrivalNotes: normalizeOptionalString(findValue(["uwagi_do_przyjazdu"])),
        rejectionReason: normalizeOptionalString(findValue(["powod_rezygnacji", "rejectionreason"])),
        paid400pln: parseBoolean(findValue(["zaplacil_400pln"])),
        gdprConsent: parseBoolean(findValue(["gdpr_rodo"])),
        polishAddress: normalizeOptionalString(findValue(["adres_polska", "address"])),
        polishCity: normalizeOptionalString(findValue(["miasto_polska", "city"])),
        notes: normalizeOptionalString(findValue(["uwagi", "notes"])),
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