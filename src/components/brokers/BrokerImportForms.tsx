"use client";

import { useActionState } from "react";
import { importBrokerInvoicesAction, importBrokerLeadsAction } from "@/app/actions/brokers";

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
      message: `Hojas de facturación importadas: ${result.totalSheets}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo importar facturación.",
    };
  }
}

export default function BrokerImportForms() {
  const [leadState, leadAction, leadPending] = useActionState(importLeadsState, initialState);
  const [invoiceState, invoiceAction, invoicePending] = useActionState(importInvoicesState, initialState);

  return (
    <div className="broker-import-grid">
      <form action={leadAction} className="card broker-import-card">
        <h3 className="broker-import-section-title">Importar leads de brokers</h3>
        <p className="broker-import-copy">
          Usa POŚREDNICY LATAM o tu plantilla por país. Puedes escribir el nombre exacto del tab para adaptar
          Polonia, Perú, México u otros países.
        </p>
        <label className="input-group">
          <span>Nombre exacto del tab</span>
          <input
            className="input"
            type="text"
            name="sourceCountrySheet"
            list="broker-source-sheets"
            defaultValue="GUATEMALA"
          />
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
        <p className="broker-import-note">
          Si el Excel usa una variante con o sin tilde, la importación la resuelve igual.
        </p>
        <input className="input" type="file" name="file" accept=".xlsx,.xls" required />
        <button className="button" type="submit" disabled={leadPending}>
          {leadPending ? "Importando..." : "Importar leads"}
        </button>
        {leadState.message ? (
          <div className={`broker-import-message ${leadState.success ? "success" : "error"}`}>
            {leadState.message}
          </div>
        ) : null}
      </form>

      <form action={invoiceAction} className="card broker-import-card">
        <h3 className="broker-import-section-title">Importar facturación de brokers</h3>
        <p className="broker-import-copy">
          Importa el Excel FV, detecta umbral 100h/200h y contrasta RESUMEN_FV.
        </p>
        <input className="input" type="file" name="file" accept=".xlsx,.xls" required />
        <button className="button" type="submit" disabled={invoicePending}>
          {invoicePending ? "Importando..." : "Importar facturación"}
        </button>
        {invoiceState.message ? (
          <div className={`broker-import-message ${invoiceState.success ? "success" : "error"}`}>
            {invoiceState.message}
          </div>
        ) : null}
      </form>
    </div>
  );
}
