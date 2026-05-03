/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "@/lib/prisma";
import { candidateRegistrationSchema } from "@/lib/validations/candidate-registration";

function parseDateSafe(val: string | undefined | null): Date | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export async function submitCandidateRegistration(token: string, data: Record<string, unknown>) {
  const preparedData = { ...data };
  
  // Normalize types for Zod
  if (preparedData.paid400pln === "true") preparedData.paid400pln = true;
  if (preparedData.paid400pln === "false") preparedData.paid400pln = false;
  if (preparedData.gdprConsent === "true") preparedData.gdprConsent = true;
  if (preparedData.passportBiometric === "true") preparedData.passportBiometric = true;
  if (preparedData.passportBiometric === "false") preparedData.passportBiometric = false;

  const parsed = candidateRegistrationSchema.safeParse(preparedData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.findFirst({
    where: { registrationToken: token },
  });

  if (!candidate) {
    return { error: { _global: ["Token inválido o expirado"] } };
  }

  if (candidate.selfRegistered) {
    return { error: { _global: ["Este formulario ya fue completado"] } };
  }

  const d = parsed.data;

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      gender: d.gender,
      dateOfBirth: parseDateSafe(d.dateOfBirth),
      birthPlace: d.birthPlace,
      birthCountry: d.birthCountry,
      citizenship: d.citizenship,
      nationality: d.nationality,
      country: d.country,
      locationStatus: d.locationStatus as any,
      polishAddress: d.polishAddress,
      polishCity: d.polishCity,
      
      passportNumber: d.passportNumber,
      passportIssueDate: parseDateSafe(d.passportIssueDate),
      passportExpiry: parseDateSafe(d.passportExpiry),
      passportBiometric: d.passportBiometric,
      
      kartaPobytuNumber: d.kartaPobytuNumber,
      kartaPobytuIssueDate: parseDateSafe(d.kartaPobytuIssueDate),
      kartaPobytuExpiry: parseDateSafe(d.kartaPobytuExpiry),
      kartaPobytuType: d.kartaPobytuType,
      
      peselNumber: d.peselNumber,
      
      voivodatoNumber: d.voivodatoNumber,
      voivodatoIssueDate: parseDateSafe(d.voivodatoIssueDate),
      voivodatoExpiry: parseDateSafe(d.voivodatoExpiry),
      voivodatoStatus: d.voivodatoStatus,
      
      recruitmentSource: d.recruitmentSource as any,
      arrivalDate: parseDateSafe(d.arrivalDate),
      arrivalNotes: d.arrivalNotes,
      accommodation: d.accommodation,
      accommodationNotes: d.accommodationNotes,
      
      paid400pln: d.paid400pln,
      paymentDate: parseDateSafe(d.paymentDate),
      
      gdprConsent: true,
      gdprConsentDate: new Date(),
      selfRegistered: true,
      status: "EN_REVISION_LEGAL" as any,
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId: candidate.id,
      organizationId: candidate.organizationId,
      fromStatus: candidate.status,
      toStatus: "EN_REVISION_LEGAL" as any,
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
      details: { firstName: candidate.firstName, lastName: candidate.lastName } as any,
    },
  });

  // Notify Intermediary
  if (candidate.intermediaryId) {
    await prisma.notification.create({
      data: {
        userId: candidate.intermediaryId,
        organizationId: candidate.organizationId,
        candidateId: candidate.id,
        type: "REGISTRATION_COMPLETE",
        message: `Registro completado por candidato: ${d.firstName} ${d.lastName}`,
      }
    });
  }

  // Notify Legal Users
  const legalUsers = await prisma.membership.findMany({
    where: { 
      organizationId: candidate.organizationId,
      role: { in: ["LEGAL", "ADMIN", "SUPERADMIN"] },
      isActive: true 
    },
    select: { userId: true }
  });

  for (const user of legalUsers) {
    await prisma.notification.create({
      data: {
        userId: user.userId,
        organizationId: candidate.organizationId,
        candidateId: candidate.id,
        type: "LEGAL_REVIEW_PENDING",
        message: `Nuevo candidato para revisión legal: ${d.firstName} ${d.lastName}`,
      }
    });
  }

  return { success: true };
}

export async function getCandidateByToken(token: string) {
  return prisma.candidate.findFirst({
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