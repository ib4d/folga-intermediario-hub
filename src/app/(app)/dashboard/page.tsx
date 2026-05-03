import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardCharts from "@/components/DashboardCharts";
import ExportButton from "@/components/ExportButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.organizationId;
  const userRole = session.user.role;
  const userId = session.user.id;

  // Tenant-scoped where clause
  const whereClause = {
    organizationId: orgId || undefined,
    ...(userRole === "INTERMEDIARIO" ? { intermediaryId: userId } : {}),
  };

  const [total, recopilando, enRevision, aprobados, recientes, byStatusRaw, byCountryRaw, stuckCandidates] =
    await Promise.all([
      prisma.candidate.count({ where: whereClause }),
      prisma.candidate.count({ where: { ...whereClause, status: "RECOPILANDO_DOCS" } }),
      prisma.candidate.count({ where: { ...whereClause, status: "EN_REVISION_LEGAL" } }),
      prisma.candidate.count({ where: { ...whereClause, status: "APROBADO" } }),
      prisma.candidate.findMany({
        where: whereClause,
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { intermediary: { select: { name: true } } },
      }),
      prisma.candidate.groupBy({ by: ["status"], where: whereClause, _count: { _all: true } }),
      prisma.candidate.groupBy({ by: ["country"], where: whereClause, _count: { _all: true } }),
      (async () => {
        // eslint-disable-next-line react-hooks/purity
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return prisma.candidate.findMany({
          where: {
            ...whereClause,
            updatedAt: { lte: sevenDaysAgo },
            status: { notIn: ["APROBADO", "RECHAZADO"] }
          },
          take: 3,
          select: { id: true, firstName: true, lastName: true, status: true, updatedAt: true }
        });
      })(),
    ]);

  const timelineData = await Promise.all(
    [3, 2, 1, 0].map(async (weeksAgo) => {
      const start = new Date();
      start.setDate(start.getDate() - (weeksAgo + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - weeksAgo * 7);
      const count = await prisma.candidate.count({
        where: { createdAt: { gte: start, lte: end }, ...whereClause },
      });
      return { date: `Semana ${weeksAgo + 1}`, count };
    })
  );

  const chartData = {
    byStatus: byStatusRaw.map((s: any) => ({ name: s.status.replace(/_/g, " "), value: s._count._all })),
    byCountry: byCountryRaw.map((c: any) => ({ name: c.country, value: c._count._all })),
    byTimeline: timelineData,
  };

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 900 }}>¡Bienvenido a tu Hub!</h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.7, marginBottom: '2.5rem' }}>
          Todavía no tienes candidatos registrados. Comienza agregando uno o configurando tu perfil.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/candidatos/nuevo" className="button" style={{ padding: '1rem 2rem' }}>
            Registrar Primer Candidato
          </Link>
          <Link href="/ajustes/branding" className="button button-secondary" style={{ padding: '1rem 2rem', border: '1px solid var(--pitch-black)' }}>
            Configurar Marca Blanca
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="hero-section"
        style={{
          padding: "2rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "0.5rem" }}>Dashboard Central</h1>
          <p style={{ margin: 0, color: "var(--pitch-black)" }}>
            Bienvenido, <span style={{ fontWeight: "bold" }}>{session.user.name}</span>. Tienes{" "}
            {recopilando} candidatos pendientes.
          </p>
        </div>
        <ExportButton />
      </div>

      <div className="dashboard-grid">
        <Link href="/candidatos" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card-header">
            <h3>Total Candidatos</h3>
            <Users size={24} />
          </div>
          <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: 1 }}>{total}</div>
        </Link>

        <Link
          href="/candidatos?status=RECOPILANDO_DOCS"
          className="card"
          style={{ backgroundColor: "var(--amber-flame)", textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>Recopilando Docs</h3>
            <Clock size={24} />
          </div>
          <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: 1 }}>{recopilando}</div>
        </Link>

        <Link href="/legal" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card-header">
            <h3>En Revisión Legal</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: 1 }}>{enRevision}</div>
        </Link>

        <Link
          href="/logistica"
          className="card"
          style={{ border: "2px solid #4ade80", textDecoration: "none", color: "inherit" }}
        >
          <div className="card-header">
            <h3>Aprobados</h3>
            <CheckCircle size={24} color="#4ade80" />
          </div>
          <div style={{ fontSize: "3rem", fontWeight: "900", lineHeight: 1 }}>{aprobados}</div>
        </Link>
      </div>

      <DashboardCharts data={chartData} />

      {stuckCandidates.length > 0 && (
        <div className="card" style={{ marginTop: "2rem", border: "2px solid #ef4444", backgroundColor: "#fef2f2" }}>
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: "#b91c1c", display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} /> Candidatos Estancados (Inactivos {'>'} 7 días)
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {stuckCandidates.map(c: any => (
              <Link key={c.id} href={`/candidatos/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '1rem', border: '1px solid #fee2e2', backgroundColor: 'white' }}>
                  <div style={{ fontWeight: 'bold' }}>{c.firstName} {c.lastName}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{c.status.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '0.7rem', color: '#b91c1c' }}>Sin cambios desde {new Date(c.updatedAt).toLocaleDateString()}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <div
          className="card-header"
          style={{ borderBottom: "2px solid var(--pitch-black)", paddingBottom: "1rem", marginBottom: "1.5rem" }}
        >
          <h2>Candidatos Recientes</h2>
          <Link href="/candidatos" className="button" style={{ fontSize: "0.875rem" }}>
            Ver todos
          </Link>
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
                  <td style={{ fontWeight: "bold" }}>
                    {candidate.firstName} {candidate.lastName}
                  </td>
                  <td>{candidate.country}</td>
                  <td>
                    <span className={`status-badge ${candidate.status === "APROBADO" ? "active" : ""}`}>
                      {candidate.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/candidatos/${candidate.id}`}
                      className="button button-secondary"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                    >
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
