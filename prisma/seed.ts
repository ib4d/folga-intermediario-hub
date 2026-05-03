/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("folga2024admin", 12);

  // Create default organization
  const org = await (prisma as any).organization.upsert({
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

  const admin = await (prisma as any).user.upsert({
    where: { email: "admin@folga.com" },
    update: { passwordHash, isPlatformAdmin: true, organizationId: org.id },
    create: {
      email: "admin@folga.com",
      name: "Administrador Principal",
      passwordHash,
      isPlatformAdmin: true,
      organizationId: org.id,
    },
  });

  const legal = await (prisma as any).user.upsert({
    where: { email: "legal@folga.com" },
    update: { passwordHash, organizationId: org.id },
    create: {
      email: "legal@folga.com",
      name: "Equipo Legal 1",
      passwordHash,
      organizationId: org.id,
    },
  });

  const intermediary = await (prisma as any).user.upsert({
    where: { email: "maria@folga.com" },
    update: { passwordHash, organizationId: org.id },
    create: {
      email: "maria@folga.com",
      name: "Maria G. (Intermediaria)",
      passwordHash,
      organizationId: org.id,
    },
  });

  // Create memberships
  await (prisma as any).membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: {},
    create: { userId: admin.id, organizationId: org.id, role: "SUPERADMIN", isActive: true },
  });

  await (prisma as any).membership.upsert({
    where: { userId_organizationId: { userId: legal.id, organizationId: org.id } },
    update: {},
    create: { userId: legal.id, organizationId: org.id, role: "LEGAL", isActive: true },
  });

  await (prisma as any).membership.upsert({
    where: { userId_organizationId: { userId: intermediary.id, organizationId: org.id } },
    update: {},
    create: { userId: intermediary.id, organizationId: org.id, role: "INTERMEDIARIO", isActive: true },
  });

  // Create test candidates
  const candidate1 = await (prisma as any).candidate.upsert({
    where: { email: "abad@bolanos.com" },
    update: {},
    create: {
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

  await (prisma as any).candidate.upsert({
    where: { email: "juan@perez.com" },
    update: {},
    create: {
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

  // Create a notification
  await (prisma as any).notification.create({
    data: {
      userId: intermediary.id,
      organizationId: org.id,
      candidateId: candidate1.id,
      type: "DOC_REQUIRED",
      message: "Abad Bolanos necesita subir su pasaporte para continuar.",
    },
  });

  console.log("✅ Seed ejecutado.");
  console.log("- Org:          folga-default (ENTERPRISE)");
  console.log("- Admin:        admin@folga.com / folga2024admin (isPlatformAdmin=true)");
  console.log("- Legal:        legal@folga.com / folga2024admin");
  console.log("- Intermediario: maria@folga.com / folga2024admin");
}

main().catch(console.error).finally(() => prisma.$disconnect());
