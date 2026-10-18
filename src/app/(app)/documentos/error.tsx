"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="route-error-shell" role="alert" aria-live="assertive">
      <div className="card route-error-card">
        <h2>⚠️ Error al cargar documentos</h2>
        <p className="route-error-copy">No se pudieron cargar los documentos. Comprueba tu conexión e inténtalo de nuevo.</p>
        <button className="button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
