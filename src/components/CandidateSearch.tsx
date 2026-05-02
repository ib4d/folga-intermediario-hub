"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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
    params.set("page", "1"); // reset page on new search
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
    <div className="card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '300px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input 
            type="text" 
            className="input" 
            placeholder="Buscar por nombre, documento, país..." 
            style={{ paddingLeft: '2.5rem' }}
            defaultValue={searchParams.get("q")?.toString()}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {isPending && (
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--muted)' }}>
              Buscando...
            </div>
          )}
        </div>
      </div>
      <div className="input-group" style={{ marginBottom: 0, width: '150px' }}>
        <select 
          className="input" 
          defaultValue={searchParams.get("limit")?.toString() || "10"}
          onChange={(e) => handleLimit(e.target.value)}
        >
          <option value="10">10 por pág.</option>
          <option value="20">20 por pág.</option>
          <option value="50">50 por pág.</option>
          <option value="100">100 por pág.</option>
          <option value="200">200 por pág.</option>
          <option value="500">500 por pág.</option>
          <option value="1000">1000 por pág.</option>
          <option value="ALL">1000+ (Todos)</option>
        </select>
      </div>
    </div>
  );
}
