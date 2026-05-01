import { Settings, Users, Database, Shield, Download } from "lucide-react";

export default function AjustesPage() {
  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)', borderBottom: '2px solid var(--grey-olive)' }}>
        <h1 style={{ color: 'var(--ghost-white)' }}>Ajustes del Sistema</h1>
        <p style={{ color: 'var(--grey-olive)' }}>Configuración de usuarios, notificaciones y exportación de datos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card">
            <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={24} />
                <h2 style={{ margin: 0 }}>Gestión de Usuarios</h2>
              </div>
              <button className="button">Invitar Usuario</button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Coordinador Admin</td>
                    <td>admin@folga.com</td>
                    <td><span className="status-badge" style={{ backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>SUPERADMIN</span></td>
                    <td>Activo</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Maria G.</td>
                    <td>maria@folga.com</td>
                    <td><span className="status-badge">INTERMEDIARIO</span></td>
                    <td>Activo</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Equipo Legal 1</td>
                    <td>legal1@folga.com</td>
                    <td><span className="status-badge" style={{ backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)' }}>LEGAL</span></td>
                    <td>Activo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={24} />
                <h2 style={{ margin: 0 }}>Exportación de Datos</h2>
              </div>
            </div>
            <p>Genera reportes para RRHH, marketing o dirección basados en la base de datos actual.</p>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="button button-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                <Download size={18} /> CSV Completo
              </button>
              <button className="button button-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                <Download size={18} /> Reporte Marketing
              </button>
              <button className="button button-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                <Download size={18} /> Reporte RRHH
              </button>
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ backgroundColor: 'var(--white-smoke)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} /> Seguridad
            </h3>
            
            <div className="input-group">
              <label className="label">Autenticación en 2 Pasos (2FA)</label>
              <button className="button button-secondary" style={{ width: '100%' }}>Activar 2FA</button>
            </div>

            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label className="label">Cambiar Contraseña</label>
              <button className="button button-secondary" style={{ width: '100%' }}>Actualizar</button>
            </div>
          </div>

          <div className="card">
            <h3>Notificaciones</h3>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--pitch-black)' }} />
                <span>Nuevos candidatos</span>
              </label>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--pitch-black)' }} />
                <span>Alertas legales urgentes</span>
              </label>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--pitch-black)' }} />
                <span>Docs a punto de expirar</span>
              </label>
            </div>
            <button className="button" style={{ width: '100%', marginTop: '1.5rem' }}>Guardar Preferencias</button>
          </div>
        </div>
      </div>
    </>
  );
}
