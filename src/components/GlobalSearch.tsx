"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/candidatos?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="global-search-form">
      <div className="global-search-shell">
        <Search size={20} strokeWidth={2.5} className="global-search-icon" />
        <input
          type="text"
          className="input global-search-input"
          placeholder="BUSCAR CANDIDATOS..."
          aria-label="Buscar candidatos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </form>
  );
}
