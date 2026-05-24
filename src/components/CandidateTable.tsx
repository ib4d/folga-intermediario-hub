"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Loader2, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteCandidate, deleteCandidatesBulk } from "@/app/actions/candidates";
import CopyRegistrationLink from "@/components/CopyRegistrationLink";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/ui/StatusBadge";

type CandidateRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string;
  documentsCount: number;
  intermediaryName: string | null;
  status: string;
  selfRegistered: boolean;
  registrationToken: string | null;
};

function getCandidateName(candidate: CandidateRow) {
  const fullName = `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim();
  return fullName;
}

export default function CandidateTable({
  candidates,
  pageNumber,
  totalPages,
  totalCandidates,
  currentLimit,
  canManageCandidates,
  canViewContact,
  labels,
}: {
  candidates: CandidateRow[];
  pageNumber: number;
  totalPages: number;
  totalCandidates: number;
  currentLimit: string;
  canManageCandidates: boolean;
  canViewContact: boolean;
  labels: {
    summaryCount: string;
    summaryPluralSuffix: string;
    summaryView: string;
    summaryAll: string;
    bulkDelete: string;
    bulkDeleted: string;
    singleDeleted: string;
    deleteFailed: string;
    deleteOneFailed: string;
    selectAll: string;
    selectOne: string;
    noName: string;
    noPhone: string;
    tableCandidate: string;
    tableCountry: string;
    tableDocs: string;
    tableIntermediary: string;
    tableStatus: string;
    tableActions: string;
    view: string;
    delete: string;
    firstPage: string;
    previousPage: string;
    nextPage: string;
    lastPage: string;
    pageOf: string;
    goToPage: string;
    deleteDialogTitleSingle: string;
    deleteDialogTitleBulk: string;
    deleteDialogDescriptionBulk: string;
    deleteDialogDescriptionSingle: string;
  };
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tableMessage, setTableMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<
    | { type: "single"; candidate: CandidateRow }
    | { type: "bulk"; ids: string[] }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allSelected = candidates.length > 0 && selectedIds.length === candidates.length;
  const pageOptions = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  function setPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    if (currentLimit) params.set("limit", currentLimit);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function toggleSelected(candidateId: string) {
    setSelectedIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : candidates.map((candidate) => candidate.id));
  }

  async function handleDeleteSingle(candidate: CandidateRow) {
    setConfirmTarget({ type: "single", candidate });
  }

  async function confirmDeleteSingle(candidate: CandidateRow) {
    setConfirmTarget(null);

    startTransition(async () => {
      setTableMessage(null);
      try {
        await deleteCandidate(candidate.id);
        setSelectedIds((current) => current.filter((id) => id !== candidate.id));
        router.refresh();
        setTableMessage({ tone: "success", text: labels.singleDeleted });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        setTableMessage({ tone: "error", text: `${labels.deleteOneFailed}: ${message}` });
      }
    });
  }

  async function handleDeleteBulk() {
    if (selectedIds.length === 0) return;
    setConfirmTarget({ type: "bulk", ids: selectedIds });
  }

  async function confirmDeleteBulk(ids: string[]) {
    setConfirmTarget(null);

    startTransition(async () => {
      setTableMessage(null);
      try {
        await deleteCandidatesBulk(ids);
        setSelectedIds([]);
        router.refresh();
        setTableMessage({ tone: "success", text: labels.bulkDeleted });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        setTableMessage({ tone: "error", text: `${labels.deleteFailed}: ${message}` });
      }
    });
  }

  return (
    <div className="candidate-list-shell">
      <div className="candidate-list-summary">
        <div>
          <div className="candidate-list-count">
            {labels.summaryCount
              .replace("{count}", String(totalCandidates))
              .replace("{suffix}", totalCandidates === 1 ? "" : labels.summaryPluralSuffix)}
          </div>
          <div className="candidate-list-subtle">
            {labels.summaryView.replace("{limit}", currentLimit === "ALL" ? labels.summaryAll : currentLimit)}
          </div>
        </div>
        {canManageCandidates && selectedIds.length > 0 ? (
          <button
            type="button"
            className="button button-secondary"
            style={{ color: "#991b1b", borderColor: "#fca5a5", backgroundColor: "#fef2f2" }}
            onClick={handleDeleteBulk}
            disabled={isPending}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {labels.bulkDelete} ({selectedIds.length})
          </button>
        ) : null}
      </div>

      {tableMessage ? (
        <p className={tableMessage.tone === "success" ? "form-message-success" : "form-message-error"}>
          {tableMessage.text}
        </p>
      ) : null}

      <div className="table-container">
        <table className="candidate-table">
          <thead>
            <tr>
              {canManageCandidates ? (
                <th style={{ width: "52px" }}>
                  <button type="button" className="icon-button" onClick={toggleAll} aria-label={labels.selectAll}>
                    {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
              ) : null}
              <th>{labels.tableCandidate}</th>
              <th>{labels.tableCountry}</th>
              <th>{labels.tableDocs}</th>
              <th>{labels.tableIntermediary}</th>
              <th>{labels.tableStatus}</th>
              <th style={{ width: "270px" }}>{labels.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                {canManageCandidates ? (
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => toggleSelected(candidate.id)}
                      aria-label={`${labels.selectOne} ${getCandidateName(candidate) || labels.noName}`}
                    >
                      {selectedIds.includes(candidate.id) ? (
                        <CheckSquare size={16} color="var(--amber-flame)" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>
                ) : null}
                <td>
                  <div className="candidate-name-cell">
                    <div className="candidate-name">{getCandidateName(candidate) || labels.noName}</div>
                    {canViewContact ? <div className="candidate-meta">{candidate.phone || labels.noPhone}</div> : null}
                  </div>
                </td>
                <td>{candidate.country}</td>
                <td>{candidate.documentsCount}</td>
                <td>{candidate.intermediaryName}</td>
                <td>
                  <StatusBadge status={candidate.status} />
                </td>
                <td>
                  <div className="candidate-actions">
                    <Link href={`/candidatos/${candidate.id}`} className="button button-secondary candidate-action-button">
                      <Eye size={15} />
                      {labels.view}
                    </Link>
                    {canManageCandidates ? (
                      <button
                        type="button"
                        className="button button-outline candidate-action-button danger"
                        onClick={() => handleDeleteSingle(candidate)}
                        disabled={isPending}
                      >
                        <Trash2 size={15} />
                        {labels.delete}
                      </button>
                    ) : null}
                    {canManageCandidates && !candidate.selfRegistered ? (
                      <CopyRegistrationLink
                        candidateId={candidate.registrationToken ? undefined : candidate.id}
                        token={candidate.registrationToken ?? undefined}
                        className="candidate-action-button candidate-action-wide"
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="candidate-pagination">
          <div className="candidate-pagination-buttons">
            <button type="button" className="button button-outline" onClick={() => setPage(1)} disabled={pageNumber <= 1 || isPending}>
              <ChevronsLeft size={16} />
              {labels.firstPage}
            </button>
            <button type="button" className="button button-outline" onClick={() => setPage(pageNumber - 1)} disabled={pageNumber <= 1 || isPending}>
              <ChevronLeft size={16} />
              {labels.previousPage}
            </button>
            <button type="button" className="button button-outline" onClick={() => setPage(pageNumber + 1)} disabled={pageNumber >= totalPages || isPending}>
              {labels.nextPage}
              <ChevronRight size={16} />
            </button>
            <button type="button" className="button button-outline" onClick={() => setPage(totalPages)} disabled={pageNumber >= totalPages || isPending}>
              {labels.lastPage}
              <ChevronsRight size={16} />
            </button>
          </div>

        <div className="candidate-pagination-meta">
            <span className="candidate-list-subtle">
              {labels.pageOf.replace("{page}", String(pageNumber)).replace("{total}", String(totalPages))}
            </span>
            <select
              className="select"
              value={String(pageNumber)}
              onChange={(event) => setPage(Number(event.target.value))}
              style={{ width: "160px" }}
            >
              {pageOptions.map((page) => (
                <option key={page} value={page}>
                  {labels.goToPage.replace("{page}", String(page))}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.type === "bulk" ? labels.deleteDialogTitleBulk : labels.deleteDialogTitleSingle}
        description={
          confirmTarget?.type === "bulk"
            ? labels.deleteDialogDescriptionBulk.replace("{count}", String(confirmTarget.ids.length))
            : confirmTarget
              ? labels.deleteDialogDescriptionSingle.replace(
                  "{name}",
                  getCandidateName(confirmTarget.candidate) || labels.noName
                )
              : ""
        }
        confirmLabel={labels.delete}
        tone="danger"
        isBusy={isPending}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget?.type === "bulk") {
            void confirmDeleteBulk(confirmTarget.ids);
            return;
          }
          if (confirmTarget?.type === "single") {
            void confirmDeleteSingle(confirmTarget.candidate);
          }
        }}
      />
    </div>
  );
}
