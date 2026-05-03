"use client";

import { Candidate, Document, User } from "@prisma/client";
import LegalCandidateCard from "./LegalCandidateCard";
import { Search, Filter, LayoutGrid, List } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o pasaporte..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md transition-all ${view === "grid" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-all ${view === "list" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
            >
              <List size={18} />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
            <Filter size={16} />
            Filtros
          </button>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No hay candidatos pendientes</h3>
          <p className="text-gray-500 max-w-xs mx-auto">
            Todos los candidatos han sido revisados o no coinciden con la búsqueda.
          </p>
        </div>
      ) : (
        <div className={view === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "flex flex-col gap-4"
        }>
          {filteredCandidates.map(c => (
            <LegalCandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
