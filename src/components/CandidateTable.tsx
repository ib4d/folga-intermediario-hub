"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Loader2, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteCandidate, deleteCandidatesBulk } from "@/app/actions/candidates";
import CopyRegistrationLink from "@/components/CopyRegistrationLink";
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
  return fullName || "Sin nombre";
}

export default function CandidateTable({
  candidates,
  pageNumber,
  totalPages,
  totalCandidates,
  currentLimit,
}: {
  candidates: CandidateRow[];
  pageNumber: number;
  totalPages: number;
  totalCandidates: number;
  currentLimit: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    if (!confirm(`Eliminar a ${getCandidateName(candidate)} y todo su historial operativo?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCandidate(candidate.id);
        setSelectedIds((current) => current.filter((id) => id !== candidate.id));
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        alert(`No se pudo eliminar el candidato: ${message}`);
      }
    });
  }

  async function handleDeleteBulk() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Eliminar ${selectedIds.length} candidatos seleccionados y sus datos relacionados?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteCandidatesBulk(selectedIds);
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        alert(`No se pudo completar la eliminacion: ${message}`);
      }
    });
  }

  return (
    <div className="candidate-list-shell">
      <div className="candidate-list-summary">
        <div>
          <div className="candidate-list-count">
            {totalCandidates} candidato{totalCandidates === 1 ? "" : "s"}
          </div>
          <div className="candidate-list-subtle">
            Vista operativa densa con {currentLimit === "ALL" ? "todos" : currentLimit} por pagina.
          </div>
        </div>
        {selectedIds.length > 0 ? (
          <button
            type="button"
            className="button button-secondary"
            style={{ color: "#991b1b", borderColor: "#fca5a5", backgroundColor: "#fef2f2" }}
            onClick={handleDeleteBulk}
            disabled={isPending}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Eliminar seleccionados ({selectedIds.length})
          </button>
        ) : null}
      </div>

      <div className="table-container">
        <table className="candidate-table">
          <thead>
            <tr>
              <th style={{ width: "52px" }}>
                <button type="button" className="icon-button" onClick={toggleAll} aria-label="Seleccionar todos">
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th>Candidato</th>
              <th>Pais</th>
              <th>Docs</th>
              <th>Intermediario</th>
              <th>Estado</th>
              <th style={{ width: "300px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => toggleSelected(candidate.id)}
                    aria-label={`Seleccionar ${getCandidateName(candidate)}`}
                  >
                    {selectedIds.includes(candidate.id) ? (
                      <CheckSquare size={16} color="var(--amber-flame)" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </td>
                <td>
                  <div className="candidate-name-cell">
                    <div className="candidate-name">{getCandidateName(candidate)}</div>
                    <div className="candidate-meta">{candidate.phone || "Sin telefono"}</div>
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
                      Ver
                    </Link>
                    {!candidate.selfRegistered ? (
                      <CopyRegistrationLink
                        candidateId={candidate.registrationToken ? undefined : candidate.id}
                        token={candidate.registrationToken ?? undefined}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="button button-outline candidate-action-button danger"
                      onClick={() => handleDeleteSingle(candidate)}
                      disabled={isPending}
                    >
                      <Trash2 size={15} />
                      Eliminar
                    </button>
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
              Primera
            </button>
            <button type="button" className="button button-outline" onClick={() => setPage(pageNumber - 1)} disabled={pageNumber <= 1 || isPending}>
              <ChevronLeft size={16} />
              Anterior
            </button>
            <button type="button" className="button button-outline" onClick={() => setPage(pageNumber + 1)} disabled={pageNumber >= totalPages || isPending}>
              Siguiente
              <ChevronRight size={16} />
            </button>
            <button type="button" className="button button-outline" onClick={() => setPage(totalPages)} disabled={pageNumber >= totalPages || isPending}>
              Ultima
              <ChevronsRight size={16} />
            </button>
          </div>

          <div className="candidate-pagination-meta">
            <span className="candidate-list-subtle">
              Pagina {pageNumber} de {totalPages}
            </span>
            <select
              className="select"
              value={String(pageNumber)}
              onChange={(event) => setPage(Number(event.target.value))}
              style={{ width: "160px" }}
            >
              {pageOptions.map((page) => (
                <option key={page} value={page}>
                  Ir a pagina {page}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
