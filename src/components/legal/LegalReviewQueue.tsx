"use client";

import { Candidate, Document, User } from "@prisma/client";
import LegalCandidateCard from "./LegalCandidateCard";
import { Search, LayoutGrid, List } from "lucide-react";
import { useState } from "react";

interface Props {
  initialCandidates: (Candidate & { 
    documents: Document[];
    intermediary: User;
  })[];
}

export default function LegalReviewQueue({ initialCandidates }: Props) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filteredCandidates = initialCandidates.filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.passportNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Search + View toggle bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={20} strokeWidth={2.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pitch-black)' }} />
          <input
            type="text"
            placeholder="BUSCAR POR NOMBRE O PASAPORTE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '2.75rem', fontWeight: 'bold', fontSize: '0.8rem' }}
          />
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', border: '2px solid var(--pitch-black)', overflow: 'hidden' }}>
          <button
            onClick={() => setView("grid")}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: view === "grid" ? 'var(--primary)' : 'var(--background)',
              border: 'none',
              borderRight: '2px solid var(--pitch-black)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LayoutGrid size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setView("list")}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: view === "list" ? 'var(--primary)' : 'var(--background)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <List size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            backgroundColor: 'var(--white-smoke)', 
            border: '2px solid var(--pitch-black)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 1.5rem' 
          }}>
            <Search size={32} strokeWidth={2.5} />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>NO HAY CANDIDATOS PENDIENTES</h3>
          <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.875rem' }}>
            TODOS LOS CANDIDATOS HAN SIDO REVISADOS O NO COINCIDEN CON LA BÚSQUEDA.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: view === "grid" ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr', 
          gap: '1.5rem' 
        }}>
          {filteredCandidates.map(c => (
            <LegalCandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
