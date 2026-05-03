"use server";

import { prisma } from "@/lib/prisma";
import { candidateRegistrationSchema } from "@/lib/validations/candidate-registration";
import { CandidateStatus, LocationStatus, RecruitmentSource, Role } from "@prisma/client";

function parseDateSafe(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function parseLocationStatus(value: string): LocationStatus {
  if (Object.values(LocationStatus).includes(value as LocationStatus)) {
    return value as LocationStatus;
  }
  return LocationStatus.EN_ORIGEN;
}

function parseRecruitmentSource(value: unknown): RecruitmentSource | null {
  if (typeof value !== "string") return null;

  if (Object.values(RecruitmentSource).includes(value as RecruitmentSource)) {
    return value as RecruitmentSource;
  }

  return null;
}

export async function submitCandidateRegistration(token: string, data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { error: { _global: ["Datos inválidos"] } };
  }

  const preparedData = { ...(data as Record<string, unknown>) };

  preparedData.paid400pln = normalizeBoolean(preparedData.paid400pln);
  preparedData.gdprConsent = normalizeBoolean(preparedData.gdprConsent);
  preparedData.passportBiometric = normalizeBoolean(preparedData.passportBiometric);

  const parsed = candidateRegistrationSchema.safeParse(preparedData);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { registrationToken: token },
  });

  if (!candidate) {
    return { error: { _global: ["Token inválido o expirado"] } };
  }

  if (candidate.selfRegistered) {
    return { error: { _global: ["Este formulario ya fue completado"] } };
  }

  const registration = parsed.data;

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email || null,
      phone: registration.phone,
      gender: registration.gender,
      dateOfBirth: parseDateSafe(registration.dateOfBirth),
      birthPlace: registration.birthPlace,
      birthCountry: registration.birthCountry,
      citizenship: registration.citizenship,
      nationality: registration.nationality,
      country: registration.country,
      locationStatus: parseLocationStatus(registration.locationStatus),
      polishAddress: registration.polishAddress || null,
      polishCity: registration.polishCity || null,

      passportNumber: registration.passportNumber,
      passportIssueDate: parseDateSafe(registration.passportIssueDate),
      passportExpiry: parseDateSafe(registration.passportExpiry),
      passportBiometric: registration.passportBiometric,

      kartaPobytuNumber: registration.kartaPobytuNumber || null,
      kartaPobytuIssueDate: parseDateSafe(registration.kartaPobytuIssueDate),
      kartaPobytuExpiry: parseDateSafe(registration.kartaPobytuExpiry),
      kartaPobytuType: registration.kartaPobytuType || null,

      peselNumber: registration.peselNumber || null,

      voivodatoNumber: registration.voivodatoNumber || null,
      voivodatoIssueDate: parseDateSafe(registration.voivodatoIssueDate),
      voivodatoExpiry: parseDateSafe(registration.voivodatoExpiry),
      voivodatoStatus: registration.voivodatoStatus || null,

      recruitmentSource: parseRecruitmentSource(registration.recruitmentSource),

      arrivalDate: parseDateSafe(registration.arrivalDate),
      arrivalNotes: registration.arrivalNotes || null,
      accommodation: registration.accommodation || null,
      accommodationNotes: registration.accommodationNotes || null,

      paid400pln: registration.paid400pln,
      paymentDate: parseDateSafe(registration.paymentDate),

      gdprConsent: true,
      gdprConsentDate: new Date(),
      selfRegistered: true,
      status: CandidateStatus.EN_REVISION_LEGAL,
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId: candidate.id,
      organizationId: candidate.organizationId,
      fromStatus: candidate.status,
      toStatus: CandidateStatus.EN_REVISION_LEGAL,
      changedBy: "SELF_REGISTRATION",
      reason: "Candidato completó el formulario de autoregistro",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: candidate.organizationId,
      action: "SELF_REGISTRATION_COMPLETED",
      entity: "Candidate",
      entityId: candidate.id,
      details: {
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email || null,
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: candidate.intermediaryId,
      organizationId: candidate.organizationId,
      candidateId: candidate.id,
      type: "REGISTRATION_COMPLETE",
      message: `Registro completado por candidato: ${registration.firstName} ${registration.lastName}`,
    },
  });

  const legalUsers = await prisma.membership.findMany({
    where: {
      organizationId: candidate.organizationId,
      role: { in: [Role.LEGAL, Role.ADMIN, Role.SUPERADMIN] },
      isActive: true,
    },
    select: { userId: true },
  });

  if (legalUsers.length > 0) {
    await prisma.notification.createMany({
      data: legalUsers.map((user: any) => ({
        userId: user.userId,
        organizationId: candidate.organizationId,
        candidateId: candidate.id,
        type: "LEGAL_REVIEW_PENDING",
        message: `Nuevo candidato para revisión legal: ${registration.firstName} ${registration.lastName}`,
      })),
    });
  }

  return { success: true };
}

export async function getCandidateByToken(token: string) {
  return prisma.candidate.findUnique({
    where: { registrationToken: token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      selfRegistered: true,
      intermediary: { select: { name: true } },
    },
  });
}