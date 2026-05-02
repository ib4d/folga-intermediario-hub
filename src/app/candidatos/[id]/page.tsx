import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import DocumentUploadButton from "@/components/DocumentUploadButton";
import RequestLegalReview from "@/components/RequestLegalReview";
import UpdatePaymentStatus from "@/components/UpdatePaymentStatus";
import UpdateNotes from "@/components/UpdateNotes";
import DeleteDocumentButton from "@/components/DeleteDocumentButton";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id: resolvedParams.id },
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
          <span className={`status-badge ${candidate.status === 'APROBADO' ? 'active' : ''} ${candidate.status === 'RECHAZADO' ? 'danger' : ''} ${candidate.status === 'REVISION_ADICIONAL' ? 'warning' : ''}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            {candidate.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {(candidate.status === 'RECHAZADO' || candidate.status === 'REVISION_ADICIONAL') && (
        <div className="card" style={{ marginBottom: '2rem', borderLeft: `8px solid ${candidate.status === 'RECHAZADO' ? '#ef4444' : '#f59e0b'}`, backgroundColor: candidate.status === 'RECHAZADO' ? '#fef2f2' : '#fffbeb' }}>
          <h2 style={{ color: candidate.status === 'RECHAZADO' ? '#991b1b' : '#92400e', marginBottom: '0.5rem' }}>
            {candidate.status === 'RECHAZADO' ? 'CANDIDATO RECHAZADO' : 'REVISIÓN ADICIONAL REQUERIDA'}
          </h2>
          <p style={{ color: 'var(--pitch-black)', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {candidate.status === 'RECHAZADO' ? candidate.rejectionReason : candidate.reviewNotes}
          </p>
          <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
            Ultima actualización: {candidate.updatedAt.toLocaleString()}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--pitch-black)', paddingBottom: '0.5rem' }}>Datos del Candidato</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
            <div><strong style={{ display: 'block' }}>Nacionalidad:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.nationality || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>País de Nacimiento:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.birthCountry || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Lugar de Nacimiento:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.birthPlace || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Fecha de Nacimiento:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toLocaleDateString() : '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Sexo:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.gender || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Estatura:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.heightCm ? `${candidate.heightCm} cm` : '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Email:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.email || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Teléfono:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.phone || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Intermediario:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.intermediary?.name || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Fuente de Reclutamiento:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.recruitmentSource || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Responsable Reclutamiento:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.recruiterId || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Fecha de Llegada:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.arrivalDate ? new Date(candidate.arrivalDate).toLocaleDateString() : '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Alojamiento:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.accommodation || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Detalles Alojamiento:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.accommodationNotes || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Notas Llegada:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.arrivalNotes || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Ubicación:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.locationStatus || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Dirección en Polonia:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.polishAddress || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>Ciudad en Polonia:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.polishCity || '-'}</span></div>
            <div><strong style={{ display: 'block' }}>GDPR/RODO:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.gdprConsent ? 'Sí' : 'No'}</span></div>
            <div><strong style={{ display: 'block' }}>PESEL:</strong> <span style={{ color: 'var(--pitch-black)', opacity: 0.8 }}>{candidate.peselNumber || '-'}</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--grey-olive)' }}>
             <div>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Pasaporte</strong>
                <div>Número: {candidate.passportNumber || '-'}</div>
                <div>Emisión: {candidate.passportIssueDate ? new Date(candidate.passportIssueDate).toLocaleDateString() : '-'}</div>
                <div>Expiración: {candidate.passportExpiry ? new Date(candidate.passportExpiry).toLocaleDateString() : '-'}</div>
             </div>
             <div>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Karta Pobytu</strong>
                <div>Número: {candidate.kartaPobytuNumber || '-'}</div>
                <div>Tipo: {candidate.kartaPobytuType || '-'}</div>
                <div>Emisión: {candidate.kartaPobytuIssueDate ? new Date(candidate.kartaPobytuIssueDate).toLocaleDateString() : '-'}</div>
                <div>Expiración: {candidate.kartaPobytuExpiry ? new Date(candidate.kartaPobytuExpiry).toLocaleDateString() : '-'}</div>
             </div>
             <div>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Decyzja Wojewody</strong>
                <div>Número: {candidate.voivodatoNumber || '-'}</div>
                <div>Estado: {candidate.voivodatoStatus || '-'}</div>
                <div>Emisión: {candidate.voivodatoIssueDate ? new Date(candidate.voivodatoIssueDate).toLocaleDateString() : '-'}</div>
                <div>Expiración: {candidate.voivodatoExpiry ? new Date(candidate.voivodatoExpiry).toLocaleDateString() : '-'}</div>
             </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header" style={{ borderBottom: '2px solid var(--pitch-black)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2>Documentos Migratorios</h2>
            <DocumentUploadButton candidateId={candidate.id} />
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
                    <th>Entidad Emisora</th>
                    <th>Emisión</th>
                    <th>Expiración</th>
                    <th>Lugar Nacimiento</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.documents.map((doc: any) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 'bold' }}>{doc.type}</td>
                      <td>{doc.number || '-'}</td>
                      <td>{doc.issuerCountry || '-'}</td>
                      <td>{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '-'}</td>
                      <td>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}</td>
                      <td>{candidate.birthPlace || '-'}</td>
                      <td>
                        <span className={`status-badge ${doc.isVerified ? 'active' : ''}`}>
                          {doc.isVerified ? 'Verificado' : doc.ocrStatus || 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="button button-secondary" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                          >Ver Archivo</a>
                          <DeleteDocumentButton documentId={doc.id} />
                        </div>
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
            <RequestLegalReview candidateId={candidate.id} currentStatus={candidate.status} />
          </div>

          <div className="card">
            <h3>Notas del Perfil</h3>
            <UpdateNotes candidateId={candidate.id} initialNotes={candidate.notes || ""} />
            
            <div style={{ marginTop: '2rem', borderTop: '2px solid var(--grey-olive)', paddingTop: '1rem' }}>
              <UpdatePaymentStatus candidateId={candidate.id} initialValue={candidate.paid400pln} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
