/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "@/lib/prisma";
import { fullRegistrationSchema } from "@/lib/validations/candidate-registration";

function parseDateSafe(val: string | undefined | null): Date | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export async function submitCandidateRegistration(token: string, data: any) {
  const preparedData = { ...data };
  if (preparedData.gender === "Hombre") preparedData.gender = "M";
  if (preparedData.gender === "Mujer") preparedData.gender = "F";
  if (preparedData.gdprConsent === "true") preparedData.gdprConsent = true;

  const parsed = fullRegistrationSchema.safeParse(preparedData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await (prisma as any).candidate.findUnique({
    where: { registrationToken: token } as any,
  });

  if (!candidate) {
    return { error: { _global: ["Token inválido o expirado"] } };
  }

  if (candidate.selfRegistered) {
    return { error: { _global: ["Este formulario ya fue completado"] } };
  }

  const {
    firstName, lastName, email, phone, gender, dateOfBirth, birthPlace,
    citizenship, country, passportNumber, passportExpiry, peselNumber,
    recruitmentSource, accommodation, arrivalNotes,
  } = parsed.data;

  await (prisma as any).candidate.update({
    where: { id: candidate.id },
    data: {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth: parseDateSafe(dateOfBirth),
      birthPlace,
      citizenship,
      country,
      passportNumber: passportNumber || candidate.passportNumber,
      passportExpiry: parseDateSafe(passportExpiry) || candidate.passportExpiry,
      peselNumber: peselNumber || candidate.peselNumber,
      recruitmentSource: recruitmentSource as never,
      accommodation,
      arrivalNotes,
      gdprConsent: true,
      gdprConsentDate: new Date(),
      selfRegistered: true,
      status: "EN_REVISION" as any,
    },
  });

  await (prisma as any).statusHistory.create({
    data: {
      candidateId: candidate.id,
      fromStatus: candidate.status,
      toStatus: "EN_REVISION" as any,
      changedBy: "SELF_REGISTRATION",
      reason: "Candidato completó el formulario de autoregistro",
    },
  });

  await (prisma as any).auditLog.create({
    data: {
      action: "SELF_REGISTRATION_COMPLETED",
      entity: "Candidate",
      entityId: candidate.id,
      details: { email, firstName, lastName } as never,
    },
  });

  await (prisma as any).notification.create({
    data: {
      candidateId: candidate.id,
      type: "REGISTRATION_COMPLETE",
      message: `Registro completado por candidato: ${firstName} ${lastName}`,
    }
  });

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