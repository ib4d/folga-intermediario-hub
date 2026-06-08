import { Plan, Prisma, Role } from "@prisma/client";

import { emitEvent } from "@/core/events";
import { getPlanLimits } from "@/lib/billing/limits";
import { prisma } from "@/lib/prisma";

const BILLING_ALERT_RECIPIENT_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];

export const BILLING_NOTIFICATION_TYPES = [
  "BILLING_SUBSCRIPTION_ATTENTION",
  "BILLING_USAGE_PRESSURE",
] as const;

export type BillingNotificationType = (typeof BILLING_NOTIFICATION_TYPES)[number];

type BillingAttentionState = {
  status: string;
  currentPeriodEnd: Date | null;
};

type BillingPressureState = {
  label: "candidates" | "users" | "documents" | "ocr";
  ratio: number;
  used: number;
  limit: number;
};

type BillingAutomationSignal = {
  billingAttention: BillingAttentionState | null;
  usagePressure: BillingPressureState | null;
};

type RecipientMembership = {
  organizationId: string;
  userId: string;
  role: Role;
};

function isHealthySubscription(status: string | null | undefined) {
  const normalized = status?.toLowerCase() ?? "missing";
  return ["active", "trialing"].includes(normalized);
}

function formatPeriodEnd(value: Date | null) {
  return value ? value.toLocaleDateString("es-ES") : "N/D";
}

function buildBillingAttentionState(organization: {
  plan: Plan;
  subscription: { status: string | null; currentPeriodEnd: Date | null } | null;
}): BillingAttentionState | null {
  if (organization.plan === "FREE") {
    return null;
  }

  const status = organization.subscription?.status?.toLowerCase() ?? "missing";
  if (isHealthySubscription(status)) {
    return null;
  }

  return {
    status,
    currentPeriodEnd: organization.subscription?.currentPeriodEnd ?? null,
  };
}

function buildBillingPressureState(organization: {
  plan: Plan;
  counts: {
    candidates: number;
    memberships: number;
    documents: number;
    ocr: number;
  };
}): BillingPressureState | null {
  if (organization.plan === "ENTERPRISE") {
    return null;
  }

  const limits = getPlanLimits(organization.plan);
  const pressureCandidates: BillingPressureState[] = [
    {
      label: "candidates" as const,
      used: organization.counts.candidates,
      limit: limits.candidates,
      ratio: limits.candidates === Infinity ? 0 : organization.counts.candidates / limits.candidates,
    },
    {
      label: "users" as const,
      used: organization.counts.memberships,
      limit: limits.users,
      ratio: limits.users === Infinity ? 0 : organization.counts.memberships / limits.users,
    },
    {
      label: "documents" as const,
      used: organization.counts.documents,
      limit: limits.documentsPerMonth,
      ratio:
        limits.documentsPerMonth === Infinity
          ? 0
          : organization.counts.documents / limits.documentsPerMonth,
    },
    {
      label: "ocr" as const,
      used: organization.counts.ocr,
      limit: limits.ocrPerMonth,
      ratio: limits.ocrPerMonth === Infinity ? 0 : organization.counts.ocr / limits.ocrPerMonth,
    },
  ]
    .filter((item) => item.limit !== Infinity)
    .sort((a, b) => b.ratio - a.ratio);

  const topPressure = pressureCandidates[0];
  if (!topPressure || topPressure.ratio < 0.8) {
    return null;
  }

  return topPressure;
}

function billingAttentionTitle(organizationName: string) {
  return `Atencion de billing: ${organizationName}`;
}

function billingAttentionMessage(organizationName: string, state: BillingAttentionState) {
  const periodEnd = formatPeriodEnd(state.currentPeriodEnd);
  return `La suscripcion de ${organizationName} necesita revision (${state.status}). Periodo actual: ${periodEnd}.`;
}

function billingPressureTitle(organizationName: string) {
  return `Presion de plan: ${organizationName}`;
}

function billingPressureMessage(organizationName: string, state: BillingPressureState) {
  const percent = Math.round(state.ratio * 100);
  return `La cuenta ${organizationName} esta cerca del limite en ${state.label} (${state.used}/${state.limit}, ${percent}%).`;
}

function recipientKey(userId: string, type: BillingNotificationType) {
  return `${userId}:${type}`;
}

async function emitBillingSignalEvent(
  eventType: "BILLING_ATTENTION_DETECTED" | "PLAN_PRESSURE_DETECTED",
  organizationId: string,
  payload: Record<string, unknown>,
  userId?: string
) {
  try {
    await emitEvent(eventType, organizationId, payload, userId);
  } catch (error) {
    console.error(`[BillingAutomation] Failed to emit ${eventType} for ${organizationId}:`, error);
  }
}

