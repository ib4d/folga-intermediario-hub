import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertWorkflowWithSteps(input: {
  id: string;
  organizationId: string;
  name: string;
  triggerType: string;
  steps: Array<{
    type: string;
    config: Prisma.InputJsonValue;
  }>;
}) {
  const workflow = await prisma.workflow.upsert({
    where: { id: input.id },
    update: {
      organizationId: input.organizationId,
      name: input.name,
      triggerType: input.triggerType,
      isActive: true,
    },
    create: {
      id: input.id,
      organizationId: input.organizationId,
      name: input.name,
      triggerType: input.triggerType,
      isActive: true,
    },
  });

  await prisma.workflowStep.deleteMany({
    where: { workflowId: workflow.id },
  });

  await prisma.workflowStep.createMany({
    data: input.steps.map((step, index) => ({
      workflowId: workflow.id,
      type: step.type,
      config: step.config,
      order: index + 1,
    })),
  });
}

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

  await upsertWorkflowWithSteps({
    id: "workflow-doc-expiring-legal-escalation",
    organizationId: org.id,
    name: "Expiring docs -> legal escalation",
    triggerType: "DOC_EXPIRING_DETECTED",
    steps: [
      {
        type: "SEND_NOTIFICATION",
        config: {
          userId: legal.id,
          type: "DOC_EXPIRING",
          title: "Documento por expirar",
          message:
            "El documento {documentType} de {candidateFirstName} {candidateLastName} expira el {expiryDate}.",
        },
      },
      {
        type: "SEND_NOTIFICATION",
        config: {
          userId: admin.id,
          type: "DOC_EXPIRING",
          title: "Seguimiento documental requerido",
          message:
            "Se detecto un documento por expirar para {candidateFirstName} {candidateLastName} y requiere seguimiento.",
        },
      },
    ],
  });

  await upsertWorkflowWithSteps({
    id: "workflow-billing-attention-escalation",
    organizationId: org.id,
    name: "Billing attention -> superadmin",
    triggerType: "BILLING_ATTENTION_DETECTED",
    steps: [
      {
        type: "SEND_NOTIFICATION",
        config: {
          userId: admin.id,
          type: "BILLING_ATTENTION",
          title: "Billing necesita revision",
          message:
            "La organizacion {organizationName} necesita revision de billing ({subscriptionStatus}).",
        },
      },
    ],
  });

  await upsertWorkflowWithSteps({
    id: "workflow-plan-pressure-escalation",
    organizationId: org.id,
    name: "Plan pressure -> superadmin",
    triggerType: "PLAN_PRESSURE_DETECTED",
    steps: [
      {
        type: "SEND_NOTIFICATION",
        config: {
          userId: admin.id,
          type: "BILLING_USAGE_PRESSURE",
          title: "Presion de plan detectada",
          message:
            "{organizationName} esta cerca del limite en {pressureType} ({pressurePercent}%).",
        },
      },
    ],
  });

  console.log("Seed ejecutado.");
  console.log("- Org:          folga-default (ENTERPRISE)");
  console.log(`- Admin:        ${adminEmail} / ${isProduction ? "[configured password]" : seedPassword} (isPlatformAdmin=true)`);
  console.log(`- Legal:        ${legalEmail} / ${isProduction ? "[configured password]" : seedPassword}`);
  console.log(`- Intermediario: ${intermediaryEmail} / ${isProduction ? "[configured password]" : seedPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
