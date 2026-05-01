"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createLogisticsEvent(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autorizado");

  const candidateId = formData.get("candidateId") as string;
  const transportType = formData.get("transportType") as string;
  const arrivalDate = formData.get("arrivalDate") as string;
  const terminal = formData.get("terminal") as string;
  const flightOrTrain = formData.get("flightOrTrain") as string;
  const pickedUpBy = formData.get("pickedUpBy") as string;
  const notes = formData.get("notes") as string;

  await prisma.logisticsEvent.create({
    data: {
      candidateId,
      transportType: transportType as any,
      arrivalDate: new Date(arrivalDate),
      terminal,
      flightOrTrain,
      pickedUpBy,
      notes,
    },
  });

  // Si no está en tránsito, actualizar estado del candidato
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { locationStatus: "EN_TRANSITO" },
  });

  revalidatePath("/logistica");
  return { success: true };
}
