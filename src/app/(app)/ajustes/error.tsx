"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="route-error-shell">
      <div className="card route-error-card">
        <h2>⚠️ Error al cargar</h2>
        <p className="route-error-copy">{error.message}</p>
        <button className="button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
