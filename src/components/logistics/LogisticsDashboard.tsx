"use client";

import { Candidate, Document, LogisticsEvent } from "@prisma/client";
import { AlertTriangle, CheckCircle, Truck, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useState } from "react";

import { getArrivalReadiness } from "@/lib/arrival-readiness";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { getCandidateLegalOutcome } from "@/lib/legal-outcome";
import { type AppLanguage, t } from "@/lib/i18n";
import { getCandidateOperationalAlerts } from "@/lib/operational-alerts-shared";
import MetricCard from "@/components/ui/MetricCard";
import ExpandableText from "@/components/ui/ExpandableText";

import ArrivalReadinessEditor from "./ArrivalReadinessEditor";
import LogisticsEventForm from "./LogisticsEventForm";
import WeeklyArrivals from "./WeeklyArrivals";

const CANDIDATE_PAGE_SIZE = 8;
const ACTIVITY_PAGE_SIZE = 5;

type LogisticsCandidate = Candidate & {
  documents: Document[];
  logistics: LogisticsEvent[];
};

interface Props {
  pendingCandidates: LogisticsCandidate[];
  weeklyEvents: (LogisticsEvent & { candidate: Candidate & { documents: Document[]; logistics?: LogisticsEvent[] } })[];
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, unknown> | null;
    createdAt: Date;
    User: {
      name: string | null;
      role: string;
    } | null;
  }>;
  canViewActivityActors: boolean;
  language: AppLanguage;
}

