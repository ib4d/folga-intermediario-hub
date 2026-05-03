"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, CandidateStatus, LocationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";

export async function createLogisticsEvent(formData: FormData) {
  const tenant = await requireTenant();
  
  if (!["ADMIN", "SUPERADMIN", "LOGISTICA"].includes(tenant.role)) {
    throw new Error("No autorizado");
  }

  const candidateId = formData.get("candidateId") as string;
  const transportType = formData.get("transportType") as string;
  const arrivalDate = formData.get("arrivalDate") as string;
  const terminal = formData.get("terminal") as string;
  const flightOrTrain = formData.get("flightOrTrain") as string;
  const pickedUpBy = formData.get("pickedUpBy") as string;
  const notes = formData.get("notes") as string;

  const event = await prisma.logisticsEvent.create({
    data: {
      candidateId,
      organizationId: tenant.organizationId!,
      transportType,
      arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
      terminal,
      flightOrTrain,
      pickedUpBy,
      notes,
    },
    include: { candidate: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "LOGISTICS_EVENT_CREATED",
      entity: "LogisticsEvent",
      entityId: event.id,
      details: { transportType, arrivalDate } as Prisma.InputJsonValue,
    },
  });

  // Notify Intermediary
  if (event.candidate.intermediaryId) {
    await prisma.notification.create({
      data: {
        userId: event.candidate.intermediaryId,
        organizationId: tenant.organizationId!,
        candidateId: event.candidate.id,
        type: "LOGISTICS_UPDATE",
        message: `Se ha programado el transporte (${transportType}) para ${event.candidate.firstName} ${event.candidate.lastName}`,
      }
    });
  }

  revalidatePath("/logistica");
  revalidatePath(`/candidatos/${candidateId}`);
  return { success: true };
}

export async function updateLogisticsEvent(eventId: string, data: Record<string, unknown>) {
  const tenant = await requireTenant();

  if (!["ADMIN", "SUPERADMIN", "LOGISTICA"].includes(tenant.role)) {
    throw new Error("No autorizado");
  }

  const event = await prisma.logisticsEvent.update({
    where: { id: eventId, organizationId: tenant.organizationId! },
    data,
    include: { candidate: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "LOGISTICS_EVENT_UPDATED",
      entity: "LogisticsEvent",
      entityId: eventId,
      details: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/logistica");
  revalidatePath(`/candidatos/${event.candidateId}`);
  return { success: true };
}

export async function confirmLogisticsEvent(eventId: string) {
  const tenant = await requireTenant();

  if (!["ADMIN", "SUPERADMIN", "LOGISTICA"].includes(tenant.role)) {
    throw new Error("No autorizado");
  }

  const event = await prisma.logisticsEvent.update({
    where: { id: eventId, organizationId: tenant.organizationId! },
    data: { confirmed: true },
    include: { candidate: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "LOGISTICS_EVENT_CONFIRMED",
      entity: "LogisticsEvent",
      entityId: eventId,
    },
  });

  // Update candidate status to EN_POLONIA if confirmed
  await prisma.candidate.update({
    where: { id: event.candidateId, organizationId: tenant.organizationId! },
    data: { locationStatus: LocationStatus.EN_POLONIA },
  });

  revalidatePath("/logistica");
  revalidatePath(`/candidatos/${event.candidateId}`);
  return { success: true };
}

export async function deleteLogisticsEvent(eventId: string) {
  const tenant = await requireTenant();

  if (!["ADMIN", "SUPERADMIN", "LOGISTICA"].includes(tenant.role)) {
    throw new Error("No autorizado");
  }

  const event = await prisma.logisticsEvent.delete({
    where: { id: eventId, organizationId: tenant.organizationId! },
  });

  await prisma.auditLog.create({
    data: {
      userId: tenant.userId,
      organizationId: tenant.organizationId!,
      action: "LOGISTICS_EVENT_DELETED",
      entity: "LogisticsEvent",
      entityId: eventId,
    },
  });

  revalidatePath("/logistica");
  revalidatePath(`/candidatos/${event.candidateId}`);
  return { success: true };
}
