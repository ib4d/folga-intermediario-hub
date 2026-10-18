"use server";

import { prisma } from "@/lib/prisma";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { sendTransactionalEmail } from "@/lib/providers/email";

export async function createLead(formData: FormData) {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "leads")) {
    throw new Error("Tu rol no puede gestionar leads");
  }
  
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  if (!name) throw new Error("El nombre del lead es obligatorio");
  if (name.length > 160 || company.length > 160 || source.length > 120 || email.length > 254) {
    throw new Error("Uno de los campos supera la longitud permitida");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("El correo electrónico no es válido");
  }

  await prisma.lead.create({
    data: {
      name,
      email: email || null,
      company: company || null,
      source: source || null,
      organizationId: tenant.organizationId!,
      status: "NEW"
    }
  });

  revalidatePath("/leads");
}

export async function sendLeadOutreach(leadId: string, message: string, step: number) {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "leads")) {
    throw new Error("Tu rol no puede gestionar leads");
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: tenant.organizationId! }
  });

  if (!lead || !lead.email) throw new Error("Lead no válido o sin email");

  const emailResult = await sendTransactionalEmail({
    to: lead.email,
    subject: `Propuesta para ${lead.company || lead.name}`,
    body: message
  });

  if (!emailResult.success) {
    throw new Error(`No se pudo enviar el correo: ${emailResult.error || "SMTP_SEND_FAILED"}`);
  }

  const outreach = await prisma.outreach.create({
    data: {
      leadId,
      organizationId: tenant.organizationId!,
      step,
      message,
      sentAt: new Date()
    }
  });

  await prisma.lead.update({
    where: { id: leadId, organizationId: tenant.organizationId! },
    data: { status: "CONTACTED" }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { success: true, outreachId: outreach.id };
}

export async function updateLeadStatus(leadId: string, status: string) {
  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "leads")) {
    throw new Error("Tu rol no puede gestionar leads");
  }
  
  await prisma.lead.update({
    where: { id: leadId, organizationId: tenant.organizationId! },
    data: { status }
  });

  revalidatePath("/leads");
}
