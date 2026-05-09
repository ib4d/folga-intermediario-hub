export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div style={{ 
        backgroundColor: 'white', 
        padding: '3rem', 
        border: '4px solid var(--pitch-black)', 
        boxShadow: '12px 12px 0px var(--pitch-black)',
        maxWidth: '500px', 
        width: '100%', 
        textAlign: 'center' 
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          backgroundColor: '#4ade80', 
          border: '4px solid var(--pitch-black)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 2rem' 
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '-1px' }}>¡REGISTRO EXITOSO!</h1>
        
        <div style={{ fontWeight: 'bold', lineHeight: 1.6, marginBottom: '2rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            Tus datos han sido recibidos correctamente y están siendo procesados por nuestro departamento Legal.
          </p>
          <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
            Recibirás una notificación o contacto de tu intermediario una vez que tu documentación sea revisada.
          </p>
        </div>
        
        <div style={{ 
          backgroundColor: 'var(--white-smoke)', 
          padding: '1.5rem', 
          border: '2px solid var(--pitch-black)', 
          textAlign: 'left', 
          marginBottom: '2rem' 
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Siguientes pasos:
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>• REVISIÓN DE DOCUMENTOS POR LEGAL</li>
            <li>• CONFIRMACIÓN DE PAGO DE 400 PLN</li>
            <li>• ASIGNACIÓN DE LOGÍSTICA DE LLEGADA</li>
          </ul>
        </div>
        
        <p style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', opacity: 0.5 }}>
          GRACIAS POR CONFIAR EN FOLGA.
        </p>
      </div>
    </div>
  );
}
