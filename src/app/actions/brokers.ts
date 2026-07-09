"use server";

import { revalidatePath } from "next/cache";

import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import {
  importBrokerInvoicesWorkbook,
  importBrokerLeadsWorkbook,
  promoteBrokerLeadToBroker,
} from "@/lib/brokers/importers";
import { prisma } from "@/lib/prisma";

async function assertBrokerAccess() {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) {
    throw new Error("Tu rol no puede gestionar brokers.");
  }
  return tenant;
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value.length > 0 ? value : null;
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readText(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMonthRange(monthValue: string) {
  const normalized = /^\d{4}-\d{2}$/.test(monthValue) ? monthValue : new Date().toISOString().slice(0, 7);
  const [year, month] = normalized.split("-").map((part) => Number(part));
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { month: normalized, start, end };
}

export async function importBrokerLeadsAction(formData: FormData) {
  const tenant = await assertBrokerAccess();
  const file = formData.get("file");
  const sourceCountrySheet = String(formData.get("sourceCountrySheet") || "GWATEMALA");

  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo Excel de leads.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await importBrokerLeadsWorkbook({
    organizationId: tenant.organizationId,
    actorUserId: tenant.userId,
    fileName: file.name,
    fileBuffer: buffer,
    sourceCountrySheet,
  });

  revalidatePath("/brokers");
  revalidatePath("/brokers/leads");
  revalidatePath("/broker-dashboard");

  return result;
}

export async function importBrokerInvoicesAction(formData: FormData) {
  const tenant = await assertBrokerAccess();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo Excel de facturacion.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await importBrokerInvoicesWorkbook({
    organizationId: tenant.organizationId,
    fileName: file.name,
    fileBuffer: buffer,
  });

  revalidatePath("/brokers");
  revalidatePath("/broker-invoices");
  revalidatePath("/broker-dashboard");

  return result;
}

export async function promoteBrokerLeadAction(leadId: string) {
  const tenant = await assertBrokerAccess();
  const broker = await promoteBrokerLeadToBroker({
    organizationId: tenant.organizationId,
    brokerLeadId: leadId,
  });

  revalidatePath("/brokers");
  revalidatePath("/brokers/leads");
  revalidatePath(`/brokers/leads/${leadId}`);
  revalidatePath(`/brokers/${broker.id}`);

  return { success: true, brokerId: broker.id };
}

export async function updateBrokerAction(brokerId: string, formData: FormData) {
  const tenant = await assertBrokerAccess();
  const broker = await prisma.broker.findFirst({
    where: { id: brokerId, organizationId: tenant.organizationId },
    select: { id: true, displayName: true },
  });

  if (!broker) {
    throw new Error("Broker no encontrado.");
  }

  await prisma.broker.update({
    where: { id: broker.id },
    data: {
      displayName: readText(formData, "displayName") || broker.displayName,
      legalOrBillingName: readOptionalText(formData, "legalOrBillingName"),
      country: readOptionalText(formData, "country"),
      city: readOptionalText(formData, "city"),
      primaryEmail: readOptionalText(formData, "primaryEmail"),
      primaryPhone: readOptionalText(formData, "primaryPhone"),
      declaredSupplyText: readOptionalText(formData, "declaredSupplyText"),
      brokerType: readText(formData, "brokerType") as never,
      status: readText(formData, "status") as never,
      qualityRating: readOptionalNumber(formData, "qualityRating"),
      notes: readOptionalText(formData, "notes"),
    },
  });

  revalidatePath("/brokers");
  revalidatePath(`/brokers/${brokerId}`);
  revalidatePath("/broker-dashboard");
}

export async function updateBrokerLeadAction(leadId: string, formData: FormData) {
  const tenant = await assertBrokerAccess();
  const lead = await prisma.brokerLead.findFirst({
    where: { id: leadId, organizationId: tenant.organizationId },
    select: { id: true },
  });

  if (!lead) {
    throw new Error("Lead de broker no encontrado.");
  }

  await prisma.brokerLead.update({
    where: { id: lead.id },
    data: {
      firstName: readOptionalText(formData, "firstName"),
      lastName: readOptionalText(formData, "lastName"),
      email: readOptionalText(formData, "email"),
      phone: readOptionalText(formData, "phone"),
      city: readOptionalText(formData, "city"),
      declaredSupplyText: readOptionalText(formData, "declaredSupplyText"),
      rawStatus: readOptionalText(formData, "rawStatus"),
      normalizedStatus: readOptionalText(formData, "normalizedStatus"),
      flowStatus: readOptionalText(formData, "flowStatus"),
      emailStatus: readOptionalText(formData, "emailStatus"),
      deliveryError: readOptionalText(formData, "deliveryError"),
      leadType: readText(formData, "leadType") as never,
      notes: readOptionalText(formData, "notes"),
    },
  });

  revalidatePath("/brokers");
  revalidatePath("/brokers/leads");
  revalidatePath(`/brokers/leads/${leadId}`);
  revalidatePath("/broker-dashboard");
}

export async function generateBrokerInvoiceAction(brokerId: string, formData: FormData) {
  const tenant = await assertBrokerAccess();
  const broker = await prisma.broker.findFirst({
    where: { id: brokerId, organizationId: tenant.organizationId },
    select: { id: true, displayName: true, legalOrBillingName: true },
  });

  if (!broker) {
    throw new Error("Broker no encontrado.");
  }

  const period = getMonthRange(readText(formData, "period"));
  const threshold = readOptionalNumber(formData, "minimumHoursThreshold") ?? 100;
  const invoiceType = readText(formData, "invoiceType") || `Por persona (mínimo ${threshold}h/mes)`;
  const sourceInvoiceSheet = "APP_GENERATED";

  const referrals = await prisma.workerReferral.findMany({
    where: {
      organizationId: tenant.organizationId,
      brokerId: broker.id,
      referencePeriodStart: { gte: period.start },
      referencePeriodEnd: { lte: period.end },
    },
    orderBy: { workerFullName: "asc" },
  });

  const existingInvoice = await prisma.brokerInvoice.findFirst({
    where: {
      organizationId: tenant.organizationId,
      brokerId: broker.id,
      sourceInvoiceSheet,
      referencePeriodStart: period.start,
      referencePeriodEnd: period.end,
    },
    select: { id: true },
  });

  const invoice = existingInvoice
    ? await prisma.brokerInvoice.update({
        where: { id: existingInvoice.id },
        data: {
          sourceFileName: null,
          invoiceType,
          ratePerPersonPln: null,
          minimumHoursThreshold: threshold,
          vatRate: 0.23,
          summaryBaseTotal: null,
          summaryVatAmount: null,
          summaryFinalAmount: null,
          summaryCandidateCount: null,
          summaryMismatchWarning: null,
          status: "DRAFT",
        },
      })
    : await prisma.brokerInvoice.create({
        data: {
          organizationId: tenant.organizationId,
          brokerId: broker.id,
          sourceInvoiceSheet,
          sourceFileName: null,
          referencePeriodStart: period.start,
          referencePeriodEnd: period.end,
          invoiceType,
          ratePerPersonPln: null,
          minimumHoursThreshold: threshold,
          vatRate: 0.23,
          status: "DRAFT",
        },
      });

  await prisma.brokerInvoiceLine.deleteMany({
    where: { organizationId: tenant.organizationId, brokerInvoiceId: invoice.id },
  });

  const lines = referrals.map((referral) => {
    const eligible = referral.minimumHoursMet ?? (referral.hoursWorked != null ? Number(referral.hoursWorked) >= threshold : false);
    const rateApplied = referral.ratePerPersonPln ?? 0;
    const baseAmount = referral.baseAmount != null ? Number(referral.baseAmount) : eligible ? Number(rateApplied) : 0;
    const vatRate = referral.vatRate != null ? Number(referral.vatRate) : 0.23;
    const finalAmount = referral.finalAmount != null ? Number(referral.finalAmount) : Number((baseAmount * (1 + vatRate)).toFixed(2));

    return {
      organizationId: tenant.organizationId,
      brokerInvoiceId: invoice.id,
      workerReferralId: referral.id,
      workerFullName: referral.workerFullName,
      workerStatusRaw: referral.workerStatusRaw,
      cycleLengthDays: referral.cycleLengthDays ?? undefined,
      hoursWorked: referral.hoursWorked,
      minimumHoursThreshold: threshold,
      eligible,
      rateApplied,
      baseAmount,
      vatRate,
      finalAmount,
      notes: referral.notes,
      sourceRowHash: referral.sourceRowHash || `${referral.id}-${period.month}`,
    };
  });

  if (lines.length > 0) {
    await prisma.brokerInvoiceLine.createMany({ data: lines });
  }

  const totals = await prisma.brokerInvoiceLine.aggregate({
    where: { organizationId: tenant.organizationId, brokerInvoiceId: invoice.id },
    _sum: { baseAmount: true, finalAmount: true },
  });

  const eligibleCount = await prisma.brokerInvoiceLine.count({
    where: { organizationId: tenant.organizationId, brokerInvoiceId: invoice.id, eligible: true },
  });

  const baseTotal = Number(totals._sum.baseAmount ?? 0);
  const finalAmount = Number(totals._sum.finalAmount ?? 0);
  const vatAmount = Number((finalAmount - baseTotal).toFixed(2));

  await prisma.brokerInvoice.update({
    where: { id: invoice.id },
    data: {
      candidateCountEligible: eligibleCount,
      baseTotal,
      vatRate: 0.23,
      vatAmount,
      finalAmount,
      status: "DRAFT",
    },
  });

  revalidatePath("/brokers");
  revalidatePath(`/brokers/${broker.id}`);
  revalidatePath("/broker-invoices");
  revalidatePath(`/broker-invoices/${invoice.id}`);
  revalidatePath("/broker-dashboard");

  return { invoiceId: invoice.id, period: period.month, lines: lines.length };
}

export async function updateBrokerInvoiceStatusAction(invoiceId: string, status: string) {
  const tenant = await assertBrokerAccess();
  const invoice = await prisma.brokerInvoice.findFirst({
    where: { id: invoiceId, organizationId: tenant.organizationId },
    select: { id: true },
  });
  if (!invoice) {
    throw new Error("Factura de broker no encontrada.");
  }
  await prisma.brokerInvoice.update({
    where: { id: invoice.id },
    data: { status: status as never },
  });

  revalidatePath("/broker-invoices");
  revalidatePath(`/broker-invoices/${invoiceId}`);
}

export async function updateBrokerInvoiceAction(invoiceId: string, formData: FormData) {
  const tenant = await assertBrokerAccess();
  const invoice = await prisma.brokerInvoice.findFirst({
    where: { id: invoiceId, organizationId: tenant.organizationId },
    select: { id: true, brokerId: true },
  });

  if (!invoice) {
    throw new Error("Factura de broker no encontrada.");
  }

  await prisma.brokerInvoice.update({
    where: { id: invoice.id },
    data: {
      invoiceType: readOptionalText(formData, "invoiceType"),
      ratePerPersonPln: readOptionalNumber(formData, "ratePerPersonPln"),
      notes: readOptionalText(formData, "notes"),
      status: readText(formData, "status") as never,
    },
  });

  revalidatePath("/broker-invoices");
  revalidatePath(`/broker-invoices/${invoiceId}`);
  revalidatePath(`/brokers/${invoice.brokerId}`);
  revalidatePath("/broker-dashboard");
}
