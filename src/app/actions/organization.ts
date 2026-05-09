"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createOrganizationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No estás autenticado");
  }

  const name = formData.get("name") as string;
  if (!name) {
    throw new Error("El nombre es requerido");
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.random().toString(36).substring(2, 5);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          plan: "FREE",
          isActive: true,
        },
      });

      // 2. Create Membership for the owner
      await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: session.user.id!,
          role: "SUPERADMIN",
          isActive: true,
        },
      });

      // 3. Update User's current organization context
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          organizationId: org.id,
          role: "SUPERADMIN",
        },
      });

      return org;
    });

    console.log("[Onboarding] Success! Created organization:", result.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[Onboarding] Error creating organization:", message);
    throw new Error(`Hubo un error al crear la organización: ${message}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
