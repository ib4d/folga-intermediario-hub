"use server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { LocationStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireTenant, type TenantContext } from "@/lib/tenant";
import { canManageLogistics } from "@/lib/permissions";
import { isLogisticsSchedulableStatus } from "@/lib/logistics-policy";

function assertLogisticsAccess(tenant: TenantContext) {
  if (!canManageLogistics(tenant.role)) {
    throw new Error("No autorizado");
  }
}

function nullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildSafeLogisticsUpdate(
  data: Record<string, unknown>
): Prisma.LogisticsEventUpdateInput {
  const update: Prisma.LogisticsEventUpdateInput = {};

  if (typeof data.transportType === "string") update.transportType = data.transportType;
  if (typeof data.terminal === "string") update.terminal = data.terminal;
  if (typeof data.flightOrTrain === "string") update.flightOrTrain = data.flightOrTrain;
  if (typeof data.pickedUpBy === "string") update.pickedUpBy = data.pickedUpBy;
  if (typeof data.description === "string") update.description = data.description;
  if (typeof data.confirmed === "boolean") update.confirmed = data.confirmed;
  if (typeof data.arrivalDate === "string" || data.arrivalDate instanceof Date) {
    const arrivalDate = new Date(data.arrivalDate);
    if (!Number.isNaN(arrivalDate.getTime())) update.arrivalDate = arrivalDate;
  }

  return update;
}

export async function createLogisticsEvent(formData: FormData) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);

  const candidateId = nullableString(formData.get("candidateId"));
  if (!candidateId) throw new Error("Falta el candidato");

  const transportType = nullableString(formData.get("transportType"));
  const arrivalDate = nullableDate(formData.get("arrivalDate"));
  const terminal = nullableString(formData.get("terminal"));
  const flightOrTrain = nullableString(formData.get("flightOrTrain"));
  const pickedUpBy = nullableString(formData.get("pickedUpBy"));
  const notes = nullableString(formData.get("notes"));

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      intermediaryId: true,
      status: true,
    },
  });

  if (!candidate) {
    throw new Error("Candidato no encontrado en esta organizacion");
  }

  if (!isLogisticsSchedulableStatus(candidate.status)) {
    throw new Error("No se puede programar logistica para candidatos rechazados o retirados");
  }

  const event = await prisma.logisticsEvent.create({
    data: {
      candidateId,
      organizationId: tenant.organizationId,
      type: "PICKUP",
      transportType,
      arrivalDate,
      terminal,
      flightOrTrain,
      pickedUpBy,
      description: notes,
    },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "LOGISTICS_EVENT_CREATED",
    entityType: "LogisticsEvent",
    entityId: event.id,
    details: {
      transportType,
      arrivalDate: arrivalDate?.toISOString() ?? null,
    } as Prisma.InputJsonValue,
  });

  await prisma.notification.create({
    data: {
      userId: candidate.intermediaryId,
      organizationId: tenant.organizationId,
      candidateId: candidate.id,
      type: "LOGISTICS_UPDATE",
      title: "Actualizacion de logistica",
      message: `Se ha programado el transporte (${transportType ?? "sin definir"}) para ${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim(),
    },
  });

  revalidatePath("/logistica");
  revalidatePath("/dashboard");
  revalidatePath(`/candidatos/${candidateId}`);
  return { success: true };
}

export async function updateLogisticsEvent(
  eventId: string,
  data: Record<string, unknown>
) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);

  const event = await prisma.logisticsEvent.update({
    where: { id: eventId, organizationId: tenant.organizationId },
    data: buildSafeLogisticsUpdate(data),
    include: { candidate: true },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "LOGISTICS_EVENT_UPDATED",
    entityType: "LogisticsEvent",
    entityId: eventId,
    details: data as Prisma.InputJsonValue,
  });

  revalidatePath("/logistica");
  revalidatePath("/dashboard");
  revalidatePath(`/candidatos/${event.candidateId}`);
  return { success: true };
}

export async function confirmLogisticsEvent(eventId: string) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);

  const event = await prisma.logisticsEvent.update({
    where: { id: eventId, organizationId: tenant.organizationId },
    data: { confirmed: true },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "LOGISTICS_EVENT_CONFIRMED",
    entityType: "LogisticsEvent",
    entityId: eventId,
  });

  await prisma.candidate.update({
    where: { id: event.candidateId, organizationId: tenant.organizationId },
    data: { locationStatus: LocationStatus.EN_POLONIA },
  });

  revalidatePath("/logistica");
  revalidatePath("/dashboard");
  revalidatePath(`/candidatos/${event.candidateId}`);
  return { success: true };
}

export async function deleteLogisticsEvent(eventId: string) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);

  const event = await prisma.logisticsEvent.delete({
    where: { id: eventId, organizationId: tenant.organizationId },
  });

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "LOGISTICS_EVENT_DELETED",
    entityType: "LogisticsEvent",
    entityId: eventId,
  });

  revalidatePath("/logistica");
  revalidatePath("/dashboard");
  revalidatePath(`/candidatos/${event.candidateId}`);
  return { success: true };
}

export async function updateArrivalReadinessDetails(formData: FormData) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);

  const candidateId = nullableString(formData.get("candidateId"));
  if (!candidateId) {
    throw new Error("Falta el candidato");
  }

  const accommodation = nullableString(formData.get("accommodation"));
  const arrivalNotes = nullableString(formData.get("arrivalNotes"));
  const pickedUpBy = nullableString(formData.get("pickedUpBy"));

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: tenant.organizationId,
    },
    include: {
      logistics: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!candidate) {
    throw new Error("Candidato no encontrado en esta organizacion");
  }

  await prisma.candidate.update({
    where: {
      id: candidate.id,
      organizationId: tenant.organizationId,
    },
    data: {
      accommodation,
      arrivalNotes,
    },
  });

  const latestEvent = candidate.logistics[0];
  if (latestEvent && pickedUpBy !== null) {
    await prisma.logisticsEvent.update({
      where: {
        id: latestEvent.id,
        organizationId: tenant.organizationId,
      },
      data: {
        pickedUpBy,
      },
    });
  }

  await writeAuditLog({
    userId: tenant.userId,
    organizationId: tenant.organizationId,
    action: "LOGISTICS_EVENT_UPDATED",
    entityType: "Candidate",
    entityId: candidate.id,
    details: {
      accommodation,
      arrivalNotes,
      pickedUpBy,
      latestEventId: latestEvent?.id ?? null,
    } as Prisma.InputJsonValue,
  });

  revalidatePath("/logistica");
  revalidatePath("/dashboard");
  revalidatePath(`/candidatos/${candidate.id}`);

  return { success: true };
}
