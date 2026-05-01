"use server";

import { prisma } from "@/lib/prisma";
import { fullRegistrationSchema } from "@/lib/validations/candidate-registration";

export async function submitCandidateRegistration(token: string, data: unknown) {
  const parsed = fullRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { registrationToken: token },
  });

  if (!candidate) return { error: { _global: ["Token inválido o expirado"] } };
  if (candidate.selfRegistered) return { error: { _global: ["Este formulario ya fue completado"] } };

  const d = parsed.data;
  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      email: d.email,
      firstName: d.firstName,
      gender: d.gender,
      dateOfBirth: new Date(d.dateOfBirth),
      birthPlace: d.birthPlace,
      birthCountry: d.birthCountry,
      citizenship: d.citizenship,
      nationality: d.nationality,
      heightCm: d.heightCm,
      phone: d.phone,
      country: d.country,
      locationStatus: d.locationStatus as never,
      polishAddress: d.polishAddress || null,
      polishCity: d.polishCity || null,
      passportNumber: d.passportNumber,
      passportExpiry: d.passportExpiry ? new Date(d.passportExpiry) : null,
      peselNumber: d.peselNumber || null,
      voivodatoNumber: d.voivodatoNumber || null,
      selfRegistered: true,
      registrationToken: null, // invalidar token tras uso
    },
  });

  // Notificar al intermediario
  await prisma.notification.create({
    data: {
      userId: candidate.intermediaryId,
      candidateId: candidate.id,
      type: "NEW_CANDIDATE",
      message: `✅ ${d.firstName} ${d.lastName} completó su formulario de registro.`,
    },
  });

  return { success: true };
}

export async function generateRegistrationToken(candidateId: string) {
  // Solo accesible para usuarios autenticados
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const { randomUUID } = await import("crypto");
  const token = randomUUID();

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { registrationToken: token },
  });

  return token;
}
