import { Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function Home() {
  return (
    <>
      <div className="hero-section">
        <h1>Dashboard Intermediarios</h1>
        <p>Visión general del estado del reclutamiento y pipeline de candidatos para el equipo legal y de logística.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '3rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Candidatos Activos</h3>
            <Users size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>142</div>
          <p style={{ margin: 0, marginTop: '0.5rem' }}>+12 esta semana</p>
        </div>

        <div className="card" style={{ backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)' }}>
          <div className="card-header">
            <h3>Docs Pendientes</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>28</div>
          <p style={{ margin: 0, marginTop: '0.5rem', color: 'var(--pitch-black)' }}>Requieren atención inmediata</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>En Revisión Legal</h3>
            <Clock size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>45</div>
          <p style={{ margin: 0, marginTop: '0.5rem' }}>Tiempo medio: 3 semanas</p>
        </div>

        <div className="card" style={{ backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>
          <div className="card-header">
            <h3>Aprobados (Listos)</h3>
            <CheckCircle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>19</div>
          <p style={{ margin: 0, marginTop: '0.5rem', color: 'var(--grey-olive)' }}>Pendientes de pago 400pln</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Candidatos Recientes</h2>
        <button className="button">Ver Todos</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Candidato</th>
              <th>País</th>
              <th>Intermediario</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><div style={{ fontWeight: 'bold' }}>Juan Pérez</div><div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Pasaporte: AB123456</div></td>
              <td>Colombia</td>
              <td>Maria G.</td>
              <td><span className="status-badge">Recopilando Docs</span></td>
              <td><button className="button button-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Revisar</button></td>
            </tr>
            <tr>
              <td><div style={{ fontWeight: 'bold' }}>Carlos Silva</div><div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>PESEL: 90010112345</div></td>
              <td>Perú (En Polonia)</td>
              <td>Jorge M.</td>
              <td><span className="status-badge active">Legal Aprobado</span></td>
              <td><button className="button button-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Revisar</button></td>
            </tr>
            <tr>
              <td><div style={{ fontWeight: 'bold' }}>Ana Gomez</div><div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Pasaporte: XY987654</div></td>
              <td>Guatemala</td>
              <td>Maria G.</td>
              <td><span className="status-badge danger">Rechazado Legal</span></td>
              <td><button className="button button-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Revisar</button></td>
            </tr>
            <tr>
              <td><div style={{ fontWeight: 'bold' }}>Luis Rodriguez</div><div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Karta Pobytu Pendiente</div></td>
              <td>Venezuela</td>
              <td>Andres V.</td>
              <td><span className="status-badge">En Hrappka</span></td>
              <td><button className="button button-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Revisar</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
