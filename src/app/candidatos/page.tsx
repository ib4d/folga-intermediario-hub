import { prisma } from "@/lib/prisma";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";

export default async function CandidatosPage() {
  const candidates = await prisma.candidate.findMany({
    include: {
      intermediary: true,
      documents: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <>
      <div className="hero-section" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Candidatos</h1>
            <p>Gestión completa de candidatos y sus estados legales.</p>
          </div>
          <Link href="/candidatos/nuevo" className="button" style={{ backgroundColor: 'var(--pitch-black)', color: 'var(--amber-flame)' }}>
            <PlusCircle size={20} />
            Añadir Candidato
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Buscar por nombre, documento, país..." 
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Candidato</th>
              <th>País</th>
              <th>Documentos</th>
              <th>Intermediario</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                  No hay candidatos registrados todavía.
                </td>
              </tr>
            ) : (
              candidates.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{c.firstName} {c.lastName}</div>
                    {c.phone && <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{c.phone}</div>}
                  </td>
                  <td>{c.country}</td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>
                      {c.documents.length} subidos
                    </div>
                  </td>
                  <td>{c.intermediary.name}</td>
                  <td>
                    <span className={`status-badge ${c.status === 'APROBADO' ? 'active' : ''} ${c.status === 'RECHAZADO' ? 'danger' : ''}`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <Link href={`/candidatos/${c.id}`} className="button button-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                      Ver Detalles
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
