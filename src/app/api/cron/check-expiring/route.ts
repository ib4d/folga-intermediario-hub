import { emitEvent } from "@/core/events";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOC_EXPIRING_EVENT_TYPE = "DOC_EXPIRING_DETECTED";

function buildExpiringNotificationKey(input: {
  userId: string;
  candidateId: string;
  title: string;
  message: string;
}) {
  return `${input.userId}:${input.candidateId}:${input.title}:${input.message}`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + 30);

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const expiringDocs = await prisma.document.findMany({
    where: {
      expiryDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          intermediaryId: true,
          organizationId: true,
        },
      },
    },
  });

  const docsWithRecipients = expiringDocs
    .filter((doc) => doc.candidate.intermediaryId)
    .map((doc) => ({
      document: doc,
      userId: doc.candidate.intermediaryId!,
    }));

  const pendingNotifications = docsWithRecipients.map(({ document, userId }) => ({
    documentId: document.id,
    userId,
    organizationId: document.candidate.organizationId,
    candidateId: document.candidate.id,
    type: "DOC_EXPIRING",
    title: "Documento por expirar",
    message: `El documento ${document.type} de ${document.candidate.firstName} ${document.candidate.lastName} expira en 30 dias.`,
  }));

  const startOfRunDay = new Date();
  startOfRunDay.setHours(0, 0, 0, 0);

  const existingNotifications =
    pendingNotifications.length > 0
      ? await prisma.notification.findMany({
          where: {
            type: "DOC_EXPIRING",
            userId: { in: [...new Set(pendingNotifications.map((notification) => notification.userId))] },
            candidateId: {
              in: [...new Set(pendingNotifications.map((notification) => notification.candidateId))],
            },
            createdAt: {
              gte: startOfRunDay,
            },
          },
          select: {
            userId: true,
            candidateId: true,
            title: true,
            message: true,
          },
        })
      : [];

  const existingKeys = new Set(
    existingNotifications.map((notification) =>
      buildExpiringNotificationKey({
        userId: notification.userId,
        candidateId: notification.candidateId ?? "",
        title: notification.title,
        message: notification.message,
      })
    )
  );

  const notificationsToCreate = pendingNotifications.filter((notification) => {
    const notificationKey = buildExpiringNotificationKey({
      userId: notification.userId,
      candidateId: notification.candidateId,
      title: notification.title,
      message: notification.message,
    });

    if (existingKeys.has(notificationKey)) {
      return false;
    }

    existingKeys.add(notificationKey);
    return true;
  });

  if (notificationsToCreate.length > 0) {
    const docById = new Map(docsWithRecipients.map((item) => [item.document.id, item.document] as const));

    await prisma.notification.createMany({
      data: notificationsToCreate.map((notification) => ({
        userId: notification.userId,
        organizationId: notification.organizationId,
        candidateId: notification.candidateId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      })),
    });

    await Promise.all(
      notificationsToCreate.map((notification) => {
        const sourceDocument = docById.get(notification.documentId);

        return emitEvent(
          DOC_EXPIRING_EVENT_TYPE,
          notification.organizationId,
          {
            documentId: notification.documentId,
            candidateId: notification.candidateId,
            intermediaryId: notification.userId,
            candidateFirstName: sourceDocument?.candidate.firstName,
            candidateLastName: sourceDocument?.candidate.lastName,
            documentType: sourceDocument?.type,
            expiryDate: sourceDocument?.expiryDate?.toISOString() ?? null,
            daysUntilExpiry: 30,
            notificationType: notification.type,
            title: notification.title,
            message: notification.message,
          },
          notification.userId
        );
      })
    );
  }

  return NextResponse.json({
    processed: notificationsToCreate.length,
    skippedDuplicates: pendingNotifications.length - notificationsToCreate.length,
  });
}
