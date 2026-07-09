"use client";

import { useActionState } from "react";

import {
  importBrokerInvoicesAction,
  importBrokerLeadsAction,
} from "@/app/actions/brokers";

const initialState = {
  success: false,
  message: "",
};

async function importLeadsState(_: typeof initialState, formData: FormData) {
  try {
    const result = await importBrokerLeadsAction(formData);
    return {
      success: true,
      message: `Leads importados: ${result.imported} desde ${result.sourceCountrySheet}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo importar leads.",
    };
  }
}

async function importInvoicesState(_: typeof initialState, formData: FormData) {
  try {
    const result = await importBrokerInvoicesAction(formData);
    return {
      success: true,
      message: `Hojas de facturacion importadas: ${result.totalSheets}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo importar facturacion.",
    };
  }
}

export default function BrokerImportForms() {
  const [leadState, leadAction, leadPending] = useActionState(importLeadsState, initialState);
  const [invoiceState, invoiceAction, invoicePending] = useActionState(importInvoicesState, initialState);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
      <form action={leadAction} className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3>Importar leads de brokers</h3>
        <p style={{ margin: 0, opacity: 0.75 }}>
          Usa POŚREDNICY LATAM o tu plantilla por país. Puedes escribir el nombre exacto del tab.
        </p>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Nombre exacto del tab</span>
          <input className="input" type="text" name="sourceCountrySheet" list="broker-source-sheets" defaultValue="GUATEMALA" />
        </label>
        <datalist id="broker-source-sheets">
          <option value="GUATEMALA" />
          <option value="GWATEMALA" />
          <option value="POLONIA" />
          <option value="PERU" />
          <option value="MEXICO" />
          <option value="COLOMBIA" />
          <option value="CHILE" />
          <option value="ECUADOR" />
          <option value="COSTA RICA" />
        </datalist>
        <p style={{ margin: 0, opacity: 0.65, fontSize: "0.9rem" }}>
          Si el Excel usa una variante con o sin tilde, la importación la resuelve igual.
        </p>
        <input className="input" type="file" name="file" accept=".xlsx,.xls" required />
        <button className="button" type="submit" disabled={leadPending}>
          {leadPending ? "Importando..." : "Importar leads"}
        </button>
        {leadState.message ? (
          <div style={{ color: leadState.success ? "#166534" : "#991b1b", fontWeight: 700 }}>{leadState.message}</div>
        ) : null}
      </form>

      <form action={invoiceAction} className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3>Importar facturacion brokers</h3>
        <p style={{ margin: 0, opacity: 0.75 }}>
          Importa el Excel FV, detecta umbral 100h/200h y contrasta RESUMEN_FV.
        </p>
        <input className="input" type="file" name="file" accept=".xlsx,.xls" required />
        <button className="button" type="submit" disabled={invoicePending}>
          {invoicePending ? "Importando..." : "Importar facturacion"}
        </button>
        {invoiceState.message ? (
          <div style={{ color: invoiceState.success ? "#166534" : "#991b1b", fontWeight: 700 }}>{invoiceState.message}</div>
        ) : null}
      </form>
    </div>
  );
}
