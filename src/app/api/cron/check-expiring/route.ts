import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { emitEvent } from "@/core/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOC_EXPIRING_EVENT_TYPE = "DOC_EXPIRING_DETECTED";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Buscar documentos que expiren en exactamente 30 días
  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + 30);
  
  // Rango del día para la búsqueda
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  const expiringDocs = await prisma.document.findMany({
    where: {
      expiryDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      candidate: {
        select: { id: true, firstName: true, lastName: true, intermediaryId: true, organizationId: true },
      },
    },
  });

  const notifications = expiringDocs
    .filter((doc) => doc.candidate.intermediaryId)
    .map((doc) => ({
      documentId: doc.id,
      userId: doc.candidate.intermediaryId!,
      organizationId: doc.candidate.organizationId,
      candidateId: doc.candidate.id,
      type: "DOC_EXPIRING",
      title: "Documento por expirar",
      message: `El documento ${doc.type} de ${doc.candidate.firstName} ${doc.candidate.lastName} expira en 30 días.`,
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
            documentType: expiringDocs[index]?.type,
            expiryDate: expiringDocs[index]?.expiryDate?.toISOString?.() ?? null,
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
