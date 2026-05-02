/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";

export async function createCandidate(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const raw = Object.fromEntries(formData.entries());
  const parsed = candidateSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const candidate = await prisma.candidate.create({
    data: {
      ...parsed.data,
      intermediaryId: session.user.id,
      status: "RECOPILANDO_DOCS",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CANDIDATE_CREATED",
      entity: "Candidate",
      entityId: candidate.id,
      details: { firstName: candidate.firstName, lastName: candidate.lastName } as never,
    },
  });

  await prisma.notification.create({
    data: {
      candidateId: candidate.id,
      type: "NEW_CANDIDATE",
      message: `Nuevo candidato creado: ${candidate.firstName} ${candidate.lastName}`,
    }
  });

  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function updateCandidate(candidateId: string, formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("Candidato no encontrado");

  if (
    session.user.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== session.user.id
  ) {
    throw new Error("Sin permisos sobre este candidato");
  }

  const raw = Object.fromEntries(formData.entries());
  const updateData: Record<string, unknown> = { ...raw };

  const dateFields = [
    "dateOfBirth", "passportIssueDate", "passportExpiry",
    "kartaPobytuIssueDate", "kartaPobytuExpiry",
    "voivodatoIssueDate", "voivodatoExpiry",
    "arrivalDate", "paymentDate", "gdprConsentDate",
  ];

  for (const field of dateFields) {
    if (updateData[field] && typeof updateData[field] === "string") {
      const d = new Date(updateData[field] as string);
      updateData[field] = isNaN(d.getTime()) ? null : d;
    }
  }

  if (updateData.heightCm) {
    updateData.heightCm = parseInt(updateData.heightCm as string, 10);
  }

  if (updateData.paid400pln !== undefined) {
    updateData.paid400pln = updateData.paid400pln === "true" || updateData.paid400pln === true;
  }

  if (updateData.gdprConsent !== undefined) {
    updateData.gdprConsent = updateData.gdprConsent === "true" || updateData.gdprConsent === true;
  }

  if (updateData.passportBiometric !== undefined) {
    updateData.passportBiometric = updateData.passportBiometric === "true" || updateData.passportBiometric === true;
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CANDIDATE_UPDATED",
      entity: "Candidate",
      entityId: candidateId,
      details: { fields: Object.keys(raw) } as never,
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
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    throw new Error("Sin permisos para cambiar estado");
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("Candidato no encontrado");

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: status as never,
      rejectionReason: rejectionReason ?? null,
      reviewNotes: reviewNotes ?? null,
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: candidate.status,
      toStatus: status as never,
      changedBy: session.user.id,
      reason: rejectionReason ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "STATUS_CHANGED",
      entity: "Candidate",
      entityId: candidateId,
      details: { from: candidate.status, to: status } as never,
    },
  });

  await prisma.notification.create({
    data: {
      candidateId,
      type: "STATUS_UPDATE",
      message: `Estado actualizado a ${status.replace(/_/g, " ")}${rejectionReason ? ` - Motivo: ${rejectionReason}` : ""}`,
    }
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
  revalidatePath("/legal");
}

export async function updateCandidateNotes(candidateId: string, notes: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("Candidato no encontrado");

  if (session.user.role === "INTERMEDIARIO" && candidate.intermediaryId !== session.user.id) {
    throw new Error("Sin permisos");
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { notes },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CANDIDATE_NOTES_UPDATED",
      entity: "Candidate",
      entityId: candidateId,
      details: { notes } as never,
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);
}

export async function importCandidatesFromExcel(formData: FormData) {
  const session = await auth();
  if (!session) return { success: false, error: "No autorizado" };
  
  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "No file provided" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    let count = 0;
    for (const row of data) {
      // Find imie/nazwisko with case-insensitive check
      const keys = Object.keys(row);
      const imieKey = keys.find(k => k.toLowerCase() === 'imie' || k.toLowerCase() === 'firstname' || k.toLowerCase() === 'nombre');
      const nazwiskoKey = keys.find(k => k.toLowerCase() === 'nazwisko' || k.toLowerCase() === 'lastname' || k.toLowerCase() === 'apellido');
      
      const imie = imieKey ? String(row[imieKey]) : null;
      const nazwisko = nazwiskoKey ? String(row[nazwiskoKey]) : null;
      
      if (!imie || !nazwisko) continue;
      
      const findVal = (keyNames: string[]) => {
        const k = keys.find(k => keyNames.some(kn => k.toLowerCase() === kn.toLowerCase()));
        return k ? row[k] : undefined;
      };

      const candidateData = {
        firstName: imie,
        lastName: nazwisko,
        gender: String(findVal(['plec', 'gender', 'sexo', 'pe']) || ""),
        country: String(findVal(['obywatelstwo', 'country', 'pais']) || "COL"),
        citizenship: String(findVal(['obywatelstwo', 'citizenship']) || ""),
        birthCountry: String(findVal(['panstwo_urodzenia', 'birthcountry']) || ""),
        nationality: String(findVal(['narodowosc', 'nationality']) || ""),
        phone: String(findVal(['telefon', 'phone', 'tel']) || ""),
        email: String(findVal(['email', 'correo']) || ""),
        peselNumber: String(findVal(['pesel']) || ""),
        passportNumber: String(findVal(['paszport_seria_numer', 'passportnumber', 'paszport']) || ""),
        passportBiometric: findVal(['paszport_biometryczny']) === "Tak",
        kartaPobytuNumber: String(findVal(['karta_pobytu_seria_numer', 'kartapobytu']) || ""),
        kartaPobytuType: String(findVal(['karta_pobytu_typ']) || ""),
        voivodatoNumber: String(findVal(['decyzja_seria_numer', 'voivodato']) || ""),
        voivodatoStatus: String(findVal(['decyzja_status']) || ""),
        recruiterId: String(findVal(['opiekun_rekrutacji', 'recruiter']) || ""),
        accommodation: String(findVal(['zakwaterowanie', 'accommodation']) || ""),
        accommodationNotes: String(findVal(['szczegoly_zakwaterowania']) || ""),
        arrivalNotes: String(findVal(['uwagi_do_przyjazdu']) || ""),
        rejectionReason: String(findVal(['powod_rezygnacji', 'rejectionreason']) || ""),
        paid400pln: findVal(['zaplacil_400pln']) === "Tak",
        gdprConsent: findVal(['gdpr_rodo']) === "Tak",
        polishAddress: String(findVal(['adres_polska', 'address']) || ""),
        polishCity: String(findVal(['miasto_polska', 'city']) || ""),
        notes: String(findVal(['uwagi', 'notes']) || ""),
        intermediaryId: session.user.id,
      };

      // Try to find existing
      const existing = await prisma.candidate.findFirst({
        where: {
          OR: [
            { peselNumber: candidateData.peselNumber ? { equals: candidateData.peselNumber, not: "" } : "none" },
            { passportNumber: candidateData.passportNumber ? { equals: candidateData.passportNumber, not: "" } : "none" },
            { 
              AND: [
                { firstName: { equals: imie, mode: 'insensitive' } },
                { lastName: { equals: nazwisko, mode: 'insensitive' } }
              ]
            }
          ],
          intermediaryId: session.user.role === "INTERMEDIARIO" ? session.user.id : undefined
        }
      });

      if (existing) {
        await prisma.candidate.update({
          where: { id: existing.id },
          data: candidateData
        });
      } else {
        await prisma.candidate.create({
          data: { ...candidateData, status: "RECOPILANDO_DOCS" }
        });
      }
      count++;
    }

    return { success: true, count };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateRegistrationLink(candidateId: string) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const token = crypto.randomUUID();

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { registrationToken: token },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  return { token, url: `/registro/${token}` };
}