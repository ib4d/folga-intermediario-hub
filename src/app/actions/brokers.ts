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
