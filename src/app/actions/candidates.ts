"use server";

import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { requireTenant } from "@/lib/tenant";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { emitEvent } from "@/core/events";

export async function createCandidate(formData: FormData) {
  const tenant = await requireTenant();
  
  // Check plan limits
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
      status: "RECOPILANDO_DOCS",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "CANDIDATE_CREATED",
      entity: "Candidate",
      entityId: candidate.id,
      details: { firstName: candidate.firstName, lastName: candidate.lastName } as any,
    },
  });

  await prisma.notification.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      candidateId: candidate.id,
      type: "NEW_CANDIDATE",
      message: `Nuevo candidato creado: ${candidate.firstName} ${candidate.lastName}`,
    }
  });

  revalidatePath("/candidatos");
  
  // Platform Event (P7)
  await emitEvent("CANDIDATE_CREATED", tenant.organizationId!, {
    userId: tenant.userId,
    candidateId: candidate.id,
    candidate: candidate
  }, tenant.userId);

  redirect("/candidatos");
}

export async function updateCandidate(candidateId: string, formData: FormData) {
  const tenant = await requireTenant();

  const candidate = await prisma.candidate.findUnique({ 
    where: { 
      id: candidateId,
      organizationId: tenant.organizationId! 
    } 
  });
  
  if (!candidate) throw new Error("Candidato no encontrado en esta organización");

  if (
    tenant.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== tenant.userId
  ) {
    throw new Error("Sin permisos sobre este candidato");
  }

  const raw = Object.fromEntries(formData.entries());
  const updateData: Record<string, any> = { ...raw };

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
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "CANDIDATE_UPDATED",
      entity: "Candidate",
      entityId: candidateId,
      details: { fields: Object.keys(raw) } as any,
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

  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(tenant.role)) {
    throw new Error("Sin permisos para cambiar estado");
  }

  const candidate = await prisma.candidate.findUnique({ 
    where: { 
      id: candidateId,
      organizationId: tenant.organizationId! 
    } 
  });
  
  if (!candidate) throw new Error("Candidato no encontrado");

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: status as any,
      rejectionReason: rejectionReason ?? null,
      reviewNotes: reviewNotes ?? null,
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      organizationId: tenant.organizationId!,
      fromStatus: candidate.status,
      toStatus: status as any,
      changedBy: tenant.userId,
      reason: rejectionReason ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "STATUS_CHANGED",
      entity: "Candidate",
      entityId: candidateId,
      details: { from: candidate.status, to: status } as any,
    },
  });

  // Create notification for the Intermediary
  if (candidate.intermediaryId) {
    await prisma.notification.create({
      data: {
        userId: candidate.intermediaryId,
        organizationId: tenant.organizationId!,
        candidateId,
        type: "STATUS_UPDATE",
        message: `El estado de ${candidate.firstName} ${candidate.lastName} ha cambiado a ${status.replace(/_/g, " ")}${rejectionReason ? ` - Motivo: ${rejectionReason}` : ""}`,
      }
    });
  }

  // If approved, notify ADMIN and LOGISTICS in the same organization
  if (status === "APROBADO") {
    const adminLogistics = await prisma.membership.findMany({
      where: {
        organizationId: tenant.organizationId!,
        role: { in: ["ADMIN", "SUPERADMIN", "LOGISTICA"] },
        isActive: true
      },
      select: { userId: true }
    });

    if (adminLogistics.length > 0) {
      await prisma.notification.createMany({
        data: adminLogistics.map(m => ({
          userId: m.userId,
          organizationId: tenant.organizationId!,
          candidateId,
          type: "CANDIDATE_APPROVED",
          message: `${candidate.firstName} ${candidate.lastName} ha sido aprobado. Pendiente de logística.`,
        }))
      });
    }
  }

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
  revalidatePath("/legal");

  // Platform Event (P7)
  await emitEvent("STATUS_CHANGED", tenant.organizationId!, {
    userId: tenant.userId,
    candidateId,
    candidate: { ...candidate, status },
    newStatus: status,
    oldStatus: candidate.status
  }, tenant.userId);
}

export async function updateCandidateNotes(candidateId: string, notes: string) {
  const tenant = await requireTenant();

  const candidate = await prisma.candidate.findUnique({ 
    where: { 
      id: candidateId,
      organizationId: tenant.organizationId! 
    } 
  });
  
  if (!candidate) throw new Error("Candidato no encontrado");

  if (tenant.role === "INTERMEDIARIO" && candidate.intermediaryId !== tenant.userId) {
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
      details: { notes } as any,
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);
}

export async function importCandidatesFromExcel(formData: FormData) {
  const tenant = await requireTenant();
  
  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "No file provided" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

    // Check limits before starting (rough check)
    const currentCount = await prisma.candidate.count({ where: { organizationId: tenant.organizationId! } });
    // This is a simplified check, ideally we'd check inside the loop if count is huge
    
    let count = 0;
    for (const row of data) {
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

      const candidateData: any = {
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
        intermediaryId: tenant.userId,
        organizationId: tenant.organizationId!,
      };

      // Try to find existing in same organization
      const existing = await prisma.candidate.findFirst({
        where: {
          organizationId: tenant.organizationId!,
          OR: [
            { peselNumber: candidateData.peselNumber ? { equals: candidateData.peselNumber, not: "" } : "none" },
            { passportNumber: candidateData.passportNumber ? { equals: candidateData.passportNumber, not: "" } : "none" },
            { 
              AND: [
                { firstName: { equals: imie, mode: 'insensitive' } },
                { lastName: { equals: nazwisko, mode: 'insensitive' } }
              ]
            }
          ]
        }
      });

      if (existing) {
        await prisma.candidate.update({
          where: { id: existing.id },
          data: candidateData
        });
      } else {
        // Re-check limit for every new candidate to be safe
        try {
          await assertWithinPlanLimit(tenant.organizationId!, "candidates");
          await prisma.candidate.create({
            data: { ...candidateData, status: "RECOPILANDO_DOCS" }
          });
          count++;
        } catch (e) {
          // Limit reached, stop importing
          break;
        }
      }
    }

    return { success: true, count };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: msg };
  }
}

export async function generateRegistrationLink(candidateId: string) {
  const tenant = await requireTenant();

  const token = crypto.randomUUID();

  await prisma.candidate.update({
    where: { 
      id: candidateId,
      organizationId: tenant.organizationId!
    },
    data: { registrationToken: token },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  return { token, url: `/registro/${token}` };
}