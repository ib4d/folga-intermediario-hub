"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <div className="card" style={{ maxWidth: "500px", margin: "0 auto" }}>
        <h2>⚠️ Error al cargar</h2>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>{error.message}</p>
        <button className="button" onClick={reset}>Reintentar</button>
      </div>
    </div>
  );
}
