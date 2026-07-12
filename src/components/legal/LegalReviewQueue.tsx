"use client";

import { Candidate, Document, Role, User } from "@prisma/client";
import { AlertTriangle, LayoutGrid, List, Search, ShieldAlert, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import { type AppLanguage, t } from "@/lib/i18n";
import PaginatedList from "@/components/ui/PaginatedList";
import LegalCandidateCard from "./LegalCandidateCard";

interface Props {
  initialCandidates: (Candidate & {
    documents: Document[];
    intermediary: User;
  })[];
  viewerRole: Role;
  language: AppLanguage;
}

type QueueFilter = "all" | "ready" | "blocked" | "expiring" | "duplicates";
type QueueSort = "priority" | "updated" | "name";
type DuplicateQueueItem = {
  candidateId: string;
  candidateName: string;
  country: string | null;
  duplicateCount: number;
  groups: string[];
  groupCounts: Array<{ count: number }>;
  blockers: number;
  warnings: number;
};

export default function LegalReviewQueue({ initialCandidates, viewerRole, language }: Props) {
  const labels = t.bind(null, language);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("all");
  const [sortBy, setSortBy] = useState<QueueSort>("priority");

  const candidateRows = useMemo(
    () =>
      initialCandidates.map((candidate) => {
        const checklist = getCandidateDocumentChecklist(candidate);
        return {
          candidate,
          checklist,
          isExpiring: checklist.stats.expiringSoonDocuments > 0,
          hasDuplicates: checklist.stats.duplicateGroups > 0,
        };
      }),
    [initialCandidates],
  );

  const filterCounts = useMemo(
    () => ({
      all: candidateRows.length,
      ready: candidateRows.filter((row) => row.checklist.isReadyForLegal).length,
      blocked: candidateRows.filter((row) => !row.checklist.isReadyForLegal).length,
      expiring: candidateRows.filter((row) => row.isExpiring).length,
      duplicates: candidateRows.filter((row) => row.hasDuplicates).length,
    }),
    [candidateRows],
  );

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const visibleRows = candidateRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        `${row.candidate.firstName ?? ""} ${row.candidate.lastName ?? ""}`.toLowerCase().includes(normalizedSearch) ||
        row.candidate.passportNumber?.toLowerCase().includes(normalizedSearch) ||
        row.candidate.kartaPobytuNumber?.toLowerCase().includes(normalizedSearch) ||
        row.candidate.peselNumber?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;

      if (activeFilter === "ready") return row.checklist.isReadyForLegal;
      if (activeFilter === "blocked") return !row.checklist.isReadyForLegal;
      if (activeFilter === "expiring") return row.isExpiring;
      if (activeFilter === "duplicates") return row.hasDuplicates;
      return true;
    });

    const sortedRows = [...visibleRows].sort((a, b) => {
      if (sortBy === "name") {
        return `${a.candidate.firstName ?? ""} ${a.candidate.lastName ?? ""}`.localeCompare(
          `${b.candidate.firstName ?? ""} ${b.candidate.lastName ?? ""}`,
        );
      }

      if (sortBy === "updated") {
        return new Date(b.candidate.updatedAt).getTime() - new Date(a.candidate.updatedAt).getTime();
      }

      const score = (row: (typeof visibleRows)[number]) => {
        let total = 0;
        if (!row.checklist.isReadyForLegal) total += 100;
        total += row.checklist.blockers.length * 20;
        total += row.checklist.stats.pendingReviewDocuments * 8;
        total += row.checklist.stats.expiringSoonDocuments * 12;
        total += row.checklist.stats.duplicateGroups * 10;
        total += row.checklist.warnings.length * 3;
        return total;
      };

      return score(b) - score(a) || new Date(b.candidate.updatedAt).getTime() - new Date(a.candidate.updatedAt).getTime();
    });

    return sortedRows;
  }, [activeFilter, candidateRows, search, sortBy]);

  const duplicatePriorityRows = useMemo(
    () =>
      [...candidateRows]
        .filter((row) => row.hasDuplicates)
        .sort((a, b) => {
          const duplicateScore = (row: (typeof candidateRows)[number]) =>
            row.checklist.duplicates.reduce((total, group) => total + group.count, 0) +
            row.checklist.blockers.length * 2 +
            row.checklist.warnings.length;

          return duplicateScore(b) - duplicateScore(a) || new Date(b.candidate.updatedAt).getTime() - new Date(a.candidate.updatedAt).getTime();
        })
        .slice(0, 4),
    [candidateRows],
  );

  const duplicateQueueItems = useMemo<DuplicateQueueItem[]>(
    () =>
      [...candidateRows]
        .filter((row) => row.hasDuplicates)
        .map((row) => ({
          candidateId: row.candidate.id,
          candidateName: `${row.candidate.firstName ?? ""} ${row.candidate.lastName ?? ""}`.trim() || "N/A",
          country: row.candidate.country,
          duplicateCount: row.checklist.duplicates.reduce((total, group) => total + group.count, 0),
          groups: row.checklist.duplicates.map((group) => `${group.type}${group.number ? ` (${group.number})` : ""} x${group.count}`),
          groupCounts: row.checklist.duplicates.map((group) => ({ count: group.count })),
          blockers: row.checklist.blockers.length,
          warnings: row.checklist.warnings.length,
        }))
        .sort((a, b) => b.duplicateCount - a.duplicateCount || b.blockers - a.blockers || b.warnings - a.warnings),
    [candidateRows],
  );

  return (
    <div className="module-page-shell legal-queue-shell">
      <div className="card module-panel module-toolbar">
        <div className="legal-queue-toolbar-search">
          <Search
            size={20}
            strokeWidth={2.5}
            className="legal-queue-toolbar-search-icon"
          />
          <input
            type="text"
            aria-label={labels("legal.searchPlaceholder")}
            placeholder={labels("legal.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input legal-queue-toolbar-search-input"
          />
        </div>

        <div className="module-toolbar-actions">
          <FilterChip
            label={`${labels("legal.filterAll")} (${filterCounts.all})`}
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          />
          <FilterChip
            label={`${labels("legal.filterReady")} (${filterCounts.ready})`}
            active={activeFilter === "ready"}
            onClick={() => setActiveFilter("ready")}
            tone="success"
          />
          <FilterChip
            label={`${labels("legal.filterBlocked")} (${filterCounts.blocked})`}
            active={activeFilter === "blocked"}
            onClick={() => setActiveFilter("blocked")}
            tone="danger"
          />
          <FilterChip
            label={`${labels("legal.filterExpiring")} (${filterCounts.expiring})`}
            active={activeFilter === "expiring"}
            onClick={() => setActiveFilter("expiring")}
            tone="warning"
          />
          <FilterChip
            label={`${labels("legal.filterDuplicates")} (${filterCounts.duplicates})`}
            active={activeFilter === "duplicates"}
            onClick={() => setActiveFilter("duplicates")}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setActiveFilter("all");
            setSortBy("priority");
            setView("grid");
          }}
          className="button button-secondary legal-queue-toolbar-reset"
        >
          Limpiar filtros
        </button>

        <div className="input-group legal-queue-toolbar-sort">
          <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value as QueueSort)}>
            <option value="priority">{labels("legal.sortPriority")}</option>
            <option value="updated">{labels("legal.sortUpdated")}</option>
            <option value="name">{labels("legal.sortName")}</option>
          </select>
        </div>

        <div className="legal-queue-toolbar-toggle">
          <button
            type="button"
            aria-label="Vista en cuadrícula"
            title="Vista en cuadrícula"
            onClick={() => setView("grid")}
            data-active={view === "grid"}
            className="legal-queue-toolbar-toggle-button legal-queue-toggle-icon legal-queue-toggle"
          >
            <LayoutGrid size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Vista en lista"
            title="Vista en lista"
            onClick={() => setView("list")}
            data-active={view === "list"}
            className="legal-queue-toolbar-toggle-button legal-queue-toggle-icon legal-queue-toggle"
          >
            <List size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="card module-empty-state">
          <div className="module-empty-graphic">
            <Search size={32} strokeWidth={2.5} />
          </div>
          <h3 className="legal-queue-empty-title">
            {labels("legal.emptyTitle")}
          </h3>
          <p className="legal-queue-empty-description">
            {labels("legal.emptyDescription")}
          </p>
        </div>
      ) : (
        <>
          {duplicatePriorityRows.length > 0 ? (
            <div className="card module-panel legal-queue-panel">
              <div className="legal-queue-section-header">
                <div>
                  <div className="legal-queue-section-title">
                    <AlertTriangle size={16} strokeWidth={2.75} />
                    {labels("legal.duplicateQueueTitle")}
                  </div>
                  <p className="legal-queue-section-description">
                    {labels("legal.duplicateQueueDescription")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFilter("duplicates")}
                  className="button button-secondary legal-queue-section-button"
                >
                  {labels("legal.focusDuplicates")}
                </button>
              </div>

              <div className="equal-card-grid legal-queue-grid">
                {duplicatePriorityRows.map((row) => (
                  <div key={row.candidate.id} className="card equal-card legal-queue-card">
                    <div className="legal-queue-card-header">
                      <div>
                        <div className="legal-queue-card-title">
                          {row.candidate.firstName} {row.candidate.lastName}
                        </div>
                        <div className="legal-queue-card-meta">
                          {row.candidate.country} · {row.checklist.stats.duplicateGroups} {labels("legal.summaryDuplicates").toLowerCase()}
                        </div>
                      </div>
                      <span
                        className={`legal-queue-card-badge ${
                          row.checklist.blockers.length > 0
                            ? "legal-queue-card-badge--danger"
                            : "legal-queue-card-badge--warning"
                        }`}
                      >
                        {labels("legal.duplicatePriorityBadge")}
                      </span>
                    </div>

                    <div className="legal-queue-card-summary legal-queue-card-summary--compact">
                      {row.checklist.duplicates
                        .slice(0, 3)
                        .map((group) => `${group.type}${group.number ? ` (${group.number})` : ""} x${group.count}`)
                        .join(" · ")}
                    </div>

                    <div className="legal-queue-card-action">
                      {labels("legal.duplicateSuggestedAction")}: {getDuplicateSuggestion(row.checklist.duplicates, labels)}
                    </div>

                    <div className="legal-queue-card-footer">
                      <div className="legal-queue-card-action">
                        {row.checklist.blockers.length > 0
                          ? `${row.checklist.blockers.length} ${labels("legal.blocked").toLowerCase()}`
                          : labels("legal.filterReady")}
                      </div>
                      <Link href={`/candidatos/${row.candidate.id}`} className="button button-secondary legal-queue-card-footer-button">
                        {labels("legal.openCandidate")}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {duplicateQueueItems.length > 0 ? (
            <div className="card module-panel legal-queue-panel">
              <div className="legal-queue-section-header">
                <div>
                  <div className="legal-queue-section-title">
                    <AlertTriangle size={16} strokeWidth={2.75} />
                    {labels("legal.duplicateWorkbenchTitle")}
                  </div>
                  <p className="legal-queue-section-description">
                    {labels("legal.duplicateWorkbenchDescription")}
                  </p>
                </div>
              </div>

              <PaginatedList
                items={duplicateQueueItems}
                pageSize={4}
                label={labels("legal.duplicateWorkbenchPagination")}
                className="equal-card-grid legal-duplicate-grid legal-queue-grid legal-queue-grid--workbench"
                renderItem={(item) => (
                  <div key={item.candidateId} className="card equal-card legal-queue-card">
                    <div className="legal-queue-card-header">
                      <div>
                        <div className="legal-queue-card-title">
                          {item.candidateName}
                        </div>
                        <div className="legal-queue-card-meta">
                          {item.country ?? "N/A"} · {item.groups.length} {labels("legal.summaryDuplicates").toLowerCase()}
                        </div>
                      </div>
                      <span className="status-badge legal-queue-card-badge legal-queue-card-badge--warning">
                        {labels("legal.duplicateWorkbenchBadge")}
                      </span>
                    </div>

                    <div className="legal-queue-card-summary legal-queue-card-summary--workbench">
                      {item.groups.slice(0, 4).join(" · ")}
                    </div>

                    <div className="legal-queue-card-action">
                      {labels("legal.duplicateSuggestedAction")}: {getDuplicateSuggestion(item.groupCounts, labels)}
                    </div>

                    <div className="legal-queue-card-footer">
                      <div className="legal-queue-card-action">
                        {item.blockers > 0
                          ? `${item.blockers} ${labels("legal.blocked").toLowerCase()}`
                          : item.warnings > 0
                            ? `${item.warnings} ${labels("candidateDetail.warnings").toLowerCase()}`
                            : labels("legal.filterReady")}
                      </div>
                      <Link href={`/candidatos/${item.candidateId}`} className="button button-secondary legal-queue-card-footer-button">
                        {labels("legal.openCandidate")}
                      </Link>
                    </div>
                  </div>
                )}
              />
            </div>
          ) : null}

          <div className="legal-queue-summary-list">
            <QueueSummary icon={<ShieldAlert size={16} />} label={labels("legal.summaryBlocked")} value={String(filterCounts.blocked)} tone="danger" />
            <QueueSummary icon={<TimerReset size={16} />} label={labels("legal.summaryExpiring")} value={String(filterCounts.expiring)} tone="warning" />
            <QueueSummary icon={<AlertTriangle size={16} />} label={labels("legal.summaryDuplicates")} value={String(filterCounts.duplicates)} tone="neutral" />
          </div>

          <PaginatedList
            items={filteredCandidates}
            pageSize={view === "grid" ? 6 : 8}
            label={labels("legal.paginationLabel")}
            className={view === "grid" ? "equal-card-grid legal-card-grid legal-queue-grid" : "legal-list-grid"}
            renderItem={(row) => (
              <LegalCandidateCard
                key={row.candidate.id}
                candidate={row.candidate}
                viewerRole={viewerRole}
                language={language}
              />
            )}
          />
        </>
      )}
    </div>
  );
}

function getDuplicateSuggestion(
  duplicates: Array<{
    count: number;
  }>,
  labels: (key: Parameters<typeof t>[1]) => string,
) {
  const maxCount = duplicates.reduce((highest, group) => Math.max(highest, group.count), 0);
  if (maxCount <= 2) {
    return labels("legal.duplicateSuggestFrontBack");
  }

  return labels("legal.duplicateSuggestReclassify");
}

function FilterChip({
  label,
  active,
  onClick,
  tone = "neutral",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      data-tone={tone}
      className="legal-queue-chip"
    >
      {label}
    </button>
  );
}

function QueueSummary({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "neutral" | "warning" | "danger";
}) {
  return (
    <div className={`legal-queue-summary legal-queue-summary--${tone}`}>
      {icon}
      <div>
        <div className="legal-queue-summary-label">{label}</div>
        <div className="legal-queue-summary-value">{value}</div>
      </div>
    </div>
  );
}
