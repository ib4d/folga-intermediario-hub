import { auth } from "@/auth";
import AuditTimeline from "@/components/audit/AuditTimeline";
import CopyRegistrationLink from "@/components/CopyRegistrationLink";
import DeleteDocumentButton from "@/components/DeleteDocumentButton";
import DocumentReviewModal from "@/components/DocumentReviewModal";
import DocumentUploadButton from "@/components/DocumentUploadButton";
import RequestLegalReview from "@/components/RequestLegalReview";
import UpdateNotes from "@/components/UpdateNotes";
import UpdatePaymentStatus from "@/components/UpdatePaymentStatus";
import ExpandableText from "@/components/ui/ExpandableText";
import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { DOCUMENT_REVIEW_PENDING_STATUSES, getCandidateDocumentChecklist } from "@/lib/document-checklist";
import {
  formatDocumentDisplayDate,
  getDocumentDisplayExpiry,
  getDocumentDisposition,
  getDocumentDispositionLabel,
  getDocumentDisplayNumber,
  isManualReviewOcrStatus,
} from "@/lib/document-display";
import { isManualOcrMode } from "@/lib/providers/ocr";
import { parseStructuredLegalOutcome } from "@/lib/legal-outcome";
import { getCandidateOperationalAlerts } from "@/lib/operational-alerts-shared";
import { candidateAccessWhere, requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { normalizeLanguage, t } from "@/lib/i18n";
import type { ComponentProps } from "react";
import {
  canMakeLegalDecision,
  canEditCandidateNotes,
  canRequestLegalReview,
  canReviewCandidateDocuments,
  canUploadCandidateDocuments,
  canViewCandidateAudit,
  canViewCandidateContact,
  canViewCandidateLogistics,
  canViewCandidatePayment,
} from "@/lib/permissions";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  History,
  Info,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const language = normalizeLanguage(session.user.interfaceLanguage);
  const labels = t.bind(null, language);

  const tenant = await requireTenant();
  const resolvedParams = await params;

  const candidate = await prisma.candidate.findFirst({
    where: candidateAccessWhere(tenant, resolvedParams.id),
    include: {
      intermediary: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      logistics: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!candidate) notFound();

  const role = tenant.role;
  const canManageDocuments = canUploadCandidateDocuments(role);
  const canReviewDocuments = canReviewCandidateDocuments(role);
  const canRequestReview = canRequestLegalReview(role);
  const canMakeLegalDecisions = canMakeLegalDecision(role);
  const canViewContact = canViewCandidateContact(role);
  const canViewPayment = canViewCandidatePayment(role);
  const canViewLogistics = canViewCandidateLogistics(role);
  const canViewAudit = canViewCandidateAudit(role);
  const canEditNotes = canEditCandidateNotes(role);
  const auditLogs = canViewAudit
    ? await prisma.auditLog.findMany({
        where: {
          organizationId: tenant.organizationId,
          entityType: "Candidate",
          entityId: candidate.id,
        },
        include: {
          User: {
            select: { name: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];
  const documentAuditLogs =
    canViewAudit && candidate.documents.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            organizationId: tenant.organizationId,
            entityType: "Document",
            entityId: { in: candidate.documents.map((document) => document.id) },
          },
          include: {
            User: {
              select: { name: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : [];
  const documentAuditSummary = documentAuditLogs.reduce(
    (summary, log) => {
      switch (log.action) {
        case "DOCUMENT_UPLOADED":
          summary.uploads += 1;
          break;
        case "DOCUMENT_VERIFIED":
          summary.verified += 1;
          break;
        case "DOCUMENT_DELETED":
          summary.deleted += 1;
          break;
        case "OCR_EXTRACTED_PENDING_REVIEW":
        case "OCR_FAILED":
          summary.reviewPending += 1;
          break;
        case "DOCUMENT_INTEGRITY_CHECKED":
          summary.integrityChecks += 1;
          break;
        default:
          break;
      }

      return summary;
    },
    {
      uploads: 0,
      verified: 0,
      deleted: 0,
      reviewPending: 0,
      integrityChecks: 0,
    },
  );
  const latestDocumentActivity = documentAuditLogs[0] ?? null;
  const documentStateSummary = candidate.documents.reduce(
    (summary, document) => {
      summary.total += 1;
      if (document.isVerified) {
        summary.verified += 1;
      } else if (document.ocrStatus === "FAILED") {
        summary.failed += 1;
      } else if (document.ocrStatus && DOCUMENT_REVIEW_PENDING_STATUSES.has(document.ocrStatus)) {
        summary.pendingReview += 1;
      } else {
        summary.other += 1;
      }

      return summary;
    },
    {
      total: 0,
      verified: 0,
      pendingReview: 0,
      failed: 0,
      other: 0,
    },
  );

  const checklist = getCandidateDocumentChecklist(candidate as Parameters<typeof getCandidateDocumentChecklist>[0]);
  const legalOutcome = parseStructuredLegalOutcome(candidate.status === "RECHAZADO" ? candidate.rejectionReason : candidate.reviewNotes);
  const arrivalReadiness = getArrivalReadiness(candidate);
  const operationalAlerts = getCandidateOperationalAlerts(candidate as Parameters<typeof getCandidateOperationalAlerts>[0]);
  const latestLogisticsEvent = candidate.logistics[0] ?? null;

  return (
    <div className="candidate-detail-shell">
      <div className="candidate-detail-toolbar">
        <Link href="/candidatos" className="candidate-back-link">
          <ArrowLeft size={18} />
          {labels("candidateDetail.backToCandidates")}
        </Link>

        <div className="candidate-detail-actions">
          {candidate.registrationToken ? <CopyRegistrationLink token={candidate.registrationToken} /> : null}
          {role !== "LEGAL" ? (
            <Link href={`/candidatos/${candidate.id}/edit`} className="button button-secondary flex items-center gap-2">
              {labels("candidateDetail.editProfile")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="candidate-profile-hero card">
        <div
          style={{
            padding: "2rem 2rem 1.75rem",
            background:
              "linear-gradient(135deg, rgba(252, 186, 4, 0.14), rgba(255, 255, 255, 0.92))",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="candidate-hero-content">
            <div className="candidate-hero-main">
              <div className="candidate-status-row">
                <span
                  className={`status-badge ${
                    candidate.status === "APROBADO"
                      ? "active"
                      : candidate.status === "RECHAZADO"
                        ? "danger"
                        : candidate.status === "EN_REVISION_LEGAL"
                          ? "info"
                          : "warning"
                  }`}
                >
                  {candidate.status.replace(/_/g, " ")}
                </span>
                {candidate.selfRegistered ? (
                  <span className="status-badge" style={{ backgroundColor: "var(--surface)", color: "var(--pitch-black)" }}>
                    {labels("candidateDetail.selfRegistered")}
                  </span>
                ) : null}
              </div>

              <h1 className="candidate-title">
                {candidate.firstName} {candidate.lastName}
              </h1>

              <div className="candidate-meta-row" style={{ color: "var(--muted-foreground)" }}>
                <span>
                  <Info size={18} /> {candidate.country}
                </span>
                <span>
                  <FileText size={18} /> {candidate.passportNumber || labels("candidateDetail.passportMissing")}
                </span>
                {canViewContact ? (
                  <span>
                    <ClipboardList size={18} /> {candidate.phone || labels("candidateDetail.phoneMissing")}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                minWidth: "260px",
                padding: "1.25rem",
                backgroundColor: "rgba(255,255,255,0.75)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div className="candidate-owner-label" style={{ color: "var(--muted)" }}>{labels("candidateDetail.intermediary")}</div>
              <div className="candidate-owner-row">
                <div className="candidate-owner-avatar" style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}>
                  {candidate.intermediary.name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ color: "var(--pitch-black)" }}>{candidate.intermediary.name}</div>
                  <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>{candidate.intermediary.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="candidate-stat-strip">
          {canViewPayment ? (
            <div className="candidate-stat-item">
              <div
                className={`candidate-stat-icon ${
                  candidate.paid400pln ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                }`}
              >
                <DollarSign size={20} />
              </div>
              <div>
                <div className="candidate-stat-label">{labels("candidateDetail.payment400")}</div>
                <div className="font-bold">{candidate.paid400pln ? labels("candidateDetail.confirmed") : labels("candidateDetail.pending")}</div>
              </div>
            </div>
          ) : null}

          <div className="candidate-stat-item">
            <div
              className={`candidate-stat-icon ${
                checklist.isComplete ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              }`}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="candidate-stat-label">{labels("candidateDetail.documentation")}</div>
              <div className="font-bold">
                {checklist.isComplete
                  ? labels("candidateDetail.complete")
                  : labels("candidateDetail.missingCount").replace("{count}", String(checklist.missing.length))}
              </div>
            </div>
          </div>

          {canViewLogistics ? (
            <div className="candidate-stat-item">
              <div className="candidate-stat-icon bg-blue-100 text-blue-600">
                <Truck size={20} />
              </div>
              <div>
                <div className="candidate-stat-label">{labels("candidateDetail.logistics")}</div>
                <div className="font-bold">{candidate.logistics.length > 0 ? labels("candidateDetail.scheduled") : labels("candidateDetail.unassigned")}</div>
              </div>
            </div>
          ) : null}

          <div className="candidate-stat-item">
            <div className="candidate-stat-icon bg-gray-100 text-gray-600">
              <History size={20} />
            </div>
            <div>
                <div className="candidate-stat-label">{labels("candidateDetail.lastChange")}</div>
              <div className="font-bold">{new Date(candidate.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="candidate-workspace-grid">
        <div className="candidate-main-column">
          {candidate.status === "RECHAZADO" || candidate.status === "REVISION_ADICIONAL" ? (
            <div
              className={`p-6 rounded-2xl border-2 flex gap-4 ${
                candidate.status === "RECHAZADO"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <AlertTriangle className="shrink-0" size={24} />
              <div>
                <h3 className="font-black uppercase tracking-tight mb-1">
                  {candidate.status === "RECHAZADO" ? labels("candidateDetail.rejected") : labels("candidateDetail.additionalReview")}
                </h3>
                {legalOutcome?.category ? (
                  <div className="mb-3 inline-flex rounded-full border border-current/20 bg-white/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    {legalOutcome.category}
                  </div>
                ) : null}
                <p className="text-lg font-medium whitespace-pre-line">
                  {legalOutcome?.summary ?? (candidate.status === "RECHAZADO" ? candidate.rejectionReason : candidate.reviewNotes)}
                </p>
                {legalOutcome && legalOutcome.followUpActions.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {legalOutcome.followUpActions.map((action) => (
                      <span
                        key={action}
                        className="rounded-full border border-current/20 bg-white/60 px-3 py-1 text-[11px] font-bold"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="candidate-summary-grid candidate-summary-grid-primary">
            <SummaryTile
              label={labels("candidateDetail.legalReady")}
              value={checklist.isReadyForLegal ? labels("candidateDetail.yes") : labels("candidateDetail.no")}
              tone={checklist.isReadyForLegal ? "success" : "danger"}
              hint={checklist.isReadyForLegal ? labels("candidateDetail.noActiveBlocks") : `${checklist.blockers.length} ${labels("candidateDetail.blocks").toLowerCase()}`}
            />
            <SummaryTile
              label={labels("candidateDetail.pendingOcr")}
              value={String(checklist.stats.pendingReviewDocuments)}
              tone={checklist.stats.pendingReviewDocuments > 0 ? "warning" : "neutral"}
              hint={labels("candidateDetail.docsToValidate")}
            />
            <SummaryTile
              label={labels("candidateDetail.expiringSoon")}
              value={String(checklist.stats.expiringSoonDocuments)}
              tone={checklist.stats.expiringSoonDocuments > 0 ? "warning" : "neutral"}
              hint={labels("candidateDetail.expiresIn30Days")}
            />
            <SummaryTile
              label={labels("candidateDetail.duplicates")}
              value={String(checklist.stats.duplicateGroups)}
              tone={checklist.stats.duplicateGroups > 0 ? "warning" : "neutral"}
              hint={labels("candidateDetail.groupsToReview")}
            />
            <SummaryTile
              label={labels("candidateDetail.verified")}
              value={`${checklist.stats.verifiedDocuments}/${checklist.stats.totalDocuments}`}
              tone={checklist.stats.verifiedDocuments > 0 ? "success" : "neutral"}
              hint={labels("candidateDetail.confirmedDocuments")}
            />
          </div>

          {canViewLogistics ? (
            <div className="candidate-summary-grid candidate-summary-grid-secondary">
              <SummaryTile
              label={labels("candidateDetail.arrivalReady")}
              value={arrivalReadiness.isReadyForArrival ? labels("candidateDetail.yes") : labels("candidateDetail.no")}
              tone={arrivalReadiness.isReadyForArrival ? "success" : "warning"}
              hint={arrivalReadiness.statusLabel}
            />
            <SummaryTile
                label={labels("candidateDetail.transport")}
                value={arrivalReadiness.transportScheduled ? "OK" : labels("candidateDetail.missing")}
                tone={arrivalReadiness.transportScheduled ? "success" : "danger"}
                hint={candidate.logistics.length > 0 ? `${candidate.logistics.length} evento(s)` : labels("candidateDetail.noEvent")}
              />
              <SummaryTile
                label={labels("candidateDetail.pickup")}
                value={arrivalReadiness.pickupAssigned ? "OK" : labels("candidateDetail.missing")}
                tone={arrivalReadiness.pickupAssigned ? "success" : "danger"}
                hint={candidate.logistics[0]?.pickedUpBy || labels("candidateDetail.noResponsible")}
              />
              <SummaryTile
                label={labels("candidateDetail.accommodation")}
                value={arrivalReadiness.accommodationAssigned ? "OK" : labels("candidateDetail.missing")}
                tone={arrivalReadiness.accommodationAssigned ? "success" : "danger"}
                hint={candidate.accommodation || labels("candidateDetail.notAssigned")}
              />
            </div>
          ) : null}

          {canViewLogistics ? (
            <div className="candidate-section-card">
              <h2 className="candidate-section-title">
                <Truck className="text-blue-600" />
                {labels("candidateDetail.journeySummary")}
              </h2>
              <div className="candidate-info-grid">
                {[
                  { label: labels("candidateDetail.journeyState"), val: arrivalReadiness.statusLabel },
                  {
                    label: labels("candidateDetail.latestArrival"),
                    val: latestLogisticsEvent?.arrivalDate
                      ? new Date(latestLogisticsEvent.arrivalDate).toLocaleString()
                      : candidate.arrivalDate
                        ? new Date(candidate.arrivalDate).toLocaleDateString()
                        : labels("candidateDetail.noUpcomingArrival"),
                  },
                  {
                    label: labels("candidateDetail.terminal"),
                    val: latestLogisticsEvent?.terminal || labels("candidateDetail.notAvailable"),
                  },
                  {
                    label: labels("candidateDetail.reference"),
                    val: latestLogisticsEvent?.flightOrTrain || labels("candidateDetail.notAvailable"),
                  },
                  {
                    label: labels("candidateDetail.pickupResponsible"),
                    val: latestLogisticsEvent?.pickedUpBy || labels("candidateDetail.notAvailable"),
                  },
                  {
                    label: labels("candidateDetail.confirmedArrival"),
                    val: arrivalReadiness.confirmedArrival ? labels("candidateDetail.yes") : labels("candidateDetail.no"),
                  },
                  {
                    label: labels("candidateDetail.transportType"),
                    val: latestLogisticsEvent?.transportType || labels("candidateDetail.notAvailable"),
                  },
                  {
                    label: labels("candidateDetail.accommodation"),
                    val: candidate.accommodation || labels("candidateDetail.notAvailable"),
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</div>
                    <div className="font-bold text-gray-900">{item.val || labels("candidateDetail.notAvailable")}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  {labels("candidateDetail.operationalAlerts")}
                </div>
                {operationalAlerts.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm font-semibold text-amber-900">
                    {operationalAlerts.map((alert) => (
                      <li key={alert.type}>- {alert.title}: {alert.message}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 text-sm font-semibold text-green-700">
                    {labels("candidateDetail.noOperationalAlerts")}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="candidate-section-card">
            <h2 className="candidate-section-title">
              <ClipboardList className="text-blue-600" />
              {labels("candidateDetail.detailedInfo")}
            </h2>
            <div className="candidate-info-grid">
              {[
                { label: labels("candidateDetail.nationality"), val: candidate.nationality },
                { label: labels("candidateDetail.birthDate"), val: candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toLocaleDateString() : null },
                { label: labels("candidateDetail.birthPlace"), val: candidate.birthPlace },
                { label: labels("candidateDetail.passport"), val: candidate.passportNumber },
                {
                  label: labels("candidateDetail.passportBiometric"),
                  val:
                    typeof candidate.passportBiometric === "boolean"
                      ? candidate.passportBiometric
                        ? labels("candidateDetail.yes")
                        : labels("candidateDetail.no")
                      : null,
                },
                { label: labels("candidateDetail.passportExpiry"), val: candidate.passportExpiry ? new Date(candidate.passportExpiry).toLocaleDateString() : null },
                { label: labels("candidateDetail.pesel"), val: candidate.peselNumber },
                { label: labels("candidateDetail.kartaPobytu"), val: candidate.kartaPobytuNumber },
                { label: labels("candidateDetail.kartaType"), val: candidate.kartaPobytuType },
                { label: labels("candidateDetail.kartaExpiry"), val: candidate.kartaPobytuExpiry ? new Date(candidate.kartaPobytuExpiry).toLocaleDateString() : null },
                { label: labels("candidateDetail.height"), val: candidate.heightCm ? `${candidate.heightCm} cm` : null },
                { label: labels("candidateDetail.addressPl"), val: candidate.polishAddress },
                { label: labels("candidateDetail.cityPl"), val: candidate.polishCity },
                ...(canViewLogistics
                  ? [
                      { label: labels("candidateDetail.arrival"), val: candidate.arrivalDate ? new Date(candidate.arrivalDate).toLocaleDateString() : null },
                      { label: labels("candidateDetail.accommodation"), val: candidate.accommodation },
                    ]
                  : []),
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</div>
                  <div className="font-bold text-gray-900">{item.val || labels("candidateDetail.notAvailable")}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="candidate-section-card candidate-documents-card">
            <div className="candidate-section-header">
              <h2 className="candidate-section-title">
                <FileText className="text-blue-600" />
                {labels("candidateDetail.uploadedDocs")}
              </h2>
              {canManageDocuments ? (
                <DocumentUploadButton
                  candidateId={candidate.id}
                  ocrMode={isManualOcrMode() ? "manual" : "automatic"}
                />
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{labels("candidateDetail.type")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{labels("candidateDetail.number")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{labels("candidateDetail.expiry")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{labels("candidateDetail.status")}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">{labels("candidateDetail.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidate.documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                        {labels("candidateDetail.noDocs")}
                      </td>
                    </tr>
                  ) : (
                    candidate.documents.map((doc) => {
                      const dispositionLabel = getDocumentDispositionLabel(getDocumentDisposition(doc));

                      return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <div className="flex flex-col gap-1">
                            <span>{doc.type}</span>
                            {dispositionLabel ? (
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {dispositionLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">{getDocumentDisplayNumber(doc) ?? "-"}</td>
                        <td className="px-6 py-4 text-sm">{formatDocumentDisplayDate(getDocumentDisplayExpiry(doc))}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              doc.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {doc.isVerified
                              ? labels("candidateDetail.verifiedStatus")
                              : isManualReviewOcrStatus(doc.ocrStatus)
                                ? labels("candidateDetail.pending")
                                : doc.ocrStatus || labels("candidateDetail.pending")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canReviewDocuments ? (
                              <DocumentReviewModal
                                doc={{
                                  id: doc.id,
                                  type: doc.type,
                                  number: doc.number,
                                  expiryDate: doc.expiryDate,
                                  issueDate: doc.issueDate,
                                  url: doc.url,
                                  ocrStatus: doc.ocrStatus,
                                  isVerified: doc.isVerified,
                                  extractedData:
                                    doc.extractedData &&
                                    typeof doc.extractedData === "object" &&
                                    !Array.isArray(doc.extractedData)
                                      ? (doc.extractedData as Record<string, unknown>)
                                      : null,
                                }}
                                allDocuments={candidate.documents.map((candidateDoc) => ({
                                  id: candidateDoc.id,
                                  type: candidateDoc.type,
                                  number: candidateDoc.number,
                                  expiryDate: candidateDoc.expiryDate,
                                  issueDate: candidateDoc.issueDate,
                                  url: candidateDoc.url,
                                  ocrStatus: candidateDoc.ocrStatus,
                                  isVerified: candidateDoc.isVerified,
                                  extractedData:
                                    candidateDoc.extractedData &&
                                    typeof candidateDoc.extractedData === "object" &&
                                    !Array.isArray(candidateDoc.extractedData)
                                      ? (candidateDoc.extractedData as Record<string, unknown>)
                                      : null,
                                }))}
                                candidateDefaults={candidate}
                              />
                            ) : null}
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              {labels("candidateDetail.view")}
                            </a>
                            {canManageDocuments ? <DeleteDocumentButton documentId={doc.id} /> : null}
                          </div>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="candidate-side-column">
          <div className="candidate-section-card">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">{labels("candidateDetail.docStatusTitle")}</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{labels("candidateDetail.verifiedLabel")}</div>
                <div className="text-lg font-black text-gray-900">
                  {checklist.stats.verifiedDocuments}/{checklist.stats.totalDocuments}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{labels("candidateDetail.pendingOcr")}</div>
                <div className="text-lg font-black text-gray-900">{checklist.stats.pendingReviewDocuments}</div>
              </div>
            </div>
            <div className="space-y-4">
              {checklist.required.map((requiredDoc) => (
                <div key={requiredDoc} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    {checklist.verified.includes(requiredDoc as Parameters<typeof checklist.verified.includes>[0]) ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <CheckCircle2 size={14} />
                      </div>
                    ) : checklist.uploaded.includes(requiredDoc as Parameters<typeof checklist.uploaded.includes>[0]) ? (
                      <div className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center">
                        <AlertTriangle size={14} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                        <XCircle size={14} />
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-700">{requiredDoc}</span>
                  </div>
                  {!checklist.uploaded.includes(requiredDoc as Parameters<typeof checklist.uploaded.includes>[0]) ? (
                    <span className="text-[10px] font-black text-red-500 uppercase">{labels("candidateDetail.missingLabel")}</span>
                  ) : !checklist.verified.includes(requiredDoc as Parameters<typeof checklist.verified.includes>[0]) ? (
                    <span className="text-[10px] font-black text-amber-700 uppercase">{labels("candidateDetail.toVerify")}</span>
                  ) : null}
                </div>
              ))}
            </div>

            {checklist.blockers.length > 0 ? (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase">
                  <AlertTriangle size={14} /> {labels("candidateDetail.legalBlocks")}
                </div>
                <ul className="text-xs text-red-800 space-y-1">
                  {checklist.blockers.map((blocker, index) => (
                    <li key={`${blocker}-${index}`}>- {blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {checklist.warnings.length > 0 ? (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase">
                  <AlertTriangle size={14} /> {labels("candidateDetail.warnings")}
                </div>
                <ul className="text-xs text-amber-800 space-y-1">
                  {checklist.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>- {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {checklist.duplicates.length > 0 ? (
              <div className="mt-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
                <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase">
                  <AlertTriangle size={14} /> {labels("candidateDetail.duplicateReviewTitle")}
                </div>
                <p className="text-xs font-semibold text-orange-800">
                  {labels("candidateDetail.duplicateReviewDescription")}
                </p>
                <div className="space-y-2">
                  {checklist.duplicates.map((group) => (
                    <div key={group.key} className="rounded-xl border border-orange-100 bg-white/80 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                        {labels("candidateDetail.duplicateDetected")}
                      </div>
                      <ExpandableText maxLength={72} style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", fontWeight: 800, color: "#9a3412" }}>
                        {`${group.type}${group.number ? ` (${group.number})` : ""} x${group.count}`}
                      </ExpandableText>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="candidate-section-card candidate-action-card">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">{labels("candidateDetail.actionCenter")}</h3>

            {canViewLogistics ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">{labels("candidateDetail.arrivalReadiness")}</div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: arrivalReadiness.isReadyForArrival ? "#dcfce7" : "#fef3c7",
                      color: arrivalReadiness.isReadyForArrival ? "#166534" : "#92400e",
                    }}
                  >
                    {arrivalReadiness.statusLabel.toUpperCase()}
                  </span>
                  {arrivalReadiness.legalFollowUpOpen ? (
                    <span className="status-badge" style={{ backgroundColor: "#eef2ff", color: "#4338ca" }}>
                      {labels("candidateDetail.legalFollowUp").toUpperCase()}
                    </span>
                  ) : null}
                </div>
                {arrivalReadiness.blockers.length > 0 ? (
                  <div className="text-xs font-semibold text-red-700">
                    {labels("candidateDetail.blocks")}: {arrivalReadiness.blockers.join(" | ")}
                  </div>
                ) : null}
                {arrivalReadiness.warnings.length > 0 ? (
                  <div className="text-xs font-semibold text-amber-700">
                    {labels("candidateDetail.alerts")}: {arrivalReadiness.warnings.join(" | ")}
                  </div>
                ) : null}
              </div>
            ) : null}

            {canRequestReview ? (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                <h4 className="text-xs font-bold text-blue-700 uppercase">{labels("candidateDetail.legalReview")}</h4>
                <RequestLegalReview
                  candidateId={candidate.id}
                  currentStatus={candidate.status}
                  isReadyForLegal={checklist.isReadyForLegal}
                  blockers={checklist.blockers}
                  missing={checklist.missing}
                />
              </div>
            ) : null}

            {canMakeLegalDecisions ? (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase">{labels("candidateDetail.legalDecision")}</h4>
                <p className="mt-2 text-xs text-gray-500">
                  {labels("candidateDetail.legalDecisionHelp")}
                </p>
              </div>
            ) : null}

            {canViewPayment || canEditNotes ? (
              <div className="space-y-4">
                {canViewPayment ? <UpdatePaymentStatus candidateId={candidate.id} initialValue={candidate.paid400pln} /> : null}
                {canViewPayment && canEditNotes ? <div className="h-px bg-gray-100 my-4" /> : null}
                {canEditNotes ? <UpdateNotes candidateId={candidate.id} initialNotes={candidate.notes || ""} /> : null}
              </div>
            ) : null}
          </div>

          <div className="candidate-section-card">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">{labels("candidateDetail.statusHistory")}</h3>
            <div className="space-y-6">
              {candidate.statusHistory.length === 0 ? (
                <p className="text-xs text-gray-400 italic">{labels("candidateDetail.noHistory")}</p>
              ) : (
                candidate.statusHistory.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="relative pl-6 pb-6 last:pb-0">
                    {index !== Math.min(candidate.statusHistory.length, 5) - 1 ? (
                      <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-200" />
                    ) : null}
                    <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-blue-500" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900">{entry.toStatus.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-gray-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      {entry.reason ? <p className="text-xs text-gray-500">{entry.reason}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {canViewAudit ? (
            <div className="space-y-6">
              <div className="candidate-section-card">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">
                  {labels("candidateDetail.documentActivityTitle")}
                </h3>
                <p className="mb-6 text-xs text-gray-500">
                  {labels("candidateDetail.documentActivityDescription")}
                </p>
                {latestDocumentActivity ? (
                  <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                    <span className="font-black uppercase tracking-widest text-slate-400">
                      {labels("candidateDetail.latestDocumentActivityLabel")}
                    </span>
                    <div className="mt-1 font-semibold text-slate-900">
                      {latestDocumentActivity.action.replace(/_/g, " ")}
                    </div>
                    <div className="mt-1 text-slate-500">
                      {new Intl.DateTimeFormat(language === "en" ? "en-GB" : language === "pl" ? "pl-PL" : "es-ES", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(latestDocumentActivity.createdAt))}
                    </div>
                  </div>
                ) : null}
                <div className="mb-6">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {labels("candidateDetail.documentStateTitle")}
                  </div>
                  <p className="mb-4 text-xs text-slate-500">
                    {labels("candidateDetail.documentStateDescription")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {labels("candidateDetail.documentTotalLabel")}
                      </div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{documentStateSummary.total}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        {labels("candidateDetail.documentVerifiedLabel")}
                      </div>
                      <div className="mt-1 text-2xl font-black text-emerald-900">{documentStateSummary.verified}</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                        {labels("candidateDetail.documentPendingReviewLabel")}
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-900">{documentStateSummary.pendingReview}</div>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-red-600">
                        {labels("candidateDetail.documentFailedLabel")}
                      </div>
                      <div className="mt-1 text-2xl font-black text-red-900">{documentStateSummary.failed}</div>
                    </div>
                  </div>
                  {documentStateSummary.other > 0 ? (
                    <p className="mt-3 text-[11px] text-slate-500">
                      {labels("candidateDetail.documentOtherStateLabel")}: {documentStateSummary.other}
                    </p>
                  ) : null}
                </div>
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {labels("candidateDetail.documentRiskTitle")}
                  </div>
                  <p className="mt-1 text-xs text-amber-900/80">{labels("candidateDetail.documentRiskDescription")}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                        {labels("candidateDetail.documentDuplicatesLabel")}
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-900">{checklist.stats.duplicateGroups}</div>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                        {labels("candidateDetail.documentExpiringSoonLabel")}
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-900">{checklist.stats.expiringSoonDocuments}</div>
                    </div>
                  </div>
                  {checklist.duplicates.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-white/80 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                        {labels("candidateDetail.duplicateReviewTitle")}
                      </div>
                      <div className="mt-2 space-y-2">
                        {checklist.duplicates.slice(0, 3).map((group) => (
                          <div key={group.key} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <div className="font-semibold">
                              {group.type}
                              {group.number ? ` ${group.number}` : ""} x{group.count}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {checklist.warnings.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-white/80 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                        {labels("candidateDetail.warnings")}
                      </div>
                      <div className="mt-2 space-y-2">
                        {checklist.warnings.slice(0, 3).map((warning, index) => (
                          <div key={`${warning}-${index}`} className="rounded-lg border border-amber-100 bg-white px-3 py-2 text-xs text-slate-700">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <Link
                      href={`/documentos?candidateId=${candidate.id}`}
                      className="button button-secondary inline-flex items-center gap-2"
                    >
                      {labels("candidateDetail.openDocuments")}
                    </Link>
                  </div>
                  {checklist.stats.pendingReviewDocuments > 0 ? (
                    <div className="mt-3">
                      <Link
                        href={`/documentos?candidateId=${candidate.id}&status=REVIEW_REQUIRED`}
                        className="button inline-flex items-center gap-2"
                      >
                        {labels("candidateDetail.openReviewQueue")}
                      </Link>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-6">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {labels("candidateDetail.documentUploadsLabel")}
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{documentAuditSummary.uploads}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                      {labels("candidateDetail.documentVerificationsLabel")}
                    </div>
                    <div className="mt-1 text-2xl font-black text-emerald-900">{documentAuditSummary.verified}</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-red-600">
                      {labels("candidateDetail.documentDeletionsLabel")}
                    </div>
                    <div className="mt-1 text-2xl font-black text-red-900">{documentAuditSummary.deleted}</div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                      {labels("candidateDetail.documentReviewPendingLabel")}
                    </div>
                    <div className="mt-1 text-2xl font-black text-amber-900">{documentAuditSummary.reviewPending}</div>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                      {labels("candidateDetail.documentIntegrityChecksLabel")}
                    </div>
                    <div className="mt-1 text-2xl font-black text-indigo-900">{documentAuditSummary.integrityChecks}</div>
                  </div>
                </div>
                {documentAuditLogs.length > 0 ? (
                  <AuditTimeline logs={documentAuditLogs as ComponentProps<typeof AuditTimeline>["logs"]} />
                ) : (
                  <p className="text-xs text-gray-400 italic">{labels("candidateDetail.noDocumentActivity")}</p>
                )}
              </div>

              <div className="candidate-section-card">
                <AuditTimeline logs={auditLogs as ComponentProps<typeof AuditTimeline>["logs"]} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "warning" | "danger" | "success";
}) {
  return (
    <div className={`candidate-summary-tile tone-${tone}`}>
      <div className="candidate-summary-label">{label}</div>
      <div className="candidate-summary-value">{value}</div>
      <div className="candidate-summary-hint">{hint}</div>
    </div>
  );
}

