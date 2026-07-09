"use client";

import { useState } from "react";

export default function BrokerInvoicePrintClient() {
  const [ready, setReady] = useState(false);

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }} className="no-print">
      <button className="button" type="button" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </button>
      <button className="button button-secondary" type="button" onClick={() => setReady((value) => !value)}>
        {ready ? "Ocultar guia" : "Mostrar guia"}
      </button>
      {ready ? (
        <span style={{ alignSelf: "center", opacity: 0.75 }}>
          Usa la opcion "Guardar como PDF" del navegador para archivarla.
        </span>
      ) : null}
    </div>
  );
}
