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
    prisma.candidate.count({ where: { ...whereClause, status: "EN_REVISION_LEGAL" } }),
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

  const chartData = {
    byStatus: byStatusRaw.map(s => ({ name: s.status, value: s._count._all })),
    byCountry: byCountryRaw.map(c => ({ name: c.country, value: c._count._all })),
    byTimeline: [
      { date: "Semana 1", count: 4 },
      { date: "Semana 2", count: 7 },
      { date: "Semana 3", count: 5 },
      { date: "Semana 4", count: 12 },
    ]
  };

  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Dashboard Central</h1>
          <p style={{ margin: 0 }}>Bienvenido, <span style={{ color: 'var(--amber-flame)', fontWeight: 'bold' }}>{session.user.name}</span>. Tienes {recopilando} candidatos pendientes.</p>
        </div>
        <ExportButton />
      </div>

      <div className="dashboard-grid">
        {/* ... (mismos cards de métricas) ... */}
        <div className="card">
          <div className="card-header">
            <h3>Total Candidatos</h3>
            <Users size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{total}</div>
        </div>

        <div className="card" style={{ backgroundColor: 'var(--amber-flame)' }}>
          <div className="card-header">
            <h3>Recopilando Docs</h3>
            <Clock size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{recopilando}</div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>En Revisión Legal</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{enRevision}</div>
        </div>

        <div className="card" style={{ border: '2px solid #4ade80' }}>
          <div className="card-header">
            <h3 style={{ color: '#065F46' }}>Aprobados</h3>
            <CheckCircle size={24} color="#065F46" />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1, color: '#065F46' }}>{aprobados}</div>
        </div>
      </div>

      <DashboardCharts data={chartData} />

      <div className="card" style={{ marginTop: '2rem' }}>
        {/* ... (tabla de candidatos recientes) ... */}
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
              {recientes.map((candidate) => (
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
