"use server";

import { prisma } from "@/lib/prisma";
import { LocationStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireTenant, type TenantContext } from "@/lib/tenant";
import { canManageLogistics } from "@/lib/permissions";
import { isLogisticsSchedulableStatus } from "@/lib/logistics-policy";
import { syncCandidateOperationalAlerts } from "@/lib/operational-alerts";

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

async function refreshOperationalSurfaces(candidateId: string, organizationId: string) {
  await syncCandidateOperationalAlerts({ candidateId, organizationId });
  revalidatePath("/logistica");
  revalidatePath("/dashboard");
  revalidatePath("/notificaciones");
  revalidatePath(`/candidatos/${candidateId}`);
}

async function requireActiveLogisticsEvent(eventId: string, organizationId: string) {
  const event = await prisma.logisticsEvent.findFirst({
    where: { id: eventId, organizationId },
    include: { candidate: { select: { status: true } } },
  });

  if (!event) throw new Error("Evento logistico no encontrado.");
  if (!isLogisticsSchedulableStatus(event.candidate.status)) {
    throw new Error("No se puede modificar la logistica de un candidato rechazado o retirado.");
  }

  return event;
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

  const event = await prisma.$transaction(async (tx) => {
    const createdEvent = await tx.logisticsEvent.create({
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

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        action: "LOGISTICS_EVENT_CREATED",
        entityType: "LogisticsEvent",
        entityId: createdEvent.id,
        details: {
          transportType,
          arrivalDate: arrivalDate?.toISOString() ?? null,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return createdEvent;
  });

  try {
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
  } catch (error) {
    console.error("[logistics] Event created but notification failed", {
      eventId: event.id,
      candidateId: candidate.id,
      error,
    });
  }

  await refreshOperationalSurfaces(candidateId, tenant.organizationId);
  return { success: true };
}

export async function updateLogisticsEvent(
  eventId: string,
  data: Record<string, unknown>
) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);
  await requireActiveLogisticsEvent(eventId, tenant.organizationId);

  const event = await prisma.$transaction(async (tx) => {
    const updatedEvent = await tx.logisticsEvent.update({
      where: { id: eventId, organizationId: tenant.organizationId },
      data: buildSafeLogisticsUpdate(data),
      include: { candidate: true },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        action: "LOGISTICS_EVENT_UPDATED",
        entityType: "LogisticsEvent",
        entityId: eventId,
        details: data as Prisma.InputJsonValue,
      },
    });

    return updatedEvent;
  });

  await refreshOperationalSurfaces(event.candidateId, tenant.organizationId);
  return { success: true };
}

export async function confirmLogisticsEvent(eventId: string) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);
  await requireActiveLogisticsEvent(eventId, tenant.organizationId);

  const event = await prisma.$transaction(async (tx) => {
    const confirmedEvent = await tx.logisticsEvent.update({
      where: { id: eventId, organizationId: tenant.organizationId },
      data: { confirmed: true },
    });

    await tx.candidate.update({
      where: { id: confirmedEvent.candidateId, organizationId: tenant.organizationId },
      data: { locationStatus: LocationStatus.EN_POLONIA },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        action: "LOGISTICS_EVENT_CONFIRMED",
        entityType: "LogisticsEvent",
        entityId: eventId,
      },
    });

    return confirmedEvent;
  });

  await refreshOperationalSurfaces(event.candidateId, tenant.organizationId);
  return { success: true };
}

export async function deleteLogisticsEvent(eventId: string) {
  const tenant = await requireTenant();
  assertLogisticsAccess(tenant);
  await requireActiveLogisticsEvent(eventId, tenant.organizationId);

  const event = await prisma.$transaction(async (tx) => {
    const deletedEvent = await tx.logisticsEvent.delete({
      where: { id: eventId, organizationId: tenant.organizationId },
    });

    await tx.auditLog.create({
      data: {
        userId: tenant.userId,
        organizationId: tenant.organizationId,
        action: "LOGISTICS_EVENT_DELETED",
        entityType: "LogisticsEvent",
        entityId: eventId,
      },
    });

    return deletedEvent;
  });

  await refreshOperationalSurfaces(event.candidateId, tenant.organizationId);
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

  if (!isLogisticsSchedulableStatus(candidate.status)) {
    throw new Error("No se puede actualizar el handoff de un candidato rechazado o retirado.");
  }

  const latestEvent = candidate.logistics[0];
  await prisma.$transaction(async (tx) => {
    await tx.candidate.update({
      where: {
        id: candidate.id,
        organizationId: tenant.organizationId,
      },
      data: {
        accommodation,
        arrivalNotes,
      },
    });

    if (latestEvent && pickedUpBy !== null) {
      await tx.logisticsEvent.update({
        where: {
          id: latestEvent.id,
          organizationId: tenant.organizationId,
        },
        data: {
          pickedUpBy,
        },
      });
    }

    await tx.auditLog.create({
      data: {
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
        } satisfies Prisma.InputJsonValue,
      },
    });
  });

  await refreshOperationalSurfaces(candidate.id, tenant.organizationId);

  return { success: true };
}
