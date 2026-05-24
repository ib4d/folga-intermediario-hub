import { Scale, Users, CheckCircle, XCircle } from "lucide-react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import LegalReviewQueue from "@/components/legal/LegalReviewQueue";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { normalizeLanguage, t } from "@/lib/i18n";
import { canMakeLegalDecision } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

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
    <>
      <div className="hero-section" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
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
              <Scale size={20} strokeWidth={3} />
              {labels("legal.department")}
            </div>
            <h1 style={{ marginBottom: "0.5rem" }}>{labels("legal.title")}</h1>
            <p style={{ color: "var(--pitch-black)", fontSize: "1.1rem", margin: 0 }}>
              {labels("legal.description")}
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <StatCard
              icon={<Users size={28} strokeWidth={2.5} />}
              value={candidates.length}
              label={labels("legal.inQueue")}
              backgroundColor="var(--pitch-black)"
              color="var(--primary)"
              shadow="4px 4px 0px rgba(255,255,255,0.3)"
            />
            <StatCard
              icon={<CheckCircle size={28} strokeWidth={2.5} />}
              value={approvedThisMonth}
              label={labels("legal.approvedMonth")}
              backgroundColor="#4ade80"
              color="var(--pitch-black)"
              shadow="4px 4px 0px rgba(0,0,0,0.3)"
            />
            <StatCard
              icon={<XCircle size={28} strokeWidth={2.5} />}
              value={rejectedThisMonth}
              label={labels("legal.rejectedMonth")}
              backgroundColor="#e63946"
              color="white"
              shadow="4px 4px 0px rgba(0,0,0,0.3)"
            />
            <StatCard
              icon={<CheckCircle size={28} strokeWidth={2.5} />}
              value={readyForDecisionCount}
              label={labels("legal.ready")}
              backgroundColor="#dbeafe"
              color="var(--pitch-black)"
              shadow="4px 4px 0px rgba(0,0,0,0.25)"
            />
            <StatCard
              icon={<XCircle size={28} strokeWidth={2.5} />}
              value={blockedCount}
              label={labels("legal.blocked")}
              backgroundColor="#fee2e2"
              color="var(--pitch-black)"
              shadow="4px 4px 0px rgba(0,0,0,0.25)"
            />
          </div>
        </div>
      </div>

      <section>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <h2 style={{ whiteSpace: "nowrap", fontWeight: "900", textTransform: "uppercase" }}>
            {labels("legal.pendingCandidates")}
          </h2>
          <div style={{ flex: 1, height: "2px", backgroundColor: "var(--pitch-black)" }} />
        </div>
        <LegalReviewQueue
          initialCandidates={candidates as React.ComponentProps<typeof LegalReviewQueue>["initialCandidates"]}
          viewerRole={tenant.role}
        />
      </section>
    </>
  );
}

function StatCard({
  icon,
  value,
  label,
  backgroundColor,
  color,
  shadow,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  backgroundColor: string;
  color: string;
  shadow: string;
}) {
  return (
    <div
      style={{
        backgroundColor,
        color,
        padding: "1rem 1.5rem",
        border: "2px solid var(--pitch-black)",
        boxShadow: shadow,
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        minWidth: "160px",
      }}
    >
      {icon}
      <div>
        <div style={{ fontSize: "2.5rem", fontWeight: "900", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.65rem", fontWeight: "900", textTransform: "uppercase", opacity: 0.7 }}>{label}</div>
      </div>
    </div>
  );
}
