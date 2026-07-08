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

  const guatemalaCandidateLead = await prisma.brokerLead.upsert({
    where: {
      organizationId_sourceCountrySheet_sourceRowHash: {
        organizationId: org.id,
        sourceCountrySheet: "GWATEMALA",
        sourceRowHash: "seed-guatemala-candidate",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      sourceCountrySheet: "GWATEMALA",
      sourceFileName: "POŚREDNICY LATAM.xlsx",
      sourceRowHash: "seed-guatemala-candidate",
      leadDate: new Date("2026-06-29T00:00:00.000Z"),
      firstName: "Alex",
      lastName: "Vela",
      email: "alexxandervgrijalva03@outlook.com",
      phone: "+50259920613",
      city: "Guatemala City",
      rawStatus: "Candidate",
      normalizedStatus: "CANDIDATE",
      flowStatus: "Sent",
      flowSentDate: new Date("2026-06-30T07:58:15.363Z"),
      emailStatus: "Responded",
      leadType: "CANDIDATE",
      lastReplyDate: new Date("2026-07-01T06:10:41.022Z"),
      assignedOwnerId: admin.id,
    },
  });

  const guatemalaProviderLead = await prisma.brokerLead.upsert({
    where: {
      organizationId_sourceCountrySheet_sourceRowHash: {
        organizationId: org.id,
        sourceCountrySheet: "GWATEMALA",
        sourceRowHash: "seed-guatemala-provider",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      sourceCountrySheet: "GWATEMALA",
      sourceFileName: "POŚREDNICY LATAM.xlsx",
      sourceRowHash: "seed-guatemala-provider",
      leadDate: new Date("2026-06-29T00:00:00.000Z"),
      firstName: "Mario",
      lastName: "Lopez",
      email: "broker.mario@example.com",
      phone: "+50251112233",
      city: "Guatemala",
      declaredSupplyText: "15 personas por mes",
      rawStatus: "Provider",
      normalizedStatus: "PROVIDER",
      flowStatus: "Sent",
      flowSentDate: new Date("2026-06-30T08:00:00.000Z"),
      emailStatus: "Responded",
      leadType: "PROVIDER",
      lastReplyDate: new Date("2026-07-01T08:00:00.000Z"),
      assignedOwnerId: admin.id,
    },
  });

  const repliedLead = await prisma.brokerLead.upsert({
    where: {
      organizationId_sourceCountrySheet_sourceRowHash: {
        organizationId: org.id,
        sourceCountrySheet: "GWATEMALA",
        sourceRowHash: "seed-guatemala-replied",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      sourceCountrySheet: "GWATEMALA",
      sourceFileName: "POŚREDNICY LATAM.xlsx",
      sourceRowHash: "seed-guatemala-replied",
      leadDate: new Date("2026-06-29T00:00:00.000Z"),
      firstName: "Absalon",
      lastName: "Sic",
      email: "peresfrank965@gmail.com",
      phone: "+50236739883",
      city: "Guatemala City",
      rawStatus: "Replied",
      normalizedStatus: "REPLIED",
      flowStatus: "Sent",
      flowSentDate: new Date("2026-06-30T08:00:08.241Z"),
      emailStatus: "Responded",
      lastReplyDate: new Date("2026-07-01T06:11:59.656Z"),
      assignedOwnerId: admin.id,
    },
  });

  await prisma.brokerContactAttempt.createMany({
    data: [
      {
        organizationId: org.id,
        brokerLeadId: guatemalaCandidateLead.id,
        attemptNo: 1,
        channel: "EMAIL",
        contactDate: new Date("2026-06-30T07:58:15.363Z"),
        result: "Replied by email",
        summary: "Candidate replied by email",
      },
      {
        organizationId: org.id,
        brokerLeadId: guatemalaProviderLead.id,
        attemptNo: 1,
        channel: "EMAIL",
        contactDate: new Date("2026-06-30T08:00:00.000Z"),
        result: "Provider replied by email",
        summary: "Potential provider with declared supply",
      },
      {
        organizationId: org.id,
        brokerLeadId: repliedLead.id,
        attemptNo: 1,
        channel: "EMAIL",
        contactDate: new Date("2026-06-30T08:00:08.241Z"),
        result: "Replied by email",
        summary: "Lead replied to first contact",
      },
    ],
    skipDuplicates: true,
  });

  const simonBroker = await prisma.broker.upsert({
    where: {
      organizationId_displayName: {
        organizationId: org.id,
        displayName: "Simon Szczypanik",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      displayName: "Simon Szczypanik",
      legalOrBillingName: "SIMON SZCZYPANIK",
      country: "PL",
      city: "Kutno",
      primaryEmail: "simon@example.com",
      primaryPhone: "+48500111222",
      brokerType: "PROVIDER",
      status: "ACTIVE",
      qualityRating: 5,
    },
  });

  const dennysBroker = await prisma.broker.upsert({
    where: {
      organizationId_displayName: {
        organizationId: org.id,
        displayName: "Dennys Eduardo",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      displayName: "Dennys Eduardo",
      legalOrBillingName: "DENNYS EDUARDO",
      country: "PL",
      brokerType: "PROVIDER",
      status: "ACTIVE",
    },
  });

  const carlosBroker = await prisma.broker.upsert({
    where: {
      organizationId_displayName: {
        organizationId: org.id,
        displayName: "Carlos Lopez",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      displayName: "Carlos Lopez",
      legalOrBillingName: "CARLOS LOPEZ",
      country: "PL",
      brokerType: "PROVIDER",
      status: "ACTIVE",
    },
  });

  const ewaBroker = await prisma.broker.upsert({
    where: {
      organizationId_displayName: {
        organizationId: org.id,
        displayName: "Ewa Treszczotko",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      displayName: "Ewa Treszczotko",
      legalOrBillingName: "EWA TRESZCZOTKO",
      country: "PL",
      brokerType: "PROVIDER",
      status: "ACTIVE",
    },
  });

  const simonInvoice = await prisma.brokerInvoice.upsert({
    where: {
      organizationId_sourceInvoiceSheet_referencePeriodStart_referencePeriodEnd: {
        organizationId: org.id,
        sourceInvoiceSheet: "SIMON",
        referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
        referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      brokerId: simonBroker.id,
      sourceInvoiceSheet: "SIMON",
      sourceFileName: "2026-06 - FV (FACTURA VAT) DLA POSREDNIKOW.xlsx",
      referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      invoiceType: "Por persona (mínimo 100h/mes)",
      ratePerPersonPln: 400,
      minimumHoursThreshold: 100,
      candidateCountEligible: 2,
      baseTotal: 800,
      vatRate: 0.23,
      vatAmount: 184,
      finalAmount: 984,
      status: "READY",
      summaryBaseTotal: 6800,
      summaryVatAmount: 1564,
      summaryFinalAmount: 8364,
      summaryCandidateCount: 17,
      summaryMismatchWarning: "Resumen seed simplificado: no replica el detalle completo del Excel.",
    },
  });

  await prisma.brokerInvoice.upsert({
    where: {
      organizationId_sourceInvoiceSheet_referencePeriodStart_referencePeriodEnd: {
        organizationId: org.id,
        sourceInvoiceSheet: "DENNYS",
        referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
        referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      brokerId: dennysBroker.id,
      sourceInvoiceSheet: "DENNYS",
      sourceFileName: "2026-06 - FV (FACTURA VAT) DLA POSREDNIKOW.xlsx",
      referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      invoiceType: "Por persona (mínimo 100h/mes)",
      ratePerPersonPln: 400,
      minimumHoursThreshold: 200,
      candidateCountEligible: 0,
      baseTotal: 0,
      vatRate: 0.23,
      vatAmount: 0,
      finalAmount: 0,
      status: "DRAFT",
    },
  });

  await prisma.brokerInvoice.upsert({
    where: {
      organizationId_sourceInvoiceSheet_referencePeriodStart_referencePeriodEnd: {
        organizationId: org.id,
        sourceInvoiceSheet: "CARLOS",
        referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
        referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      brokerId: carlosBroker.id,
      sourceInvoiceSheet: "CARLOS",
      sourceFileName: "2026-06 - FV (FACTURA VAT) DLA POSREDNIKOW.xlsx",
      referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      invoiceType: "Por persona (mínimo 100h/mes)",
      ratePerPersonPln: 450,
      minimumHoursThreshold: 200,
      candidateCountEligible: 0,
      baseTotal: 0,
      vatRate: 0.23,
      vatAmount: 0,
      finalAmount: 0,
      status: "DRAFT",
    },
  });

  await prisma.brokerInvoice.upsert({
    where: {
      organizationId_sourceInvoiceSheet_referencePeriodStart_referencePeriodEnd: {
        organizationId: org.id,
        sourceInvoiceSheet: "EWA",
        referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
        referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      brokerId: ewaBroker.id,
      sourceInvoiceSheet: "EWA",
      sourceFileName: "2026-06 - FV (FACTURA VAT) DLA POSREDNIKOW.xlsx",
      referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      invoiceType: "Por persona (mínimo 100h/mes)",
      ratePerPersonPln: 400,
      minimumHoursThreshold: 200,
      candidateCountEligible: 0,
      baseTotal: 0,
      vatRate: 0.23,
      vatAmount: 0,
      finalAmount: 0,
      status: "DRAFT",
    },
  });

  const simonReferral = await prisma.workerReferral.upsert({
    where: {
      organizationId_brokerId_workerFullName_sourceInvoiceSheet_referencePeriodStart_referencePeriodEnd: {
        organizationId: org.id,
        brokerId: simonBroker.id,
        workerFullName: "Alvarez Lomas Santos",
        sourceInvoiceSheet: "SIMON",
        referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
        referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      brokerId: simonBroker.id,
      workerFullName: "Alvarez Lomas Santos",
      workerStatusRaw: "PRACUJE",
      cycleLengthDays: 67,
      hoursWorked: 148,
      minimumHoursThreshold: 100,
      minimumHoursMet: true,
      ratePerPersonPln: 400,
      baseAmount: 400,
      vatRate: 0.23,
      finalAmount: 492,
      sourceInvoiceSheet: "SIMON",
      sourceFileName: "2026-06 - FV (FACTURA VAT) DLA POSREDNIKOW.xlsx",
      sourceRowHash: "seed-simon-row-1",
      referencePeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      referencePeriodEnd: new Date("2026-04-30T00:00:00.000Z"),
    },
  });

  await prisma.brokerInvoiceLine.upsert({
    where: {
      brokerInvoiceId_sourceRowHash: {
        brokerInvoiceId: simonInvoice.id,
        sourceRowHash: "seed-simon-line-1",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      brokerInvoiceId: simonInvoice.id,
      workerReferralId: simonReferral.id,
      workerFullName: "Alvarez Lomas Santos",
      workerStatusRaw: "PRACUJE",
      cycleLengthDays: 67,
      hoursWorked: 148,
      minimumHoursThreshold: 100,
      eligible: true,
      rateApplied: 400,
      baseAmount: 400,
      vatRate: 0.23,
      finalAmount: 492,
      notes: "[Notas]",
      sourceRowHash: "seed-simon-line-1",
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
