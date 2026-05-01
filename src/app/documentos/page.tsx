import { FileText, AlertTriangle, Upload, CheckCircle } from "lucide-react";

export default function DocumentosPage() {
  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>
        <h1 style={{ color: 'var(--ghost-white)' }}>Centro de Documentos</h1>
        <p style={{ color: 'var(--grey-olive)' }}>Revisión OCR, gestión de visas, permisos de trabajo y auditoría legal.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ backgroundColor: 'var(--amber-flame)' }}>
          <div className="card-header">
            <h3>Pendientes de Revisión</h3>
            <AlertTriangle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>12</div>
          <p style={{ margin: 0, marginTop: '0.5rem', color: 'var(--pitch-black)' }}>Docs subidos hoy</p>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3>OCR Completado</h3>
            <CheckCircle size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>84</div>
          <p style={{ margin: 0, marginTop: '0.5rem' }}>Extracción automática exitosa</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2>Últimos Documentos Procesados</h2>
          <button className="button">
            <Upload size={18} /> Subir Lote
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Candidato</th>
                <th>Tipo Detectado</th>
                <th>Confianza OCR</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> scan_pass_12.pdf</td>
                <td>Maria Rodriguez</td>
                <td>Pasaporte (Colombia)</td>
                <td><span className="status-badge active" style={{ backgroundColor: '#4ade80' }}>98%</span></td>
                <td><button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Verificar</button></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> img_pesel_raw.jpg</td>
                <td>Desconocido</td>
                <td>PESEL</td>
                <td><span className="status-badge danger">42%</span></td>
                <td><button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Corregir</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
