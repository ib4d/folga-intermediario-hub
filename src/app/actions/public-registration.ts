"use server";

import { CandidateStatus, LocationStatus, RecruitmentSource, Role } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { candidateRegistrationSchema } from "@/lib/validations/candidate-registration";

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
    return { error: { _global: ["Datos invalidos"] } };
  }

  const preparedData = { ...(data as Record<string, unknown>) };

  preparedData.paid400pln = normalizeBoolean(preparedData.paid400pln);
  preparedData.gdprConsent = normalizeBoolean(preparedData.gdprConsent);
  preparedData.passportBiometric = normalizeBoolean(preparedData.passportBiometric);

  const parsed = candidateRegistrationSchema.safeParse(preparedData);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { registrationToken: token },
    });

    if (!candidate) {
      return { error: { _global: ["Token invalido o expirado"] } };
    }

    if (candidate.selfRegistered) {
      return { error: { _global: ["Este formulario ya fue completado"] } };
    }

    const registration = parsed.data;
    const paymentDate = parseDateSafe(registration.paymentDate);

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
        paymentDate: registration.paid400pln ? (paymentDate ?? new Date()) : paymentDate,
        gdprConsent: true,
        gdprConsentDate: new Date(),
        selfRegistered: true,
        status: CandidateStatus.EN_REVISION_LEGAL,
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

    const sideEffects = [
      prisma.statusHistory.create({
        data: {
          candidateId: candidate.id,
          organizationId: candidate.organizationId,
          fromStatus: candidate.status,
          toStatus: CandidateStatus.EN_REVISION_LEGAL,
          changedById: "SELF_REGISTRATION",
          reason: "Candidato completo el formulario de autoregistro",
        },
      }),
      writeAuditLog({
        organizationId: candidate.organizationId,
        action: "SELF_REGISTRATION_COMPLETED",
        entityType: "Candidate",
        entityId: candidate.id,
        details: {
          firstName: registration.firstName,
          lastName: registration.lastName,
          email: registration.email || null,
        },
      }),
      prisma.notification.create({
        data: {
          userId: candidate.intermediaryId,
          organizationId: candidate.organizationId,
          candidateId: candidate.id,
          type: "REGISTRATION_COMPLETE",
          title: "Registro Completado",
          message: `Registro completado por candidato: ${registration.firstName} ${registration.lastName}`,
        },
      }),
      legalUsers.length > 0
        ? prisma.notification.createMany({
            data: legalUsers.map((user: { userId: string }) => ({
              userId: user.userId,
              organizationId: candidate.organizationId,
              candidateId: candidate.id,
              type: "LEGAL_REVIEW_PENDING",
              title: "Revision Legal Pendiente",
              message: `Nuevo candidato para revision legal: ${registration.firstName} ${registration.lastName}`,
            })),
          })
        : Promise.resolve(),
    ];

    const results = await Promise.allSettled(sideEffects);
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("[public-registration] Secondary write failed", result.reason);
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[public-registration] Submit failed", error);
    return {
      error: {
        _global: ["No se pudo completar el registro. Revisa los datos e intentalo de nuevo."],
      },
    };
  }
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
