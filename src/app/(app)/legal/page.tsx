import { Scale, Users, CheckCircle, XCircle } from "lucide-react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import LegalReviewQueue from "@/components/legal/LegalReviewQueue";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { normalizeLanguage, t } from "@/lib/i18n";
import { canMakeLegalDecision } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import type { ComponentProps } from "react";

export default async function LegalPage() {
  const session = await auth();
  if (!session || !canMakeLegalDecision(session.user.role as Role)) {
    redirect("/dashboard");
  }

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);
  const tenant = await requireTenant();

  const candidates = await prisma.candidate.findMany({
    where: {
      organizationId: tenant.organizationId,
      status: "EN_REVISION_LEGAL",
    },
    include: { documents: true, intermediary: true },
    orderBy: { updatedAt: "desc" },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const stats = await prisma.candidate.groupBy({
    by: ["status"],
    where: {
      organizationId: tenant.organizationId,
      updatedAt: { gte: startOfMonth },
    },
    _count: true,
  });

  const approvedThisMonth = stats.find((entry) => entry.status === "APROBADO")?._count || 0;
  const rejectedThisMonth = stats.find((entry) => entry.status === "RECHAZADO")?._count || 0;
  const readyForDecisionCount = candidates.filter((candidate) =>
    getCandidateDocumentChecklist(candidate as Parameters<typeof getCandidateDocumentChecklist>[0]).isReadyForLegal
  ).length;
  const blockedCount = candidates.length - readyForDecisionCount;

  return (
    <div className="module-page-shell legal-page-shell">
      <PageHeader
        eyebrow={labels("legal.department")}
        title={labels("legal.title")}
        description={labels("legal.description")}
        icon={<Scale size={20} strokeWidth={3} />}
      />

      <div className="dashboard-grid legal-stat-grid">
        <MetricCard title={labels("legal.inQueue")} value={candidates.length} tone="accent" icon={<Users size={18} />} />
        <MetricCard title={labels("legal.approvedMonth")} value={approvedThisMonth} tone="success" icon={<CheckCircle size={18} />} />
        <MetricCard title={labels("legal.rejectedMonth")} value={rejectedThisMonth} tone="danger" icon={<XCircle size={18} />} />
        <MetricCard title={labels("legal.ready")} value={readyForDecisionCount} tone="success" icon={<CheckCircle size={18} />} />
        <MetricCard title={labels("legal.blocked")} value={blockedCount} tone="danger" icon={<XCircle size={18} />} />
      </div>

      <section className="card module-panel">
        <div className="page-section-header">
          <h2 className="page-section-title">{labels("legal.pendingCandidates")}</h2>
        </div>
        <LegalReviewQueue
          initialCandidates={candidates as ComponentProps<typeof LegalReviewQueue>["initialCandidates"]}
          viewerRole={tenant.role}
          language={language}
        />
      </section>
    </div>
  );
}
