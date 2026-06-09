"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

const notificationTypeFilters = {
  "doc-expiring": ["DOC_EXPIRING"],
  "billing-attention": ["BILLING_SUBSCRIPTION_ATTENTION"],
  "billing-pressure": ["BILLING_USAGE_PRESSURE"],
} as const;

export async function markNotificationsAsRead(formData: FormData) {
  const tenant = await requireTenant();
  const typeFilter = String(formData.get("type") ?? "all");
  const selectedTypes =
    typeFilter in notificationTypeFilters
      ? notificationTypeFilters[typeFilter as keyof typeof notificationTypeFilters]
      : undefined;

  await prisma.notification.updateMany({
    where: {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      isRead: false,
      ...(selectedTypes ? { type: { in: [...selectedTypes] } } : {}),
    },
    data: { isRead: true },
  });

  revalidatePath("/notificaciones");
}
