"use client";

export default function PrintActionsClient({
  guideLabel = "Usa la opcion del navegador para guardar como PDF.",
}: {
  guideLabel?: string;
}) {
  return (
    <div className="no-print broker-action-row" style={{ marginBottom: "1rem" }}>
      <button className="button" type="button" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </button>
      <span style={{ alignSelf: "center", opacity: 0.75 }}>{guideLabel}</span>
    </div>
  );
}