export async function syncBillingAutomationNotifications() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const organizations = await prisma.organization.findMany({
    include: {
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      },
      _count: {
        select: {
          memberships: true,
          candidates: true,
          documents: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: { in: organizations.map((organization) => organization.id) },
      role: { in: BILLING_ALERT_RECIPIENT_ROLES },
      isActive: true,
    },
    select: {
      organizationId: true,
      userId: true,
      role: true,
    },
  });

  const membershipByOrganization = memberships.reduce<Record<string, RecipientMembership[]>>(
    (acc, membership) => {
      const list = acc[membership.organizationId] ?? [];
      list.push(membership);
      acc[membership.organizationId] = list;
      return acc;
    },
    {}
  );

  const summary = {
    organizationsScanned: organizations.length,
    organizationsWithAttention: 0,
    organizationsWithPressure: 0,
    notificationsCreated: 0,
    notificationsUpdated: 0,
    notificationsClosed: 0,
  };

  for (const organization of organizations) {
    const billingAttention = buildBillingAttentionState(organization);
    const monthlyDocumentCount = await prisma.document.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: startOfMonth },
      },
    });
    const monthlyOcrCount = await prisma.auditLog.count({
      where: {
        organizationId: organization.id,
        action: { in: ["OCR_EXTRACTED_PENDING_REVIEW", "OCR_FAILED"] },
        createdAt: { gte: startOfMonth },
      },
    });
    const usagePressure = buildBillingPressureState({
      plan: organization.plan,
      counts: {
        candidates: organization._count.candidates,
        memberships: organization._count.memberships,
        documents: monthlyDocumentCount,
        ocr: monthlyOcrCount,
      },
    });

    const recipients = membershipByOrganization[organization.id] ?? [];
    const existingNotifications = await prisma.notification.findMany({
      where: {
        organizationId: organization.id,
        type: {
          in: [...BILLING_NOTIFICATION_TYPES],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!billingAttention && !usagePressure) {
      const staleUnreadIds = existingNotifications
        .filter((notification) => !notification.isRead)
        .map((notification) => notification.id);

      if (staleUnreadIds.length > 0) {
        await prisma.notification.updateMany({
          where: {
            id: { in: staleUnreadIds },
          },
          data: {
            isRead: true,
          },
        });
        summary.notificationsClosed += staleUnreadIds.length;
      }

      continue;
    }

    if (billingAttention) {
      summary.organizationsWithAttention += 1;
    }
    if (usagePressure) {
      summary.organizationsWithPressure += 1;
    }

    const activeKeys = new Set<string>();
    const duplicateNotificationIds: string[] = [];
    const createData: Prisma.NotificationCreateManyInput[] = [];
    const updateOperations: Prisma.PrismaPromise<unknown>[] = [];

    const activeSignals: Array<{
      type: BillingNotificationType;
      title: string;
      message: string;
      payload: BillingAutomationSignal;
    }> = [];

    if (billingAttention) {
      activeSignals.push({
        type: "BILLING_SUBSCRIPTION_ATTENTION",
        title: billingAttentionTitle(organization.name),
        message: billingAttentionMessage(organization.name, billingAttention),
        payload: {
          billingAttention,
          usagePressure: usagePressure ?? null,
        },
      });
    }

    if (usagePressure) {
      activeSignals.push({
        type: "BILLING_USAGE_PRESSURE",
        title: billingPressureTitle(organization.name),
        message: billingPressureMessage(organization.name, usagePressure),
        payload: {
          billingAttention: billingAttention ?? null,
          usagePressure,
        },
      });
    }

    for (const signal of activeSignals) {
      for (const recipient of recipients) {
        const activeKey = recipientKey(recipient.userId, signal.type);
        activeKeys.add(activeKey);

        const matchingUnread = existingNotifications.filter(
          (notification) =>
            notification.userId === recipient.userId &&
            notification.type === signal.type &&
            !notification.isRead
        );

        const primaryUnread = matchingUnread[0] ?? null;
        for (const duplicate of matchingUnread.slice(1)) {
          duplicateNotificationIds.push(duplicate.id);
        }

        if (primaryUnread) {
          if (primaryUnread.title !== signal.title || primaryUnread.message !== signal.message) {
            updateOperations.push(
              prisma.notification.update({
                where: { id: primaryUnread.id },
                data: {
                  title: signal.title,
                  message: signal.message,
                },
              })
            );
            summary.notificationsUpdated += 1;
          }
          continue;
        }

        createData.push({
          userId: recipient.userId,
          organizationId: organization.id,
          candidateId: null,
          type: signal.type,
          title: signal.title,
          message: signal.message,
        });
        summary.notificationsCreated += 1;
      }
    }

    const staleUnreadIds = existingNotifications
      .filter(
        (notification) =>
          !notification.isRead &&
          !activeKeys.has(recipientKey(notification.userId, notification.type as BillingNotificationType))
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
        })
      );
      summary.notificationsClosed += unreadIdsToClose.length;
    }

    if (updateOperations.length > 0) {
      await prisma.$transaction(updateOperations);
    }

    await emitBillingSignalEvent(
      "BILLING_ATTENTION_DETECTED",
      organization.id,
      {
        organizationId: organization.id,
        organizationName: organization.name,
        billingAttention,
        usagePressure,
      },
      recipients[0]?.userId
    );

    if (usagePressure) {
      await emitBillingSignalEvent(
        "PLAN_PRESSURE_DETECTED",
        organization.id,
        {
          organizationId: organization.id,
          organizationName: organization.name,
          usagePressure,
          billingAttention,
        },
        recipients[0]?.userId
      );
    }
  }

  return summary;
}
