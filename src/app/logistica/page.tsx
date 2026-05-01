import { Car, MapPin, Calendar, Clock, ArrowRight } from "lucide-react";

export default function LogisticaPage() {
  return (
    <>
      <div className="hero-section" style={{ padding: '2rem', backgroundColor: 'var(--white-smoke)', color: 'var(--pitch-black)', borderBottom: '2px solid var(--pitch-black)' }}>
        <h1 style={{ color: 'var(--pitch-black)' }}>Logística y Traslados</h1>
        <p style={{ color: 'var(--grey-olive)' }}>Gestión de viajes, llegadas a oficinas de Kutno y acomodación inicial.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ backgroundColor: 'var(--pitch-black)', color: 'var(--ghost-white)' }}>
          <div className="card-header">
            <h3 style={{ color: 'var(--ghost-white)' }}>Llegadas Hoy</h3>
            <Calendar size={24} color="var(--amber-flame)" />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>4</div>
          <p style={{ margin: 0, marginTop: '0.5rem', color: 'var(--grey-olive)' }}>Estación de Tren: 3 | Coche: 1</p>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3>Recogidas Pendientes</h3>
            <Car size={24} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>2</div>
          <p style={{ margin: 0, marginTop: '0.5rem' }}>Asignar conductor necesario</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2>Próximos Viajes a Kutno</h2>
          <button className="button">
            Programar Llegada
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Candidato</th>
                <th>Medio</th>
                <th>Origen</th>
                <th>Llegada Estimada</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Juan Pérez</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> Tren (PKP)</div></td>
                <td>Varsovia Chopin</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> Hoy, 14:30</div></td>
                <td><span className="status-badge" style={{ backgroundColor: 'var(--amber-flame)', color: 'var(--pitch-black)' }}>En Tránsito</span></td>
                <td><button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Asignar Recogida</button></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Carlos Silva</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Car size={16} /> Coche Privado</div></td>
                <td>Berlín</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> Hoy, 18:00</div></td>
                <td><span className="status-badge active">Confirmado</span></td>
                <td><button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Detalles</button></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Ana Gomez</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> Bus (Flixbus)</div></td>
                <td>Cracovia</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> Mañana, 09:15</div></td>
                <td><span className="status-badge">Programado</span></td>
                <td><button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Detalles</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
