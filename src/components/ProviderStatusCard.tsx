type ProviderStatusCardProps = {
  title: string;
  description?: string;
  storageLabel: string;
  storageValue: string;
  storageNote?: string;
  storageAvailableLabel?: string;
  storageAvailableValue?: string;
  ocrLabel: string;
  ocrValue: string;
  ocrNote?: string;
  ocrAvailableLabel?: string;
  ocrAvailableValue?: string;
};

export default function ProviderStatusCard({
  title,
  description,
  storageLabel,
  storageValue,
  storageNote,
  storageAvailableLabel,
  storageAvailableValue,
  ocrLabel,
  ocrValue,
  ocrNote,
  ocrAvailableLabel,
  ocrAvailableValue,
}: ProviderStatusCardProps) {
  return (
    <div className="card" style={{ marginBottom: "2rem", padding: "1.25rem 1.5rem" }}>
      <div className="card-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h2 style={{ marginBottom: "0.35rem" }}>{title}</h2>
          {description ? (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem", maxWidth: "760px" }}>
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{storageLabel}</div>
          <div style={{ marginTop: "0.5rem", fontSize: "1.1rem", fontWeight: 900 }}>{storageValue}</div>
          {storageNote ? (
            <div style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.45 }}>
              {storageNote}
            </div>
          ) : null}
          {storageAvailableLabel && storageAvailableValue ? (
            <div style={{ marginTop: "0.45rem", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.45 }}>
              <strong>{storageAvailableLabel}:</strong> {storageAvailableValue}
            </div>
          ) : null}
        </div>
        <div
          style={{
            border: "1px solid rgba(0, 0, 0, 0.1)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "1rem 1.1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{ocrLabel}</div>
          <div style={{ marginTop: "0.5rem", fontSize: "1.1rem", fontWeight: 900 }}>{ocrValue}</div>
          {ocrNote ? (
            <div style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.45 }}>
              {ocrNote}
            </div>
          ) : null}
          {ocrAvailableLabel && ocrAvailableValue ? (
            <div style={{ marginTop: "0.45rem", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.45 }}>
              <strong>{ocrAvailableLabel}:</strong> {ocrAvailableValue}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
