"use client";

import { Search, Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";

export default function LogisticaSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '250px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Buscar por nombre o país..." 
              style={{ paddingLeft: '2.5rem' }}
              defaultValue={searchParams.get("q")?.toString()}
              onChange={(e) => handleFilter("q", e.target.value)}
            />
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 0, width: '150px' }}>
          <select 
            className="input" 
            defaultValue={searchParams.get("limit")?.toString() || "10"}
            onChange={(e) => handleFilter("limit", e.target.value)}
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

        <button 
          className={`button ${showAdvanced ? '' : 'button-secondary'}`} 
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter size={18} /> Filtros Avanzados
        </button>
      </div>

      {showAdvanced && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--grey-olive)' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Transporte</label>
            <select className="input" defaultValue={searchParams.get("transport") || ""} onChange={(e) => handleFilter("transport", e.target.value)}>
              <option value="">Todos</option>
              <option value="AVION">Avión</option>
              <option value="TREN">Tren</option>
              <option value="COCHE_EMPRESA">Coche Empresa</option>
              <option value="PROPIO">Propio</option>
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Terminal / Estación</label>
            <input type="text" className="input" defaultValue={searchParams.get("terminal") || ""} onChange={(e) => handleFilter("terminal", e.target.value)} placeholder="Ej. Chopin" />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Responsable (Recoge)</label>
            <input type="text" className="input" defaultValue={searchParams.get("pickedUpBy") || ""} onChange={(e) => handleFilter("pickedUpBy", e.target.value)} placeholder="Ej. Juan" />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Fecha Desde</label>
            <input type="date" className="input" defaultValue={searchParams.get("dateFrom") || ""} onChange={(e) => handleFilter("dateFrom", e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ fontSize: '0.75rem' }}>Fecha Hasta</label>
            <input type="date" className="input" defaultValue={searchParams.get("dateTo") || ""} onChange={(e) => handleFilter("dateTo", e.target.value)} />
          </div>
        </div>
      )}
      
      {isPending && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Actualizando...</div>}
    </div>
  );
}
