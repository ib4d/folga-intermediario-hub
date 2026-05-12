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
      <div style={{ position: 'relative', width: '100%' }}>
        <Search size={20} strokeWidth={2.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pitch-black)' }} />
        <input 
          type="text" 
          className="input" 
          placeholder="BUSCAR CANDIDATOS..." 
          style={{ 
            paddingLeft: '2.75rem', 
            fontWeight: 'bold', 
            fontSize: '0.8rem',
            letterSpacing: '0.02em',
            borderWidth: '2px',
            backgroundColor: 'var(--white-smoke)'
          }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </form>
  );
}
