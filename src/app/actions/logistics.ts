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
  const pickedUpBy = formData.get("pickedUpBy") as string;
  const notes = formData.get("notes") as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).logisticsEvent.create({
    data: {
      candidateId,
      type: transportType || "ARRIVAL",
      date: arrivalDate ? new Date(arrivalDate) : new Date(),
      terminal: terminal || null,
      pickedUpBy: pickedUpBy || null,
      notes: notes || null,
    },
  });

  // Update candidate location status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).candidate.update({
    where: { id: candidateId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { locationStatus: "EN_TRANSITO" } as any,
  });

  revalidatePath("/logistica");
  revalidatePath(`/candidatos`);
  return { success: true };
}
