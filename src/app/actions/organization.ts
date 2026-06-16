"use server";

import { auth, unstable_update } from "@/auth";
import { signIn } from "@/auth";
import { CandidateStatus, LocationStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
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

async function seedDemoWorkspace(
  tx: Prisma.TransactionClient,
  organization: { id: string; slug: string },
  userId: string
) {
  const demoTag = organization.slug.slice(0, 8) || organization.id.slice(0, 8);
  const demoCandidateOne = await tx.candidate.create({
    data: {
      firstName: "Abad",
      lastName: "Bolanos",
      email: `demo-${demoTag}-abad@example.com`,
      phone: "+48123456789",
      country: "Cuba",
      status: CandidateStatus.RECOPILANDO_DOCS,
      intermediaryId: userId,
      organizationId: organization.id,
      locationStatus: LocationStatus.EN_ORIGEN,
      notes: "Candidato de ejemplo del sandbox comercial.",
    },
  });

  const demoCandidateTwo = await tx.candidate.create({
    data: {
      firstName: "Juan",
      lastName: "Perez",
      email: `demo-${demoTag}-juan@example.com`,
      phone: "+48987654321",
      country: "Colombia",
      status: CandidateStatus.EN_REVISION_LEGAL,
      intermediaryId: userId,
      organizationId: organization.id,
      locationStatus: LocationStatus.EN_TRANSITO,
      paid400pln: true,
      paymentDate: new Date(),
      notes: "Caso de ejemplo para el flujo legal y la llegada operativa.",
    },
  });

  const demoCandidateThree = await tx.candidate.create({
    data: {
      firstName: "Marta",
      lastName: "Kowalska",
      email: `demo-${demoTag}-marta@example.com`,
      phone: "+48555111222",
      country: "Poland",
      status: CandidateStatus.APROBADO,
      intermediaryId: userId,
      organizationId: organization.id,
      locationStatus: LocationStatus.EN_POLONIA,
      paid400pln: true,
      paymentDate: new Date(),
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      accommodation: "Hotel demo central",
      accommodationNotes: "Reserva de ejemplo para la presentación comercial.",
      notes: "Caso de ejemplo para demostrar el flujo de logistica y llegada.",
    },
  });

  await tx.statusHistory.create({
    data: {
      candidateId: demoCandidateTwo.id,
      organizationId: organization.id,
      fromStatus: CandidateStatus.RECOPILANDO_DOCS,
      toStatus: CandidateStatus.EN_REVISION_LEGAL,
      changedById: userId,
      reason: "Sandbox de demostracion preparado para revision legal.",
    },
  });

  await tx.statusHistory.create({
    data: {
      candidateId: demoCandidateThree.id,
      organizationId: organization.id,
      fromStatus: CandidateStatus.EN_REVISION_LEGAL,
      toStatus: CandidateStatus.APROBADO,
      changedById: userId,
      reason: "Sandbox de demostracion preparado para la parte operativa.",
    },
  });

  await tx.logisticsEvent.create({
    data: {
      type: "ARRIVAL",
      description: "Llegada demo programada para mostrar el flujo logistico.",
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      organizationId: organization.id,
      candidateId: demoCandidateThree.id,
      transportType: "BUS",
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      terminal: "Demo Terminal",
      flightOrTrain: "D-2026-001",
      pickedUpBy: "Equipo demo",
      confirmed: true,
    },
  });

  await tx.notification.createMany({
    data: [
      {
        userId,
        organizationId: organization.id,
        candidateId: demoCandidateOne.id,
        type: "DOC_REQUIRED",
        title: "Sandbox: documentos pendientes",
        message: "Abad Bolanos necesita subir su pasaporte para continuar la demo.",
      },
      {
        userId,
        organizationId: organization.id,
        candidateId: demoCandidateTwo.id,
        type: "LEGAL_REVIEW_PENDING",
        title: "Sandbox: revision legal pendiente",
        message: "Juan Perez ya puede seguir el recorrido de revision legal en la demo.",
      },
      {
        userId,
        organizationId: organization.id,
        candidateId: demoCandidateThree.id,
        type: "ARRIVAL_TODAY",
        title: "Sandbox: llegada operativa",
        message: "Marta Kowalska tiene una llegada de ejemplo preparada para la parte logistica.",
      },
    ],
  });
}

export async function createOrganizationAction(
  _prevState: { error: string },
  formData: FormData
) {
  const session = await auth();

  const name = String(formData.get("name") ?? "").trim();
  const workspaceMode = String(formData.get("mode") ?? "standard").trim();
  if (!name) {
    return { error: "El nombre de la organizacion es obligatorio." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!session && !fullName) {
    return { error: "Tu nombre es obligatorio para crear el acceso inicial." };
  }

  if (!session && !email) {
    return { error: "El correo electronico es obligatorio para crear el acceso inicial." };
  }

  if (!session && password.length < 8) {
    return { error: "La contrasena inicial debe tener al menos 8 caracteres." };
  }

  const slug = slugifyOrganizationName(name);

  try {
    const currentUser = session
      ? await prisma.user.findFirst({
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
        })
      : null;

    if (session && !currentUser) {
      return {
        error: "La sesion actual no corresponde a un usuario valido. Cierra sesion y vuelve a entrar.",
      };
    }

    if (currentUser) {
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

        if (workspaceMode === "demo") {
          await seedDemoWorkspace(tx, org, currentUser.id);
        }

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
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return {
          error: "Ya existe una cuenta con este correo. Inicia sesion para continuar con la activacion.",
        };
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name,
            slug,
            plan: "FREE",
            isActive: true,
          },
        });

        const createdUser = await tx.user.create({
          data: {
            email,
            name: fullName,
            passwordHash,
            organizationId: org.id,
            role: "SUPERADMIN",
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        await tx.membership.create({
          data: {
            organizationId: org.id,
            userId: createdUser.id,
            role: "SUPERADMIN",
            isActive: true,
          },
        });

        if (workspaceMode === "demo") {
          await seedDemoWorkspace(tx, org, createdUser.id);
        }
      });

      revalidatePath("/", "layout");
      revalidatePath("/dashboard");
      revalidatePath("/candidatos");
      revalidatePath("/legal");
      revalidatePath("/logistica");
      revalidatePath("/notificaciones");

      await signIn("credentials", {
        email,
        password,
        redirectTo: "/dashboard",
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        error: "Ya existe una cuenta o espacio con esos datos. Usa otro nombre o inicia sesion con el correo ya creado.",
      };
    }

    const message = error instanceof Error ? error.message : "Error desconocido";
    return {
      error: `No se pudo crear la organizacion. ${message}`,
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/candidatos");
  revalidatePath("/legal");
  revalidatePath("/logistica");
  revalidatePath("/notificaciones");
  redirect("/dashboard");
}
