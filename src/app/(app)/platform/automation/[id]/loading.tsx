export default function Loading() {
  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="skeleton" style={{ height: "120px", width: "100%" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: "120px" }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: "240px", width: "100%" }} />
      <div className="skeleton" style={{ height: "360px", width: "100%" }} />
    </div>
  );
}
