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
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <div className="dashboard-grid">
        <StatCard
          icon={<UserCheck size={28} strokeWidth={2.5} />}
          iconBg="var(--primary)"
          value={String(candidatesWithoutLogistics.length)}
          label={labels("logistics.metricNoLogistics")}
        />
        <StatCard
          icon={<Truck size={28} strokeWidth={2.5} color="var(--primary)" />}
          iconBg="var(--pitch-black)"
          value={String(weeklyEvents.length)}
          label={labels("logistics.metricWeeklyArrivals")}
        />
        <StatCard
          icon={<CheckCircle size={28} strokeWidth={2.5} color="#4ade80" />}
          iconBg="var(--pitch-black)"
          value={String(confirmedCount)}
          label={labels("logistics.metricConfirmed")}
          cardBg="#4ade80"
          labelColor="var(--pitch-black)"
        />
        <StatCard
          icon={<AlertTriangle size={28} strokeWidth={2.5} color="white" />}
          iconBg="#e63946"
          value={String(pendingConfirm)}
          label={labels("logistics.metricPendingConfirm")}
          cardBg={pendingConfirm > 0 ? "#ffccd5" : "var(--background)"}
        />
      </div>

      <div className="dashboard-grid" style={{ marginTop: "-1rem" }}>
        <MiniMetric
          title={labels("logistics.metricApprovedClean")}
          value={String(candidatesReadyNow.length)}
          helper={labels("logistics.helperNoDocsBlocks")}
        />
        <MiniMetric
          title={labels("logistics.metricOperationalFollowUp")}
          value={String(candidatesWithFollowUp.length)}
          helper={labels("logistics.helperPendingLegal")}
          backgroundColor={candidatesWithFollowUp.length > 0 ? "#fef3c7" : "var(--background)"}
        />
        <MiniMetric
          title={labels("logistics.metricReadyForArrival")}
          value={String(readyForArrivalCount)}
          helper={labels("logistics.helperResolvedHandoff")}
          backgroundColor={readyForArrivalCount > 0 ? "#dcfce7" : "var(--background)"}
        />
        <MiniMetric
          title={labels("logistics.metricIncompleteHandoff")}
          value={String(missingAccommodationCount + missingPickupCount)}
          helper={labels("logistics.helperMissingPickup")
            .replace("{accommodation}", String(missingAccommodationCount))
            .replace("{pickup}", String(missingPickupCount))}
          backgroundColor={missingAccommodationCount > 0 || missingPickupCount > 0 ? "#fee2e2" : "var(--background)"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2.5rem", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          <section>
            <SectionTitle title={labels("logistics.weeklyTitle")} />
            <WeeklyArrivals events={weeklyEvents} language={language} />
          </section>

          <section>
            <SectionTitle title={labels("logistics.approvedTitle")} />
            <div className="table-container">
              <table>
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
                      <td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)", fontWeight: "bold", fontSize: "0.875rem" }}>
                        {labels("logistics.noApprovedCandidates")}
                      </td>
                    </tr>
                  ) : (
                    visibleCandidateSummaries.map(({ candidate, legalOutcome, arrivalReadiness, operationalAlerts }) => (
                      <tr key={candidate.id}>
                        <td style={{ fontWeight: "900" }}>{candidate.firstName} {candidate.lastName}</td>
                        <td style={{ fontWeight: "bold" }}>{candidate.country}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            <span
                              className="status-badge"
                              style={{
                                fontSize: "0.65rem",
                                width: "fit-content",
                                backgroundColor: getReadinessBadgeBackground(arrivalReadiness),
                                color: getReadinessBadgeColor(arrivalReadiness),
                              }}
                            >
                              {arrivalReadiness.statusLabel.toUpperCase()}
                            </span>
                            {arrivalReadiness.blockers.length > 0 ? (
                              <ExpandableText maxLength={80} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#991b1b" }}>
                                {arrivalReadiness.blockers.join(" | ")}
                              </ExpandableText>
                            ) : null}
                            {legalOutcome?.category ? (
                              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#4338ca" }}>
                                {legalOutcome.category}
                              </span>
                            ) : null}
                            {legalOutcome?.followUpActions.length ? (
                              <ExpandableText maxLength={90} style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)" }}>
                                {legalOutcome.followUpActions.join(" · ")}
                              </ExpandableText>
                            ) : null}
                            {operationalAlerts.length > 0 ? (
                              <ExpandableText maxLength={90} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#92400e" }}>
                                {operationalAlerts.map((alert) => alert.title).join(" · ")}
                              </ExpandableText>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <Link
                              href={`/candidatos/${candidate.id}`}
                              className="button button-secondary"
                              style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
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

        <aside>
          <LogisticsEventForm candidates={pendingCandidates} />
          <div className="card" style={{ marginTop: "1.5rem", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1rem" }}>
              {labels("logistics.recentActivity")}
            </div>
            {recentActivity.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 700 }}>
                {labels("logistics.noRecentChanges")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                {visibleActivity.map((entry) => (
                  <div key={entry.id} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.25rem" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase" }}>
                        {getActivityLabel(entry.action, labels)}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: es })}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--pitch-black)" }}>
                      {getActivitySummary(entry, labels)}
                    </div>
                    {canViewActivityActors ? (
                      <div style={{ marginTop: "0.2rem", fontSize: "0.74rem", color: "var(--muted)" }}>
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
    <div className="pagination-bar" style={{ marginTop: compact ? "1rem" : "0.75rem", padding: compact ? "0.7rem" : undefined }}>
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
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
      <h2 style={{ whiteSpace: "nowrap", fontSize: "1.75rem", fontWeight: "900", textTransform: "uppercase" }}>{title}</h2>
      <div style={{ flex: 1, height: "2px", backgroundColor: "var(--pitch-black)" }} />
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
  cardBg = "var(--background)",
  labelColor = "var(--muted)",
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  cardBg?: string;
  labelColor?: string;
}) {
  return (
    <div className="card logistics-stat-card" style={{ backgroundColor: cardBg }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          backgroundColor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid var(--pitch-black)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.75rem", fontWeight: "900", textTransform: "uppercase", color: labelColor, marginTop: "0.25rem" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  title,
  value,
  helper,
  backgroundColor = "var(--background)",
}: {
  title: string;
  value: string;
  helper: string;
  backgroundColor?: string;
}) {
  return (
    <div className="card logistics-mini-card" style={{ backgroundColor }}>
      <div style={{ fontSize: "0.75rem", fontWeight: "900", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.35rem" }}>
        {title}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: "900", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--muted)", marginTop: "0.35rem" }}>{helper}</div>
    </div>
  );
}

function getReadinessBadgeBackground(readiness: ReturnType<typeof getArrivalReadiness>) {
  if (readiness.isReadyForArrival) return "#dcfce7";
  if (!readiness.accommodationAssigned || !readiness.pickupAssigned) return "#fee2e2";
  if (readiness.legalFollowUpOpen || !readiness.arrivalNotesPresent) return "#fef3c7";
  return "#dbeafe";
}

function getReadinessBadgeColor(readiness: ReturnType<typeof getArrivalReadiness>) {
  if (readiness.isReadyForArrival) return "#166534";
  if (!readiness.accommodationAssigned || !readiness.pickupAssigned) return "#991b1b";
  if (readiness.legalFollowUpOpen || !readiness.arrivalNotesPresent) return "#92400e";
  return "#1d4ed8";
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