export default function LogisticsDashboard({
  pendingCandidates,
  weeklyEvents,
  recentActivity,
  canViewActivityActors,
  language,
}: Props) {
  const labels = t.bind(null, language);
  const [candidatePage, setCandidatePage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  const candidateSummaries = pendingCandidates.map((candidate) => ({
    candidate,
    checklist: getCandidateDocumentChecklist(candidate),
    legalOutcome: getCandidateLegalOutcome(candidate),
    arrivalReadiness: getArrivalReadiness(candidate),
    operationalAlerts: getCandidateOperationalAlerts(candidate),
  }));

  const candidatesWithoutLogistics = candidateSummaries.filter((entry) => entry.candidate.logistics.length === 0);
  const candidatesWithFollowUp = candidateSummaries.filter((entry) => (entry.legalOutcome?.followUpActions.length ?? 0) > 0);
  const candidatesReadyNow = candidateSummaries.filter((entry) => entry.checklist.isReadyForLegal);
  const readyForArrivalCount = candidateSummaries.filter((entry) => entry.arrivalReadiness.isReadyForArrival).length;
  const missingAccommodationCount = candidateSummaries.filter((entry) => !entry.arrivalReadiness.accommodationAssigned).length;
  const missingPickupCount = candidateSummaries.filter((entry) => !entry.arrivalReadiness.pickupAssigned).length;
  const confirmedCount = weeklyEvents.filter((event) => event.confirmed).length;
  const pendingConfirm = weeklyEvents.filter(
    (event) => !event.confirmed && event.arrivalDate && new Date(event.arrivalDate) < new Date(),
  ).length;
  const candidateTotalPages = Math.max(1, Math.ceil(candidateSummaries.length / CANDIDATE_PAGE_SIZE));
  const safeCandidatePage = Math.min(candidatePage, candidateTotalPages);
  const visibleCandidateSummaries = candidateSummaries.slice(
    (safeCandidatePage - 1) * CANDIDATE_PAGE_SIZE,
    safeCandidatePage * CANDIDATE_PAGE_SIZE,
  );
  const activityTotalPages = Math.max(1, Math.ceil(recentActivity.length / ACTIVITY_PAGE_SIZE));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const visibleActivity = recentActivity.slice(
    (safeActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    safeActivityPage * ACTIVITY_PAGE_SIZE,
  );

  return (
    <div className="logistics-shell">
      <div className="card logistics-panel">
        <div className="page-section-header logistics-page-section-header">
          <div className="page-section-copy">
            <h2 className="page-section-title logistics-page-section-title">
              {labels("logistics.title")}
            </h2>
            <p className="page-section-description">{labels("logistics.description")}</p>
          </div>
        </div>
        <div className="dashboard-grid">
          <MetricCard title={labels("logistics.metricNoLogistics")} value={candidatesWithoutLogistics.length} tone="accent" icon={<UserCheck size={18} />} />
          <MetricCard title={labels("logistics.metricWeeklyArrivals")} value={weeklyEvents.length} tone="accent" icon={<Truck size={18} />} />
          <MetricCard title={labels("logistics.metricConfirmed")} value={confirmedCount} tone="success" icon={<CheckCircle size={18} />} />
          <MetricCard title={labels("logistics.metricPendingConfirm")} value={pendingConfirm} tone={pendingConfirm > 0 ? "danger" : "default"} icon={<AlertTriangle size={18} />} />
          <MetricCard
            title="Candidatos operativos"
            value={candidateSummaries.length}
            helper="Candidatos con seguimiento logístico visible."
          />
        </div>
      </div>

      <div className="dashboard-grid">
        <MetricCard title={labels("logistics.metricApprovedClean")} value={candidatesReadyNow.length} tone="success" helper={labels("logistics.helperNoDocsBlocks")} />
        <MetricCard title={labels("logistics.metricOperationalFollowUp")} value={candidatesWithFollowUp.length} tone={candidatesWithFollowUp.length > 0 ? "accent" : "default"} helper={labels("logistics.helperPendingLegal")} />
        <MetricCard title={labels("logistics.metricReadyForArrival")} value={readyForArrivalCount} tone="success" helper={labels("logistics.helperResolvedHandoff")} />
        <MetricCard
          title={labels("logistics.metricIncompleteHandoff")}
          value={missingAccommodationCount + missingPickupCount}
          tone={missingAccommodationCount > 0 || missingPickupCount > 0 ? "danger" : "default"}
          helper={labels("logistics.helperMissingPickup")
            .replace("{accommodation}", String(missingAccommodationCount))
            .replace("{pickup}", String(missingPickupCount))}
        />
      </div>

      <div className="logistics-grid">
        <div className="logistics-stack">
          <section>
            <SectionTitle title={labels("logistics.weeklyTitle")} />
            <WeeklyArrivals events={weeklyEvents} language={language} />
          </section>

          <section>
            <SectionTitle title={labels("logistics.approvedTitle")} />
            <div className="table-container table-container--responsive">
              <table className="logistics-table">
                <thead>
                  <tr>
                    <th>{labels("logistics.tableCandidate")}</th>
                    <th>{labels("logistics.tableCountry")}</th>
                    <th>{labels("logistics.tableStatus")}</th>
                    <th>{labels("logistics.tableAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="logistics-empty-cell">
                        {labels("logistics.noApprovedCandidates")}
                      </td>
                    </tr>
                  ) : (
                    visibleCandidateSummaries.map(({ candidate, checklist, legalOutcome, arrivalReadiness, operationalAlerts }) => (
                      <tr key={candidate.id}>
                        <td className="logistics-candidate-cell logistics-candidate-cell--name">{candidate.firstName} {candidate.lastName}</td>
                        <td className="logistics-candidate-cell logistics-candidate-cell--country">{candidate.country}</td>
                        <td>
                          <div className="logistics-status-stack">
                            <span
                              className={`status-badge ${getReadinessBadgeClass(arrivalReadiness)}`}
                            >
                              {arrivalReadiness.statusLabel.toUpperCase()}
                            </span>
                            {arrivalReadiness.blockers.length > 0 ? (
                              <ExpandableText maxLength={80} className="logistics-status-note logistics-status-note--danger">
                                {arrivalReadiness.blockers.join(" | ")}
                              </ExpandableText>
                            ) : null}
                            {legalOutcome?.category ? (
                              <span className="logistics-status-note logistics-status-note--category">
                                {legalOutcome.category}
                              </span>
                            ) : null}
                            {legalOutcome?.followUpActions.length ? (
                              <ExpandableText maxLength={90} className="logistics-status-note logistics-status-note--muted">
                                {legalOutcome.followUpActions.join(" · ")}
                              </ExpandableText>
                            ) : null}
                            {operationalAlerts.length > 0 ? (
                              <ExpandableText maxLength={90} className="logistics-status-note logistics-status-note--warning">
                                {operationalAlerts.map((alert) => alert.title).join(" · ")}
                              </ExpandableText>
                            ) : null}
                            {checklist.duplicates.length > 0 ? (
                              <ExpandableText maxLength={90} className="logistics-status-note logistics-status-note--duplicate">
                                {`${labels("logistics.duplicateReviewLabel")}: ${checklist.duplicates.map((group) => `${group.type}${group.number ? ` (${group.number})` : ""} x${group.count}`).join(" · ")}`}
                              </ExpandableText>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="logistics-action-row">
                            <Link
                              href={`/candidatos/${candidate.id}`}
                              className="button button-secondary logistics-action-button"
                            >
                              {labels("logistics.viewCandidate")}
                            </Link>
                            <ArrivalReadinessEditor candidate={candidate} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              label={labels("logistics.paginationCandidates")}
              labels={labels}
              page={safeCandidatePage}
              totalPages={candidateTotalPages}
              totalItems={candidateSummaries.length}
              onPageChange={setCandidatePage}
            />
          </section>
        </div>

        <aside className="logistics-aside">
          <LogisticsEventForm candidates={pendingCandidates} />
          <div className="card logistics-activity-card">
            <div className="logistics-activity-title">
              {labels("logistics.recentActivity")}
            </div>
            {recentActivity.length === 0 ? (
              <div className="logistics-activity-empty">
                {labels("logistics.noRecentChanges")}
              </div>
            ) : (
              <div className="logistics-activity-list">
                {visibleActivity.map((entry) => (
                  <div key={entry.id} className="logistics-activity-item">
                    <div className="logistics-activity-item-header">
                      <div className="logistics-activity-item-label">
                        {getActivityLabel(entry.action, labels)}
                      </div>
                      <div className="logistics-activity-item-time">
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: es })}
                      </div>
                    </div>
                    <div className="logistics-activity-item-summary">
                      {getActivitySummary(entry, labels)}
                    </div>
                    {canViewActivityActors ? (
                      <div className="logistics-activity-item-actor">
                        {labels("logistics.activityBy")
                          .replace("{name}", entry.User?.name || labels("logistics.system"))
                          .replace("{role}", entry.User?.role || "SYSTEM")}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <PaginationControls
              label={labels("logistics.paginationActivity")}
              labels={labels}
              page={safeActivityPage}
              totalPages={activityTotalPages}
              totalItems={recentActivity.length}
              onPageChange={setActivityPage}
              compact
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PaginationControls({
  label,
  labels,
  page,
  totalPages,
  totalItems,
  onPageChange,
  compact = false,
}: {
  label: string;
  labels: (key: Parameters<typeof t>[1]) => string;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={`pagination-bar ${compact ? "pagination-bar--compact" : ""}`}>
      <div className="pagination-controls">
        <button type="button" className="button button-outline pagination-button" onClick={() => onPageChange(1)} disabled={page <= 1}>
          {labels("logistics.pageFirst")}
        </button>
        <button type="button" className="button button-outline pagination-button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
          {labels("logistics.pagePrevious")}
        </button>
        <button type="button" className="button button-outline pagination-button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
          {labels("logistics.pageNext")}
        </button>
        <button type="button" className="button button-outline pagination-button" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}>
          {labels("logistics.pageLast")}
        </button>
      </div>
      <div className="pagination-meta">
        {label}: {labels("logistics.pageMeta").replace("{page}", String(page)).replace("{total}", String(totalPages)).replace("{count}", String(totalItems))}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="page-section-header logistics-section-header">
      <h2 className="page-section-title logistics-section-title">{title}</h2>
    </div>
  );
}

function getReadinessBadgeClass(readiness: ReturnType<typeof getArrivalReadiness>) {
  if (readiness.isReadyForArrival) return "logistics-badge--success";
  if (!readiness.accommodationAssigned || !readiness.pickupAssigned) return "logistics-badge--danger";
  if (readiness.legalFollowUpOpen || !readiness.arrivalNotesPresent) return "logistics-badge--warning";
  return "logistics-badge--info";
}

function getActivityLabel(action: string, labels: (key: Parameters<typeof t>[1]) => string) {
  switch (action) {
    case "LOGISTICS_EVENT_CREATED":
      return labels("logistics.activityCreated");
    case "LOGISTICS_EVENT_UPDATED":
      return labels("logistics.activityUpdated");
    case "LOGISTICS_EVENT_CONFIRMED":
      return labels("logistics.activityConfirmed");
    case "LOGISTICS_EVENT_DELETED":
      return labels("logistics.activityDeleted");
    default:
      return action.replace(/_/g, " ");
  }
}

function getActivitySummary(entry: Props["recentActivity"][number], labels: (key: Parameters<typeof t>[1]) => string) {
  const details = entry.details && typeof entry.details === "object" ? entry.details : null;
  if (!details) {
    return labels("logistics.activityGeneric");
  }

  const transportType = typeof details.transportType === "string" ? details.transportType : null;
  const pickedUpBy = typeof details.pickedUpBy === "string" ? details.pickedUpBy : null;
  const terminal = typeof details.terminal === "string" ? details.terminal : null;
  const accommodation = typeof details.accommodation === "string" ? details.accommodation : null;

  if (entry.action === "LOGISTICS_EVENT_CREATED") {
    return labels("logistics.transportScheduled").replace("{transport}", transportType ?? "sin definir");
  }

  if (entry.action === "LOGISTICS_EVENT_CONFIRMED") {
    return labels("logistics.arrivalConfirmed");
  }

  if (entry.action === "LOGISTICS_EVENT_DELETED") {
    return labels("logistics.arrivalDeleted");
  }

  const parts = [
    terminal ? `Terminal: ${terminal}` : null,
    pickedUpBy ? `Recoge: ${pickedUpBy}` : null,
    accommodation ? `Alojamiento: ${accommodation}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : labels("logistics.updatedFields");
}
