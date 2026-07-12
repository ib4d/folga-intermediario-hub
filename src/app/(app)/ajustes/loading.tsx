export default function Loading() {
  return (
    <div className="route-loading-shell">
      <div className="skeleton route-loading-hero" />
      <div className="route-loading-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton route-loading-card" />
        ))}
      </div>
      <div className="skeleton route-loading-table" />
    </div>
  );
}
