/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { Car, MapPin, Calendar, Clock, Plane } from "lucide-react";
import { createLogisticsEvent } from "@/app/actions/logistics";

import LogisticaSearch from "@/components/LogisticaSearch";
import LogisticsCard from "@/components/LogisticsCard";
import Link from "next/link";

export default async function LogisticaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  await requireRole(["SUPERADMIN", "ADMIN", "INTERMEDIARIO"]);
  
  const params = await searchParams;
  const { q, limit = "10", page = "1", transport, terminal, pickedUpBy, dateFrom, dateTo } = params;

  const session = await auth();
  
  const baseWhere: any = session?.user.role === "INTERMEDIARIO" 
    ? { intermediaryId: session?.user.id, status: "APROBADO" }
    : { status: "APROBADO" };

  if (q) {
    baseWhere.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { country: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Logistics filters
  const logisticsFilter: any = {};
  if (transport) logisticsFilter.type = transport;
  if (terminal) logisticsFilter.terminal = { contains: terminal, mode: 'insensitive' };
  if (pickedUpBy) logisticsFilter.pickedUpBy = { contains: pickedUpBy, mode: 'insensitive' };
  
  if (dateFrom || dateTo) {
    logisticsFilter.date = {};
    if (dateFrom) logisticsFilter.date.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      logisticsFilter.date.lte = end;
    }
  }

  if (Object.keys(logisticsFilter).length > 0) {
    baseWhere.logistics = { some: logisticsFilter };
  }

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = limit === "ALL" ? undefined : (parseInt(limit, 10) || 10);
  const skip = limitNumber ? (pageNumber - 1) * limitNumber : undefined;

  const totalCandidates = await prisma.candidate.count({ where: baseWhere });
  const totalPages = limitNumber ? Math.ceil(totalCandidates / limitNumber) : 1;

  const candidates = await prisma.candidate.findMany({
    where: baseWhere,
    take: limitNumber,
    skip: skip,
    include: {
      logistics: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "2rem", backgroundColor: "var(--ghost-white)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Plane size={32} />
          <div>
            <h1 style={{ margin: 0 }}>Centro de Logística</h1>
            <p style={{ margin: 0, color: "var(--muted)" }}>Planificación de llegadas a Kutno</p>
          </div>
        </div>
      </div>

      <LogisticaSearch />

      <div className="dashboard-grid">
        {candidates.map((c: any) => (
          <LogisticsCard key={c.id} candidate={c} />
        ))}
        {candidates.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", backgroundColor: "white", border: "2px solid black" }}>
            No hay candidatos aprobados pendientes de logística.
          </div>
        )}
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
