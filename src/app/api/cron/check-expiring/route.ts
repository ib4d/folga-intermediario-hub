import { emitEvent } from "@/core/events";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOC_EXPIRING_EVENT_TYPE = "DOC_EXPIRING_DETECTED";

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

  const notifications = docsWithRecipients.map(({ document, userId }) => ({
    documentId: document.id,
    userId,
    organizationId: document.candidate.organizationId,
    candidateId: document.candidate.id,
    type: "DOC_EXPIRING",
    title: "Documento por expirar",
    message: `El documento ${document.type} de ${document.candidate.firstName} ${document.candidate.lastName} expira en 30 dias.`,
  }));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });

    await Promise.all(
      notifications.map((notification, index) =>
        emitEvent(
          DOC_EXPIRING_EVENT_TYPE,
          notification.organizationId,
          {
            documentId: notification.documentId,
            candidateId: notification.candidateId,
            intermediaryId: notification.userId,
            candidateFirstName: docsWithRecipients[index]?.document.candidate.firstName,
            candidateLastName: docsWithRecipients[index]?.document.candidate.lastName,
            documentType: docsWithRecipients[index]?.document.type,
            expiryDate: docsWithRecipients[index]?.document.expiryDate?.toISOString() ?? null,
            daysUntilExpiry: 30,
            notificationType: notification.type,
            title: notification.title,
            message: notification.message,
          },
          notification.userId
        )
      )
    );
  }

  return NextResponse.json({ processed: notifications.length });
}
