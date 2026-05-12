import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("folga2024admin", 12);

  const org = await prisma.organization.upsert({
    where: { slug: "folga-default" },
    update: {},
    create: {
      id: "org_default_migration",
      name: "Folga Sp. z o.o.",
      slug: "folga-default",
      plan: "ENTERPRISE",
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@folga.com" },
    update: {
      passwordHash,
      isPlatformAdmin: true,
      organizationId: org.id,
      role: "SUPERADMIN",
    },
    create: {
      email: "admin@folga.com",
      name: "Administrador Principal",
      passwordHash,
      isPlatformAdmin: true,
      organizationId: org.id,
      role: "SUPERADMIN",
    },
  });

  const legal = await prisma.user.upsert({
    where: { email: "legal@folga.com" },
    update: { passwordHash, organizationId: org.id, role: "LEGAL" },
    create: {
      email: "legal@folga.com",
      name: "Equipo Legal 1",
      passwordHash,
      organizationId: org.id,
      role: "LEGAL",
    },
  });

  const intermediary = await prisma.user.upsert({
    where: { email: "maria@folga.com" },
    update: { passwordHash, organizationId: org.id, role: "INTERMEDIARIO" },
    create: {
      email: "maria@folga.com",
      name: "Maria G. (Intermediaria)",
      passwordHash,
      organizationId: org.id,
      role: "INTERMEDIARIO",
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: {},
    create: { userId: admin.id, organizationId: org.id, role: "SUPERADMIN", isActive: true },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: legal.id, organizationId: org.id } },
    update: {},
    create: { userId: legal.id, organizationId: org.id, role: "LEGAL", isActive: true },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: intermediary.id, organizationId: org.id } },
    update: {},
    create: { userId: intermediary.id, organizationId: org.id, role: "INTERMEDIARIO", isActive: true },
  });

  const candidate1 = await prisma.candidate.create({
    data: {
      firstName: "Abad",
      lastName: "Bolanos",
      email: "abad@bolanos.com",
      phone: "+48123456789",
      country: "Cuba",
      status: "RECOPILANDO_DOCS",
      intermediaryId: intermediary.id,
      organizationId: org.id,
      locationStatus: "EN_ORIGEN",
      paid400pln: false,
    },
  });

  await prisma.candidate.create({
    data: {
      firstName: "Juan",
      lastName: "Perez",
      email: "juan@perez.com",
      phone: "+48987654321",
      country: "Colombia",
      status: "APROBADO",
      intermediaryId: intermediary.id,
      organizationId: org.id,
      locationStatus: "EN_TRANSITO",
      paid400pln: true,
      paymentDate: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: intermediary.id,
      organizationId: org.id,
      candidateId: candidate1.id,
      type: "DOC_REQUIRED",
      title: "Documentacion requerida",
      message: "Abad Bolanos necesita subir su pasaporte para continuar.",
    },
  });

  console.log("Seed ejecutado.");
  console.log("- Org:          folga-default (ENTERPRISE)");
  console.log("- Admin:        admin@folga.com / folga2024admin (isPlatformAdmin=true)");
  console.log("- Legal:        legal@folga.com / folga2024admin");
  console.log("- Intermediario: maria@folga.com / folga2024admin");
}

main().catch(console.error).finally(() => prisma.$disconnect());
