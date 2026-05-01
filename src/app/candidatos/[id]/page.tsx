import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      intermediary: true,
      documents: true
    }
  });

  if (!candidate) {
    notFound();
  }

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/candidatos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', textDecoration: 'none', fontWeight: 'bold' }}>
          <ArrowLeft size={16} /> Volver a Candidatos
        </Link>
      </div>

      <div className="hero-section" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{candidate.firstName} {candidate.lastName}</h1>
          <p style={{ margin: 0 }}>{candidate.country} • {candidate.phone || 'Sin teléfono'} • Gestionado por: {candidate.intermediary.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Estado Actual</div>
          <span className={`status-badge ${candidate.status === 'APROBADO' ? 'active' : ''} ${candidate.status === 'RECHAZADO' ? 'danger' : ''}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            {candidate.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2>Documentos Migratorios</h2>
            <button className="button" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              <Upload size={16} /> Subir Documento
            </button>
          </div>
          
          {candidate.documents.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', border: '2px dashed var(--muted)', backgroundColor: 'var(--white-smoke)' }}>
              <FileText size={48} style={{ color: 'var(--muted)', margin: '0 auto 1rem auto' }} />
              <h3 style={{ color: 'var(--muted)' }}>No hay documentos</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Aún no se han subido pasaportes ni visas para este candidato.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th>Expiración</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 'bold' }}>{doc.type}</td>
                      <td>{doc.number || '-'}</td>
                      <td>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}</td>
                      <td><span className="status-badge active">Verificado</span></td>
                      <td>
                        <button className="button button-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Ver Archivo</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ backgroundColor: 'var(--amber-flame)' }}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              <h3>Proceso Legal</h3>
              <AlertTriangle size={24} />
            </div>
            <p style={{ color: 'var(--pitch-black)', fontWeight: 'bold', margin: '1rem 0' }}>Faltan documentos obligatorios para iniciar permiso de trabajo.</p>
            <button className="button" style={{ width: '100%', backgroundColor: 'var(--pitch-black)', color: 'var(--amber-flame)' }}>Solicitar Revisión Legal</button>
          </div>

          <div className="card">
            <h3>Notas del Perfil</h3>
            <div style={{ padding: '1rem', backgroundColor: 'var(--white-smoke)', border: '2px solid var(--pitch-black)', minHeight: '100px' }}>
              {candidate.notes || "No hay notas adicionales."}
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={candidate.paid400pln} readOnly style={{ width: '20px', height: '20px', accentColor: 'var(--pitch-black)' }} />
                <span>Pago inicial de 400 PLN completado</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
