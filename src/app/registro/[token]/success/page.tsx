import Link from "next/link";

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-green-100">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">¡Registro Exitoso!</h1>
        
        <div className="space-y-4 text-gray-600 mb-8">
          <p>
            Tus datos han sido recibidos correctamente y están siendo procesados por nuestro departamento Legal.
          </p>
          <p className="text-sm">
            Recibirás una notificación o contacto de tu intermediario una vez que tu documentación sea revisada.
          </p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm mb-8 text-left">
          <h2 className="font-bold mb-1 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Siguientes pasos:
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Revisión de documentos por Legal</li>
            <li>Confirmación de pago de 400 PLN</li>
            <li>Asignación de logística de llegada</li>
          </ul>
        </div>
        
        <p className="text-gray-400 text-xs">
          Gracias por confiar en FOLGA.
        </p>
      </div>
    </div>
  );
}
