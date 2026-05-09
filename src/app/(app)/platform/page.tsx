import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Building2, Users, FileText, Activity } from "lucide-react";

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();

  const [orgs, stats] = await Promise.all([
    prisma.organization.findMany({
      include: {
        _count: {
          select: { memberships: true, candidates: true, documents: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.organization.aggregate({
      _count: { _all: true },
    })
  ]);

  const totalUsers = await prisma.user.count();
  const totalCandidates = await prisma.candidate.count();

  return (
    <div style={{ padding: '2rem' }}>
      <div className="hero-section" style={{ marginBottom: '2rem' }}>
        <h1>Platform Administration</h1>
        <p>Visión global de todos los inquilinos y uso del sistema.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Organizaciones</h3>
            <Building2 size={24} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{stats._count._all}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Usuarios Totales</h3>
            <Users size={24} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{totalUsers}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Candidatos Totales</h3>
            <FileText size={24} />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{totalCandidates}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Tenants Activos</h2>
          <Activity size={20} />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Organización</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Usuarios</th>
                <th>Candidatos</th>
                <th>Docs</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td style={{ fontWeight: 'bold' }}>
                    {org.name}
                    <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{org.slug}</div>
                  </td>
                  <td>
                    <span className="status-badge active" style={{ backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)' }}>
                      {org.plan}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${org.isActive ? 'active' : ''}`}>
                      {org.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{org._count.memberships}</td>
                  <td>{org._count.candidates}</td>
                  <td>{org._count.documents}</td>
                  <td>{org.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
