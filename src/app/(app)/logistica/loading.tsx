export default function Loading() {
  return (
    <div className="route-loading-shell" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando logística">
      <div className="skeleton route-loading-hero" aria-hidden="true" />
      <div className="route-loading-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton route-loading-card" aria-hidden="true" />
        ))}
      </div>
      <div className="skeleton route-loading-table" aria-hidden="true" />
    </div>
  );
}
