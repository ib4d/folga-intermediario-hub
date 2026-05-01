"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { candidateSchema } from "@/lib/validations/candidate";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCandidate(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const raw = Object.fromEntries(formData.entries());
  const parsed = candidateSchema.safeParse(raw);
  
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.candidate.create({
    data: {
      ...parsed.data,
      intermediaryId: session.user.id,
      status: "RECOPILANDO_DOCS",
    },
  });

  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string,
  rejectionReason?: string
) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");
  
  // Solo LEGAL, ADMIN, SUPERADMIN pueden cambiar estado
  if (!["LEGAL", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
    throw new Error("Sin permisos");
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { 
      status: status as any, 
      rejectionReason: rejectionReason ?? null 
    },
  });

  revalidatePath(`/candidatos/${candidateId}`);
  revalidatePath("/candidatos");
}
