export default function FilterToolbar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="card filter-toolbar"
    >
      {children}
    </div>
  );
}
