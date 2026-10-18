import { Truck } from "lucide-react";
import { redirect } from "next/navigation";
import type { ComponentProps } from "react";

import { auth } from "@/auth";
import LogisticsDashboard from "@/components/logistics/LogisticsDashboard";
import PageHeader from "@/components/ui/PageHeader";
import { normalizeLanguage, t } from "@/lib/i18n";
import { LOGISTICS_BLOCKED_STATUSES } from "@/lib/logistics-policy";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import { getDocumentDisplayExpiry, getDocumentDisposition } from "@/lib/document-display";
import { canManageLogistics, canViewCandidateAudit } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { candidateVisibilityWhere, requireTenant } from "@/lib/tenant";

export default async function LogisticaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenant = await requireTenant();
  if (!canManageLogistics(tenant.role)) redirect("/dashboard");

  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);

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
      candidate: {
        status: { notIn: [...LOGISTICS_BLOCKED_STATUSES] },
        isArchived: false,
      },
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

  // The logistics workspace needs document readiness signals, but not source
  // files, OCR payloads, identity numbers, or public registration credentials.
  const sanitizeCandidate = <T extends (typeof pendingCandidates)[number]>(candidate: T): T => {
    const outcome = getCandidateLegalOutcome(candidate);
    const safeReviewNotes = [
      outcome?.category ? `Categoria: ${outcome.category}` : null,
      outcome?.followUpActions.length ? `Acciones: ${outcome.followUpActions.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n") || null;

    return {
      ...candidate,
      gender: null,
      dateOfBirth: null,
      birthPlace: null,
      birthCountry: null,
      citizenship: null,
      nationality: null,
      heightCm: null,
      polishAddress: candidate.polishAddress ? "DIRECCION_REGISTRADA" : null,
      polishCity: null,
      passportNumber: null,
      passportIssueDate: null,
      passportExpiry: null,
      passportBiometric: null,
      kartaPobytuNumber: candidate.kartaPobytuNumber ? "PRESENTE" : null,
      kartaPobytuIssueDate: null,
      kartaPobytuExpiry: null,
      kartaPobytuType: null,
      peselNumber: candidate.peselNumber ? "PRESENTE" : null,
      voivodatoNumber: candidate.voivodatoNumber ? "PRESENTE" : null,
      voivodatoIssueDate: null,
      voivodatoExpiry: null,
      voivodatoStatus: null,
      recruiterId: null,
      accommodationNotes: null,
      notes: null,
      // This role does not receive payment data. Do not fabricate a paid state;
      // the logistics checklist explicitly omits payment status instead.
      paid400pln: false,
      paymentDate: null,
      gdprConsent: false,
      gdprConsentDate: null,
      intermediaryId: "",
      selfRegistered: false,
      registrationToken: null,
      ocrProcessed: false,
      ocrSource: null,
      dataRetentionUntil: null,
      rejectionReason: null,
      reviewNotes: safeReviewNotes,
      score: null,
      scoreLevel: null,
      scoreUpdatedAt: null,
      documents: candidate.documents.map((document) => {
        const disposition = getDocumentDisposition(document);
        const expiryDate = getDocumentDisplayExpiry(document);

        return {
          ...document,
          number: null,
          issuerCountry: null,
          issueDate: null,
          expiryDate,
          url: "",
          extractedData: disposition ? { documentDisposition: disposition } : null,
          verifiedById: null,
        };
      }),
    } as T;
  };

  const logisticsCandidates = pendingCandidates.map(sanitizeCandidate);
  const safeWeeklyEvents = weeklyEvents.map((event) => ({
    ...event,
    candidate: sanitizeCandidate({
      ...event.candidate,
      logistics: [event],
    } as (typeof pendingCandidates)[number]),
  }));

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
    <div className="logistics-page-shell">
      <PageHeader
        eyebrow={labels("logistics.department")}
        title={labels("logistics.title")}
        description={labels("logistics.description")}
        icon={<Truck size={20} strokeWidth={3} />}
      />

      <LogisticsDashboard
        pendingCandidates={logisticsCandidates}
        weeklyEvents={safeWeeklyEvents as ComponentProps<typeof LogisticsDashboard>["weeklyEvents"]}
        recentActivity={recentActivity as ComponentProps<typeof LogisticsDashboard>["recentActivity"]}
        canViewActivityActors={canViewCandidateAudit(tenant.role)}
        language={language}
      />
    </div>
  );
}
