import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  TRACKED_OPERATIONAL_ALERT_TYPES,
  type OperationalCandidate,
  type OperationalAlertType,
  getCandidateOperationalAlerts,
} from "@/lib/operational-alerts-shared";

export {
  TRACKED_OPERATIONAL_ALERT_TYPES,
  getCandidateOperationalAlerts,
} from "@/lib/operational-alerts-shared";
export type {
  OperationalAlert,
  OperationalAlertSeverity,
  OperationalAlertType,
  OperationalCandidate,
} from "@/lib/operational-alerts-shared";

const JOURNEY_ALERT_RECIPIENT_ROLES: Role[] = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.LOGISTICA,
];

const COMPLIANCE_ALERT_RECIPIENT_ROLES: Role[] = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.LOGISTICA,
  Role.LEGAL,
];

function isComplianceSensitiveAlert(type: OperationalAlertType) {
  return type === "LOGISTICS_LEGAL_BLOCKER" || type === "LOGISTICS_DOCUMENT_BLOCKER";
}

function buildRecipientIds(params: {
  candidate: OperationalCandidate;
  memberships: Array<{ userId: string; role: Role }>;
  type: OperationalAlertType;
}) {
  const { candidate, memberships, type } = params;
  const allowedRoles = isComplianceSensitiveAlert(type)
    ? COMPLIANCE_ALERT_RECIPIENT_ROLES
    : JOURNEY_ALERT_RECIPIENT_ROLES;

  const recipients = new Set(
    memberships
      .filter((membership) => allowedRoles.includes(membership.role))
      .map((membership) => membership.userId),
  );

  if (candidate.intermediaryId) {
    recipients.add(candidate.intermediaryId);
  }

  return [...recipients];
}

function toActiveAlertKey(userId: string, type: string) {
  return `${userId}:${type}`;
}

export async function syncCandidateOperationalAlerts(params: {
  candidateId: string;
  organizationId: string;
}) {
  const { candidateId, organizationId } = params;

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId,
    },
    include: {
      documents: true,
      logistics: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!candidate) {
    return [];
  }

  const alerts = getCandidateOperationalAlerts(candidate);
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      role: { in: COMPLIANCE_ALERT_RECIPIENT_ROLES },
      isActive: true,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  const existingNotifications = await prisma.notification.findMany({
    where: {
      organizationId,
      candidateId,
      type: {
        in: TRACKED_OPERATIONAL_ALERT_TYPES,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const duplicateNotificationIds: string[] = [];
  const activeKeys = new Set<string>();
  const createData: Prisma.NotificationCreateManyInput[] = [];
  const updateOperations: Prisma.PrismaPromise<unknown>[] = [];

  for (const alert of alerts) {
    const recipientIds = buildRecipientIds({ candidate, memberships, type: alert.type });

    for (const userId of recipientIds) {
      const activeKey = toActiveAlertKey(userId, alert.type);
      activeKeys.add(activeKey);

      const matchingUnread = existingNotifications.filter(
        (notification) =>
          notification.userId === userId &&
          notification.type === alert.type &&
          !notification.isRead,
      );

      const primaryUnread = matchingUnread[0] ?? null;
      for (const duplicate of matchingUnread.slice(1)) {
        duplicateNotificationIds.push(duplicate.id);
      }

      if (primaryUnread) {
        if (
          primaryUnread.title !== alert.title ||
          primaryUnread.message !== alert.message
        ) {
          updateOperations.push(
            prisma.notification.update({
              where: { id: primaryUnread.id },
              data: {
                title: alert.title,
                message: alert.message,
              },
            }),
          );
        }
        continue;
      }

      createData.push({
        userId,
        organizationId,
        candidateId,
        type: alert.type,
        title: alert.title,
        message: alert.message,
      });
    }
  }

  const staleUnreadIds = existingNotifications
    .filter(
      (notification) =>
        !notification.isRead &&
        !activeKeys.has(toActiveAlertKey(notification.userId, notification.type)),
    )
    .map((notification) => notification.id);

  const unreadIdsToClose = [...new Set([...duplicateNotificationIds, ...staleUnreadIds])];

  if (createData.length > 0) {
    updateOperations.push(prisma.notification.createMany({ data: createData }));
  }

  if (unreadIdsToClose.length > 0) {
    updateOperations.push(
      prisma.notification.updateMany({
        where: {
          id: { in: unreadIdsToClose },
        },
        data: {
          isRead: true,
        },
      }),
    );
  }

  if (updateOperations.length > 0) {
    await prisma.$transaction(updateOperations);
  }

  return alerts;
}
