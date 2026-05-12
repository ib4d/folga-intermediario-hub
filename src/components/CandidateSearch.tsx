"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import FilterToolbar from "@/components/ui/FilterToolbar";

export default function CandidateSearch() {
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

  return (
    <FilterToolbar>
      <div style={{ position: "relative", flex: 1, minWidth: "260px", maxWidth: "600px" }}>
        <Search
          size={20}
          strokeWidth={2.5}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--pitch-black)",
          }}
        />
        <input
          type="text"
          className="input"
          placeholder="BUSCAR POR NOMBRE, DOCUMENTO, PAIS..."
          style={{ paddingLeft: "2.75rem", fontWeight: "bold", fontSize: "0.8rem" }}
          defaultValue={searchParams.get("q")?.toString()}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {isPending ? (
          <div
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.7rem",
              fontWeight: "900",
              color: "var(--muted)",
            }}
          >
            ...
          </div>
        ) : null}
      </div>
      <div style={{ width: "160px" }}>
        <select
          className="select"
          defaultValue={searchParams.get("limit")?.toString() || "20"}
          onChange={(e) => handleLimit(e.target.value)}
        >
          <option value="20">20 POR PAG.</option>
          <option value="10">10 POR PAG.</option>
          <option value="50">50 POR PAG.</option>
          <option value="100">100 POR PAG.</option>
          <option value="200">200 POR PAG.</option>
          <option value="500">500 POR PAG.</option>
          <option value="1000">1000 POR PAG.</option>
          <option value="ALL">TODOS</option>
        </select>
      </div>
    </FilterToolbar>
  );
}
