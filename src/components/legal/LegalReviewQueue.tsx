"use client";

import { Candidate, Document, User } from "@prisma/client";
import { AlertTriangle, LayoutGrid, List, Search, ShieldAlert, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getCandidateDocumentChecklist } from "@/lib/document-checklist";
import PaginatedList from "@/components/ui/PaginatedList";
import LegalCandidateCard from "./LegalCandidateCard";

interface Props {
  initialCandidates: (Candidate & {
    documents: Document[];
    intermediary: User;
  })[];
}

type QueueFilter = "all" | "ready" | "blocked" | "expiring" | "duplicates";
type QueueSort = "priority" | "updated" | "name";

export default function LegalReviewQueue({ initialCandidates }: Props) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="card" style={{ padding: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
          <Search
            size={20}
            strokeWidth={2.5}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--pitch-black)" }}
          />
          <input
            type="text"
            placeholder="BUSCAR POR NOMBRE, PASAPORTE, KARTA O PESEL..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input"
            style={{ paddingLeft: "2.75rem", fontWeight: "bold", fontSize: "0.8rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <FilterChip
            label={`Todos (${filterCounts.all})`}
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          />
          <FilterChip
            label={`Listos (${filterCounts.ready})`}
            active={activeFilter === "ready"}
            onClick={() => setActiveFilter("ready")}
            tone="success"
          />
          <FilterChip
            label={`Bloqueados (${filterCounts.blocked})`}
            active={activeFilter === "blocked"}
            onClick={() => setActiveFilter("blocked")}
            tone="danger"
          />
          <FilterChip
            label={`Por vencer (${filterCounts.expiring})`}
            active={activeFilter === "expiring"}
            onClick={() => setActiveFilter("expiring")}
            tone="warning"
          />
          <FilterChip
            label={`Duplicados (${filterCounts.duplicates})`}
            active={activeFilter === "duplicates"}
            onClick={() => setActiveFilter("duplicates")}
          />
        </div>

        <div className="input-group" style={{ marginBottom: 0, width: "190px" }}>
          <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value as QueueSort)}>
            <option value="priority">Ordenar por prioridad</option>
            <option value="updated">Ultima actualizacion</option>
            <option value="name">Nombre</option>
          </select>
        </div>

        <div style={{ display: "flex", border: "2px solid var(--pitch-black)", overflow: "hidden" }}>
          <button
            onClick={() => setView("grid")}
            style={{
              padding: "0.5rem 0.75rem",
              backgroundColor: view === "grid" ? "var(--primary)" : "var(--background)",
              border: "none",
              borderRight: "2px solid var(--pitch-black)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <LayoutGrid size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "0.5rem 0.75rem",
              backgroundColor: view === "list" ? "var(--primary)" : "var(--background)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <List size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: "var(--white-smoke)",
              border: "2px solid var(--pitch-black)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <Search size={32} strokeWidth={2.5} />
          </div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "900", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            NO HAY CANDIDATOS EN ESTE CORTE
          </h3>
          <p style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "0.875rem" }}>
            AJUSTE FILTROS O BUSQUEDA PARA VER OTROS CASOS.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <QueueSummary icon={<ShieldAlert size={16} />} label="Bloqueados" value={String(filterCounts.blocked)} tone="danger" />
            <QueueSummary icon={<TimerReset size={16} />} label="Por vencer" value={String(filterCounts.expiring)} tone="warning" />
            <QueueSummary icon={<AlertTriangle size={16} />} label="Duplicados" value={String(filterCounts.duplicates)} tone="neutral" />
          </div>

          <PaginatedList
            items={filteredCandidates}
            pageSize={view === "grid" ? 6 : 8}
            label="Revision legal"
            className={view === "grid" ? "equal-card-grid" : undefined}
            style={{
              display: "grid",
              gridTemplateColumns: view === "grid" ? "repeat(auto-fill, minmax(320px, 1fr))" : "1fr",
              gap: "1.5rem",
            }}
            renderItem={(row) => <LegalCandidateCard key={row.candidate.id} candidate={row.candidate} />}
          />
        </>
      )}
    </div>
  );
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
  const palette =
    tone === "success"
      ? { activeBg: "#d1fae5", activeColor: "#065f46" }
      : tone === "warning"
        ? { activeBg: "#fef3c7", activeColor: "#92400e" }
        : tone === "danger"
          ? { activeBg: "#fee2e2", activeColor: "#991b1b" }
          : { activeBg: "var(--primary)", activeColor: "var(--pitch-black)" };

  return (
    <button
      onClick={onClick}
      style={{
        border: "2px solid var(--pitch-black)",
        backgroundColor: active ? palette.activeBg : "var(--background)",
        color: active ? palette.activeColor : "var(--foreground)",
        fontWeight: 900,
        fontSize: "0.72rem",
        textTransform: "uppercase",
        padding: "0.55rem 0.75rem",
        cursor: "pointer",
      }}
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
  const backgroundColor =
    tone === "danger" ? "#fee2e2" : tone === "warning" ? "#fef3c7" : "var(--white-smoke)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.8rem 1rem",
        backgroundColor,
        border: "2px solid var(--pitch-black)",
      }}
    >
      {icon}
      <div>
        <div style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 900 }}>{value}</div>
      </div>
    </div>
  );
}
