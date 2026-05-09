import { getCandidateByToken } from "@/app/actions/public-registration";
import CandidateRegistrationForm from "@/components/registration/CandidateRegistrationForm";

export default async function RegistroPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const candidate = await getCandidateByToken(token);
  
  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2.5rem', 
          border: '4px solid var(--pitch-black)', 
          boxShadow: '8px 8px 0px var(--pitch-black)',
          maxWidth: '450px', 
          textAlign: 'center' 
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#ef4444', marginBottom: '1.5rem', textTransform: 'uppercase' }}>ENLACE INVÁLIDO</h1>
          <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>Este enlace de registro no es válido o ha expirado. Por favor, contacte a su reclutador.</p>
        </div>
      </div>
    );
  }
  
  if (candidate.selfRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2.5rem', 
          border: '4px solid var(--pitch-black)', 
          boxShadow: '8px 8px 0px var(--pitch-black)',
          maxWidth: '450px', 
          textAlign: 'center' 
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: 'var(--amber-flame)', 
            border: '3px solid var(--pitch-black)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem' 
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem', textTransform: 'uppercase' }}>YA REGISTRADO</h1>
          <p style={{ fontWeight: 'bold' }}>Este enlace ya ha sido utilizado. Si necesita realizar cambios, contacte con su reclutador.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            display: 'inline-block', 
            padding: '0.5rem 1.5rem', 
            marginBottom: '1.5rem', 
            fontSize: '0.8rem', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            backgroundColor: 'var(--pitch-black)', 
            color: 'white',
            letterSpacing: '2px'
          }}>
            REGISTRO OFICIAL
          </div>
          <h1 style={{ fontSize: '4rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-2px' }}>
            FOLGA HUB
          </h1>
          <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--muted)' }}>
            Complete su información para iniciar el proceso de legalización.
          </p>
          {candidate.intermediary?.name && (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              RECLUTADOR: <span style={{ backgroundColor: 'var(--amber-flame)', padding: '0 0.5rem' }}>{candidate.intermediary.name.toUpperCase()}</span>
            </p>
          )}
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          border: '4px solid var(--pitch-black)', 
          boxShadow: '12px 12px 0px var(--pitch-black)',
          padding: '2rem'
        }}>
          <CandidateRegistrationForm 
            token={token} 
            initialData={{
              firstName: candidate.firstName,
              lastName: candidate.lastName
            }} 
          />
        </div>
        
        <div style={{ marginTop: '4rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
          &copy; {new Date().getFullYear()} FOLGA SP. Z O.O. TODOS LOS DERECHOS RESERVADOS.
        </div>
      </div>
    </div>
  );
}
