import { getCandidateByToken } from "@/app/actions/public-registration";
import CandidateRegistrationForm from "@/components/registration/CandidateRegistrationForm";
import { notFound } from "next/navigation";

export default async function RegistroPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const candidate = await getCandidateByToken(token);
  
  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-red-100">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Enlace inválido</h1>
          <p className="text-gray-600">Este enlace de registro no es válido o ha expirado. Por favor, contacte a su reclutador.</p>
        </div>
      </div>
    );
  }
  
  if (candidate.selfRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-amber-100">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-amber-800 mb-2">Formulario ya completado</h1>
          <p className="text-gray-600">Este enlace de registro ya ha sido utilizado. Si necesita realizar cambios, contacte con su intermediario.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 mb-4 text-sm font-semibold tracking-wide text-blue-600 uppercase bg-blue-100 rounded-full">
            Registro Oficial
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            FOLGA HUB
          </h1>
          <p className="text-lg text-gray-600">
            Complete su información para iniciar el proceso de legalización.
          </p>
          {candidate.intermediary?.name && (
            <p className="mt-2 text-sm text-gray-500">
              Reclutador asignado: <span className="font-medium text-gray-900">{candidate.intermediary.name}</span>
            </p>
          )}
        </div>
        
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
          <CandidateRegistrationForm 
            token={token} 
            initialData={{
              firstName: candidate.firstName,
              lastName: candidate.lastName
            }} 
          />
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} FOLGA SP. Z O.O. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
