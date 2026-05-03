"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email/sender";

export async function createLead(formData: FormData) {
  const tenant = await requireTenant();
  
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;
  const source = formData.get("source") as string;

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      company,
      source,
      organizationId: tenant.organizationId!,
      status: "NEW"
    }
  });

  revalidatePath("/leads");
  return { success: true, leadId: lead.id };
}

export async function sendLeadOutreach(leadId: string, message: string, step: number) {
  const tenant = await requireTenant();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId, organizationId: tenant.organizationId! }
  });

  if (!lead || !lead.email) throw new Error("Lead no válido o sin email");

  // Create outreach record
  const outreach = await prisma.outreach.create({
    data: {
      leadId,
      step,
      message,
      sentAt: new Date()
    }
  });

  // Actually send email (placeholder integration)
  await sendEmail({
    to: lead.email,
    subject: `Propuesta para ${lead.company || lead.name}`,
    body: message
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "CONTACTED" }
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { success: true, outreachId: outreach.id };
}

export async function updateLeadStatus(leadId: string, status: string) {
  const tenant = await requireTenant();
  
  await prisma.lead.update({
    where: { id: leadId, organizationId: tenant.organizationId! },
    data: { status }
  });

  revalidatePath("/leads");
}
