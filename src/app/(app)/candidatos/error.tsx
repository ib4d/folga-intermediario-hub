"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="candidate-form-shell candidate-error-shell">
      <div className="card candidate-form-card candidate-error-card">
        <div className="card-header candidate-form-section-header">
          <h2>Error al cargar candidatos</h2>
        </div>
        <p className="candidate-error-copy">{error.message}</p>
        <button className="button" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
