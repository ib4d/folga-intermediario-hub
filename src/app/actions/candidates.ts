"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCandidate(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const country = formData.get("country") as string;
  const phone = formData.get("phone") as string;
  const notes = formData.get("notes") as string;

  // We need an intermediary user. For now, create one if it doesn't exist or use a default one.
  let defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    defaultUser = await prisma.user.create({
      data: {
        email: "demo@folga.com",
        name: "Coordinador Demo",
        role: "ADMIN"
      }
    });
  }

  await prisma.candidate.create({
    data: {
      firstName,
      lastName,
      country,
      phone,
      notes,
      intermediaryId: defaultUser.id,
      status: "RECOPILANDO_DOCS"
    }
  });

  revalidatePath("/candidatos");
  redirect("/candidatos");
}
