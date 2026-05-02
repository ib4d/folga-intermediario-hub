/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { ShieldAlert, CheckCircle, XCircle, Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { updateCandidateStatus } from "@/app/actions/candidates";

import LegalSearch from "@/components/LegalSearch";

export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  await requireRole(["SUPERADMIN", "ADMIN", "LEGAL"]);

  const params = await searchParams;
  const { q, limit = "10", page = "1", status = "EN_REVISION", intermediario } = params;

  const whereClause: any = {};
  if (status) whereClause.status = status;
  
  if (q) {
    whereClause.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { country: { contains: q, mode: 'insensitive' } },
      { passportNumber: { contains: q, mode: 'insensitive' } },
    ];
  }
  
  if (intermediario) {
    whereClause.intermediary = {
      name: { contains: intermediario, mode: 'insensitive' }
    };
  }

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = limit === "ALL" ? undefined : (parseInt(limit, 10) || 10);
  const skip = limitNumber ? (pageNumber - 1) * limitNumber : undefined;

  const totalCandidates = await prisma.candidate.count({ where: whereClause });
  const totalPages = limitNumber ? Math.ceil(totalCandidates / limitNumber) : 1;

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    take: limitNumber,
    skip: skip,
    include: {
      intermediary: { select: { name: true } },
      documents: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "2rem", backgroundColor: "var(--amber-flame)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <ShieldAlert size={32} />
          <div>
            <h1 style={{ margin: 0 }}>Auditoría Legal</h1>
            <p style={{ margin: 0, fontWeight: "bold" }}>{candidates.length} expedientes pendientes de revisión</p>
          </div>
        </div>
      </div>

      <LegalSearch />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Intermediario</th>
              <th>Documentos Subidos</th>
              <th>País</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c: any) => (
              <tr key={c.id}>
                <td style={{ fontWeight: "bold" }}>{c.firstName} {c.lastName}</td>
                <td>{c.intermediary.name}</td>
                <td>{c.documents.length} archivos</td>
                <td>{c.country}</td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                    <Link href={`/candidatos/${c.id}`} className="button button-secondary" style={{ padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Eye size={16} /> Revisar
                    </Link>
                    {c.status === "EN_REVISION" ? (
                      <>
                        <form action={async () => {
                          "use server";
                          await updateCandidateStatus(c.id, "APROBADO");
                        }}>
                          <button type="submit" className="button" style={{ backgroundColor: "#4ade80", color: "#064e3b", borderColor: "#064e3b", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <CheckCircle size={16} /> Aprobar
                          </button>
                        </form>
                        <form action={async (formData) => {
                          "use server";
                          const reason = formData.get("reason") as string;
                          await updateCandidateStatus(c.id, "RECHAZADO", reason);
                        }} style={{ display: "flex", gap: "0.5rem" }}>
                          <input type="text" name="reason" placeholder="Motivo..." className="input" style={{ width: "120px", padding: "0.25rem" }} required />
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button type="submit" className="button" style={{ backgroundColor: "#fca5a5", color: "#7f1d1d", borderColor: "#7f1d1d", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: '0.75rem' }}>
                              <XCircle size={14} /> Rechazar
                            </button>
                            <button 
                              formAction={async (formData) => {
                                "use server";
                                const reason = formData.get("reason") as string;
                                await updateCandidateStatus(c.id, "REVISION_ADICIONAL", undefined, reason);
                              }}
                              className="button" 
                              style={{ backgroundColor: "#fde68a", color: "#92400e", borderColor: "#92400e", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: '0.75rem' }}
                            >
                              <AlertTriangle size={14} /> Revisión Adic.
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <span className={`status-badge ${c.status === 'APROBADO' ? 'active' : c.status === 'REVISION_ADICIONAL' ? 'warning' : 'danger'}`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {c.status === "RECHAZADO" && c.rejectionReason && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#7f1d1d" }}>
                      <strong>Motivo:</strong> {c.rejectionReason}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                  No hay candidatos pendientes de revisión legal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const searchObj = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => { if (v) searchObj.set(k, v); });
            searchObj.set("page", p.toString());
            
            return (
              <Link 
                key={p} 
                href={`?${searchObj.toString()}`}
                className={`button ${p === pageNumber ? '' : 'button-secondary'}`}
                style={{ minWidth: '40px', padding: '0.5rem', textAlign: 'center' }}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
