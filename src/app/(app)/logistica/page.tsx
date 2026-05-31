import { Truck } from "lucide-react";
import { redirect } from "next/navigation";
import type { ComponentProps } from "react";

import { auth } from "@/auth";
import LogisticsDashboard from "@/components/logistics/LogisticsDashboard";
import { normalizeLanguage, t } from "@/lib/i18n";
import { LOGISTICS_BLOCKED_STATUSES } from "@/lib/logistics-policy";
import { canManageLogistics, canViewCandidateAudit } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { Role } from "@prisma/client";

export default async function LogisticaPage() {
  const session = await auth();
  if (!session || !canManageLogistics(session.user.role as Role)) {
    redirect("/dashboard");
  }

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);
  const tenant = await requireTenant();

  const pendingCandidates = await prisma.candidate.findMany({
    where: candidateVisibilityWhere(tenant, {
      status: { notIn: [...LOGISTICS_BLOCKED_STATUSES] },
      isArchived: false,
    }),
    include: {
      documents: true,
      logistics: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const weeklyEvents = await prisma.logisticsEvent.findMany({
    where: {
      organizationId: tenant.organizationId,
      arrivalDate: { gte: today, lte: nextWeek },
    },
    include: {
      candidate: {
        include: {
          documents: true,
        },
      },
    },
    orderBy: { arrivalDate: "asc" },
  });

  const recentActivity = await prisma.auditLog.findMany({
    where: {
      organizationId: tenant.organizationId,
      action: {
        in: [
          "LOGISTICS_EVENT_CREATED",
          "LOGISTICS_EVENT_UPDATED",
          "LOGISTICS_EVENT_CONFIRMED",
          "LOGISTICS_EVENT_DELETED",
        ],
      },
    },
    include: {
      User: {
        select: {
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <>
      <div className="hero-section" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: "900",
            textTransform: "uppercase",
          }}
        >
          <Truck size={20} strokeWidth={3} />
          {labels("logistics.department")}
        </div>
        <h1 style={{ marginBottom: "0.5rem" }}>{labels("logistics.title")}</h1>
        <p style={{ color: "var(--pitch-black)", fontSize: "1.1rem", margin: 0 }}>
          {labels("logistics.description")}
        </p>
      </div>

      <LogisticsDashboard
        pendingCandidates={pendingCandidates}
        weeklyEvents={weeklyEvents as ComponentProps<typeof LogisticsDashboard>["weeklyEvents"]}
        recentActivity={recentActivity as ComponentProps<typeof LogisticsDashboard>["recentActivity"]}
        canViewActivityActors={canViewCandidateAudit(tenant.role)}
        language={language}
      />
    </>
  );
}
