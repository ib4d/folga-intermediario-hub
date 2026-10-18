import { ChevronDown } from "lucide-react";

type ProviderStatusCardProps = {
  title: string;
  description?: string;
  storageLabel: string;
  storageValue: string;
  storageNote?: string;
  storageAvailableLabel?: string;
  storageAvailableValue?: readonly string[];
  ocrLabel: string;
  ocrValue: string;
  ocrNote?: string;
  ocrAvailableLabel?: string;
  ocrAvailableValue?: readonly string[];
  collapsible?: boolean;
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
  collapsible = false,
}: ProviderStatusCardProps) {
  const providerGrid = (
    <div className="settings-provider-status-grid" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      <div className="settings-provider-status-item">
        <div className="settings-provider-status-label">{storageLabel}</div>
        <div className="settings-provider-status-value">{storageValue}</div>
        {storageNote ? <div className="settings-provider-status-note">{storageNote}</div> : null}
        {storageAvailableLabel && storageAvailableValue?.length ? (
          <div className="settings-provider-available">
            <div className="settings-provider-available-label">{storageAvailableLabel}</div>
            <div className="settings-provider-tags">
              {storageAvailableValue.map((provider) => <span key={provider}>{provider}</span>)}
            </div>
          </div>
        ) : null}
      </div>
      <div className="settings-provider-status-item">
        <div className="settings-provider-status-label">{ocrLabel}</div>
        <div className="settings-provider-status-value">{ocrValue}</div>
        {ocrNote ? <div className="settings-provider-status-note">{ocrNote}</div> : null}
        {ocrAvailableLabel && ocrAvailableValue?.length ? (
          <div className="settings-provider-available">
            <div className="settings-provider-available-label">{ocrAvailableLabel}</div>
            <div className="settings-provider-tags">
              {ocrAvailableValue.map((provider) => <span key={provider}>{provider}</span>)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (collapsible) {
    return (
      <details className="card settings-provider-disclosure">
        <summary className="card-header settings-provider-summary">
          <div>
            <h2>{title}</h2>
            <p>{description || `${storageValue} · ${ocrValue}`}</p>
          </div>
          <ChevronDown size={19} aria-hidden="true" />
        </summary>
        {providerGrid}
      </details>
    );
  }

  return (
    <div className="card" style={{ marginBottom: "2rem", padding: "1.25rem 1.5rem" }}>
      <div className="card-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h2 style={{ marginBottom: "0.35rem" }}>{title}</h2>
          {description ? <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem", maxWidth: "760px" }}>{description}</p> : null}
        </div>
      </div>
      {providerGrid}
    </div>
  );
}
