"use client";

import FilterToolbar from "@/components/ui/FilterToolbar";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function CandidateSearch({
  labels,
}: {
  labels: {
    placeholder: string;
    statusFilterLabel: string;
    statusAll: string;
    statusCollectingDocs: string;
    statusInLegalReview: string;
    statusApproved: string;
    statusRejected: string;
    statusAdditionalReview: string;
    clearFilters: string;
    option20: string;
    option10: string;
    option50: string;
    option100: string;
    option200: string;
    option500: string;
    option1000: string;
    optionAll: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleLimit(limit: string) {
    const params = new URLSearchParams(searchParams);
    params.set("limit", limit);
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleStatus(status: string) {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    params.delete("status");
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <FilterToolbar>
      <div className="candidate-search-field">
        <Search size={20} strokeWidth={2.5} className="candidate-search-icon" />
        <input
          type="text"
          className="input candidate-search-input"
          aria-label="Buscar candidatos por nombre, teléfono, país o pasaporte"
          placeholder={labels.placeholder}
          defaultValue={searchParams.get("q")?.toString()}
          onChange={(event) => handleSearch(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {isPending ? <div className="candidate-search-pending">...</div> : null}
      </div>

      <div className="candidate-search-status">
        <select
          className="select"
          aria-label={labels.statusFilterLabel}
          defaultValue={searchParams.get("status")?.toString() || ""}
          onChange={(event) => handleStatus(event.target.value)}
        >
          <option value="">{labels.statusAll}</option>
          <option value="RECOPILANDO_DOCS">{labels.statusCollectingDocs}</option>
          <option value="EN_REVISION_LEGAL">{labels.statusInLegalReview}</option>
          <option value="APROBADO">{labels.statusApproved}</option>
          <option value="RECHAZADO">{labels.statusRejected}</option>
          <option value="REVISION_ADICIONAL">{labels.statusAdditionalReview}</option>
        </select>
      </div>

      <div className="candidate-search-limit">
        <select
          className="select"
          aria-label="Resultados por página"
          defaultValue={searchParams.get("limit")?.toString() || "20"}
          onChange={(event) => handleLimit(event.target.value)}
        >
          <option value="10">{labels.option10}</option>
          <option value="20">{labels.option20}</option>
          <option value="50">{labels.option50}</option>
          <option value="100">{labels.option100}</option>
          <option value="200">{labels.option200}</option>
          <option value="500">{labels.option500}</option>
          <option value="1000">{labels.option1000}</option>
          <option value="ALL">{labels.optionAll}</option>
        </select>
      </div>

      <button type="button" className="button button-secondary" onClick={clearFilters} disabled={isPending}>
        {labels.clearFilters}
      </button>
    </FilterToolbar>
  );
}

