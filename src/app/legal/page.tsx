import { Briefcase, FileCheck, ShieldAlert, Gavel } from "lucide-react";

export default function LegalPage() {
  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)', borderBottom: '2px solid var(--pitch-black)' }}>
        <h1 style={{ color: 'var(--pitch-black)' }}>Departamento Legal</h1>
        <p style={{ color: 'var(--pitch-black)' }}>Revisión de documentos migratorios, permisos de trabajo y auditoría de contrataciones.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>
          <div className="card-header">
            <h3 style={{ color: 'var(--ghost-white)' }}>En Revisión</h3>
            <Gavel size={24} color="var(--amber-flame)" />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>14</div>
          <p style={{ margin: 0, marginTop: '0.5rem', color: 'var(--grey-olive)' }}>Listos para auditar</p>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3>Permisos Solicitados</h3>
            <FileCheck size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>32</div>
          <p style={{ margin: 0, marginTop: '0.5rem' }}>Trámites en curso</p>
        </div>

        <div className="card" style={{ border: '2px solid #e63946' }}>
          <div className="card-header">
            <h3 style={{ color: '#e63946' }}>Bloqueados</h3>
            <ShieldAlert size={24} color="#e63946" />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1, color: '#e63946' }}>3</div>
          <p style={{ margin: 0, marginTop: '0.5rem', fontWeight: 'bold' }}>Historial negativo o docs falsos</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2>Candidatos en Cola de Auditoría Legal</h2>
          <button className="button" style={{ backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>
            Descargar Reporte Legal (Excel)
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Candidato</th>
                <th>País</th>
                <th>Intermediario</th>
                <th>Estado de Docs</th>
                <th>Prioridad</th>
                <th>Acción Legal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Miguel Sánchez</td>
                <td>Colombia</td>
                <td>Andres V.</td>
                <td><span className="status-badge active" style={{ backgroundColor: '#4ade80' }}>Completos</span></td>
                <td>Alta</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="button" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>Aprobar</button>
                    <button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#e63946', borderColor: '#e63946' }}>Rechazar</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Elena Rojas</td>
                <td>Cuba</td>
                <td>Maria G.</td>
                <td><span className="status-badge" style={{ backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)' }}>Falta Karta Pobytu</span></td>
                <td>Media</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Solicitar Docs</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
