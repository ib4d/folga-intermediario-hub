"use server";

import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugifyOrganizationName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "organizacion"}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function createOrganizationAction(
  _prevState: { error: string },
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return { error: "Tu sesion expiro. Inicia sesion otra vez." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "El nombre de la organizacion es obligatorio." };
  }

  const slug = slugifyOrganizationName(name);

  try {
    const currentUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session?.user?.id ? [{ id: session.user.id }] : []),
          ...(session?.user?.email ? [{ email: session.user.email }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        isPlatformAdmin: true,
      },
    });

    if (!currentUser) {
      return {
        error: "La sesion actual no corresponde a un usuario valido. Cierra sesion y vuelve a entrar.",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          plan: "FREE",
          isActive: true,
        },
      });

      await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId: currentUser.id,
            organizationId: org.id,
          },
        },
        update: {
          role: "SUPERADMIN",
          isActive: true,
        },
        create: {
          organizationId: org.id,
          userId: currentUser.id,
          role: "SUPERADMIN",
          isActive: true,
        },
      });

      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          organizationId: org.id,
          role: "SUPERADMIN",
        },
      });

      return org;
    });

    await unstable_update({
      user: {
        id: currentUser.id,
        organizationId: result.id,
        role: "SUPERADMIN",
        isPlatformAdmin: Boolean(currentUser.isPlatformAdmin),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return {
      error: `No se pudo crear la organizacion. ${message}`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
