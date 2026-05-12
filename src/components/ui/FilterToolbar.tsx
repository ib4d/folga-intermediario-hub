export default function FilterToolbar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{
        marginBottom: "2rem",
        padding: "1rem",
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}
