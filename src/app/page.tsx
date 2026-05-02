/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Users, AlertTriangle, CheckCircle, Clock, Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardCharts from "@/components/DashboardCharts";
import ExportButton from "@/components/ExportButton"; // Necesitaremos crear este pequeño componente cliente

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const userRole = session.user.role;
  const userId = session.user.id;

  const whereClause = userRole === "INTERMEDIARIO" 
    ? { intermediaryId: userId } 
    : {};

  const [total, recopilando, enRevision, aprobados, recientes, byStatusRaw, byCountryRaw] = await Promise.all([
    prisma.candidate.count({ where: whereClause }),
    prisma.candidate.count({ where: { ...whereClause, status: "RECOPILANDO_DOCS" } }),
    prisma.candidate.count({ where: { ...whereClause, status: "EN_REVISION" } }),
    prisma.candidate.count({ where: { ...whereClause, status: "APROBADO" } }),
    prisma.candidate.findMany({
      where: whereClause,
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: { 
        intermediary: { select: { name: true } } 
      },
    }),
    prisma.candidate.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { _all: true }
    }),
    prisma.candidate.groupBy({
      by: ['country'],
      where: whereClause,
      _count: { _all: true }
    })
  ]);

  // Estadísticas reales para el timeline (últimas 4 semanas)
  const timelineData = await Promise.all([3, 2, 1, 0].map(async (weeksAgo, index) => {
    const start = new Date();
    start.setDate(start.getDate() - (weeksAgo + 1) * 7);
    const end = new Date();
    end.setDate(end.getDate() - weeksAgo * 7);
    const count = await prisma.candidate.count({
      where: { createdAt: { gte: start, lte: end }, ...whereClause }
    });
    // Si weeksAgo es 0 (actual), queremos que la etiqueta sea Semana 1
    // Si weeksAgo es 3 (hace 3 semanas), queremos que sea Semana 4
    const labelNumber = weeksAgo + 1;
    return { date: `Semana ${labelNumber}`, count };
  }));

  const chartData = {
    byStatus: byStatusRaw.map((s: any) => ({ name: s.status.replace(/_/g, ' '), value: s._count._all })),
    byCountry: byCountryRaw.map((c: any) => ({ name: c.country, value: c._count._all })),
    byTimeline: timelineData
  };

  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Dashboard Central</h1>
          <p style={{ margin: 0, color: 'var(--pitch-black)' }}>Bienvenido, <span style={{ fontWeight: 'bold' }}>{session.user.name}</span>. Tienes {recopilando} candidatos pendientes.</p>
        </div>
        <ExportButton />
      </div>

      <div className="dashboard-grid">
        <Link href="/candidatos" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">
            <h3>Total Candidatos</h3>
            <Users size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{total}</div>
        </Link>

        <Link href="/candidatos?status=RECOPILANDO_DOCS" className="card" style={{ backgroundColor: 'var(--amber-flame)', textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">
            <h3>Recopilando Docs</h3>
            <Clock size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{recopilando}</div>
        </Link>

        <Link href="/legal" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">
            <h3>En Revisión Legal</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{enRevision}</div>
        </Link>

        <Link href="/logistica" className="card" style={{ border: '2px solid #4ade80', textDecoration: 'none', color: 'inherit' }}>
          <div className="card-header">
            <h3>Aprobados</h3>
            <CheckCircle size={24} color="#4ade80" />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{aprobados}</div>
        </Link>
      </div>

      <DashboardCharts data={chartData} />

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2>Candidatos Recientes</h2>
          <Link href="/candidatos" className="button" style={{ fontSize: '0.875rem' }}>Ver todos</Link>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>País</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((candidate: any) => (
                <tr key={candidate.id}>
                  <td style={{ fontWeight: 'bold' }}>{candidate.firstName} {candidate.lastName}</td>
                  <td>{candidate.country}</td>
                  <td>
                    <span className={`status-badge ${candidate.status === 'APROBADO' ? 'active' : ''}`}>
                      {candidate.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/candidatos/${candidate.id}`} className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
