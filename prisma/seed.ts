import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === "true";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@folga.com";
  const legalEmail = process.env.SEED_LEGAL_EMAIL || "legal@folga.com";
  const intermediaryEmail = process.env.SEED_INTERMEDIARY_EMAIL || "maria@folga.com";
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || "folga2024admin";

  if (isProduction && !allowDemoSeed) {
    throw new Error("Production seed blocked. Set ALLOW_DEMO_SEED=true and SEED_ADMIN_PASSWORD to seed intentionally.");
  }

  if (isProduction && seedPassword === "folga2024admin") {
    throw new Error("Refusing to seed production with the default demo password.");
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);

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
    where: { email: adminEmail },
    update: {
      passwordHash,
      isPlatformAdmin: true,
      organizationId: org.id,
      role: "SUPERADMIN",
    },
    create: {
      email: adminEmail,
      name: "Administrador Principal",
      passwordHash,
      isPlatformAdmin: true,
      organizationId: org.id,
      role: "SUPERADMIN",
    },
  });

  const legal = await prisma.user.upsert({
    where: { email: legalEmail },
    update: { passwordHash, organizationId: org.id, role: "LEGAL" },
    create: {
      email: legalEmail,
      name: "Equipo Legal 1",
      passwordHash,
      organizationId: org.id,
      role: "LEGAL",
    },
  });

  const intermediary = await prisma.user.upsert({
    where: { email: intermediaryEmail },
    update: { passwordHash, organizationId: org.id, role: "INTERMEDIARIO" },
    create: {
      email: intermediaryEmail,
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
  console.log(`- Admin:        ${adminEmail} / ${isProduction ? "[configured password]" : seedPassword} (isPlatformAdmin=true)`);
  console.log(`- Legal:        ${legalEmail} / ${isProduction ? "[configured password]" : seedPassword}`);
  console.log(`- Intermediario: ${intermediaryEmail} / ${isProduction ? "[configured password]" : seedPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
