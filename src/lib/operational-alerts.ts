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
  return prisma.$transaction(async (tx) => {
    // Serialize the read/reconcile/write cycle across app instances. Hashing the
    // scoped key to one advisory-lock id keeps the lock stable per candidate.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`ori-cruit:operational-alerts:${organizationId}:${candidateId}`}, 0))::text`;

    const candidate = await tx.candidate.findFirst({
      where: { id: candidateId, organizationId },
      include: {
        documents: true,
        logistics: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!candidate) return [];

    const alerts = getCandidateOperationalAlerts(candidate);
    const memberships = await tx.membership.findMany({
      where: {
        organizationId,
        role: { in: COMPLIANCE_ALERT_RECIPIENT_ROLES },
        isActive: true,
      },
      select: { userId: true, role: true },
    });
    const existingNotifications = await tx.notification.findMany({
      where: {
        organizationId,
        candidateId,
        type: { in: TRACKED_OPERATIONAL_ALERT_TYPES },
      },
      orderBy: { createdAt: "desc" },
    });

    const duplicateNotificationIds: string[] = [];
    const activeKeys = new Set<string>();
    const createData: Prisma.NotificationCreateManyInput[] = [];
    const updates: Array<{ id: string; title: string; message: string }> = [];

    for (const alert of alerts) {
      for (const userId of buildRecipientIds({ candidate, memberships, type: alert.type })) {
        const activeKey = toActiveAlertKey(userId, alert.type);
        activeKeys.add(activeKey);
        const matchingUnread = existingNotifications.filter(
          (notification) => notification.userId === userId && notification.type === alert.type && !notification.isRead,
        );
        const primaryUnread = matchingUnread[0] ?? null;
        duplicateNotificationIds.push(...matchingUnread.slice(1).map((notification) => notification.id));

        if (primaryUnread) {
          if (primaryUnread.title !== alert.title || primaryUnread.message !== alert.message) {
            updates.push({ id: primaryUnread.id, title: alert.title, message: alert.message });
          }
        } else {
          createData.push({ userId, organizationId, candidateId, type: alert.type, title: alert.title, message: alert.message });
        }
      }
    }

    const staleUnreadIds = existingNotifications
      .filter((notification) => !notification.isRead && !activeKeys.has(toActiveAlertKey(notification.userId, notification.type)))
      .map((notification) => notification.id);
    const unreadIdsToClose = [...new Set([...duplicateNotificationIds, ...staleUnreadIds])];

    for (const update of updates) {
      await tx.notification.update({ where: { id: update.id }, data: { title: update.title, message: update.message } });
    }
    if (createData.length > 0) await tx.notification.createMany({ data: createData });
    if (unreadIdsToClose.length > 0) {
      await tx.notification.updateMany({ where: { id: { in: unreadIdsToClose }, organizationId, candidateId }, data: { isRead: true } });
    }

    return alerts;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 });
}
