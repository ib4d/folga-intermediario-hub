import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import CopyRegistrationLink from "@/components/CopyRegistrationLink";
import CandidateSearch from "@/components/CandidateSearch";
import BulkImportCandidates from "@/components/BulkImportCandidates";

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; limit?: string; status?: string }>;
}) {
  const { q, page = "1", limit = "10", status } = await searchParams;
  const session = await auth();
  
  const baseWhere = session?.user.role === "INTERMEDIARIO" 
    ? { intermediaryId: session?.user.id } 
    : {};

  const whereClause: any = q ? {
    AND: [
      baseWhere,
      {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { country: { contains: q, mode: 'insensitive' } },
          { passportNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
    ],
  } : baseWhere;

  if (status) {
    whereClause.status = status;
  }

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = limit === "ALL" ? undefined : (parseInt(limit, 10) || 10);
  const skip = limitNumber ? (pageNumber - 1) * limitNumber : undefined;

  const totalCandidates = await prisma.candidate.count({ where: whereClause as any });
  const totalPages = limitNumber ? Math.ceil(totalCandidates / limitNumber) : 1;

  const candidates = await prisma.candidate.findMany({
    where: whereClause as any,
    take: limitNumber,
    skip: skip,
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <BulkImportCandidates />
            <Link href="/candidatos/nuevo" className="button" style={{ backgroundColor: 'var(--pitch-black)', color: 'var(--amber-flame)' }}>
              <PlusCircle size={20} />
              Añadir Candidato
            </Link>
          </div>
        </div>
      </div>

      <CandidateSearch />

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
              candidates.map((c: any) => (
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/candidatos/${c.id}`} className="button button-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                        Ver Detalles
                      </Link>
                      {!c.selfRegistered && (
                        <CopyRegistrationLink candidateId={c.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (limit) params.set("limit", limit);
            params.set("page", p.toString());
            
            return (
              <Link 
                key={p} 
                href={`?${params.toString()}`}
                className={`button ${p === pageNumber ? '' : 'button-secondary'}`}
                style={{ minWidth: '40px', padding: '0.5rem', textAlign: 'center' }}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
