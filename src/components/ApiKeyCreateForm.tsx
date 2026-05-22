"use client";

import { useActionState, useState } from "react";
import { CheckCircle, Clipboard, Key, Loader2, Plus } from "lucide-react";
import { createApiKeyFormAction } from "@/app/actions/settings";

const initialState = {
  error: "",
  key: "",
  name: "",
};

export default function ApiKeyCreateForm() {
  const [state, formAction, isPending] = useActionState(createApiKeyFormAction, initialState);
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    if (!state.key) return;
    await navigator.clipboard.writeText(state.key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>Crear nueva API Key</h2>
      <form action={formAction} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <label htmlFor="keyName" style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>
            Nombre descriptivo
          </label>
          <input
            id="keyName"
            name="name"
            type="text"
            placeholder="Ej: Integracion CRM"
            required
            className="input"
            style={{ width: "100%" }}
          />
        </div>
        <button type="submit" className="button" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} disabled={isPending}>
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {isPending ? "Creando..." : "Crear Key"}
        </button>
      </form>

      {state.error ? (
        <div className="alert-card danger" style={{ marginTop: "1rem" }}>
          {state.error}
        </div>
      ) : null}

      {state.key ? (
        <div className="alert-card success" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", fontWeight: 900 }}>
            <Key size={18} />
            API key creada: {state.name}
          </div>
          <p style={{ marginTop: 0 }}>
            Copia esta clave ahora. Por seguridad no volvera a mostrarse.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "stretch", flexWrap: "wrap" }}>
            <code
              style={{
                flex: "1 1 320px",
                padding: "0.85rem",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "white",
                overflowX: "auto",
                whiteSpace: "nowrap",
              }}
            >
              {state.key}
            </code>
            <button type="button" className="button button-secondary" onClick={copyKey}>
              {copied ? <CheckCircle size={16} /> : <Clipboard size={16} />}
              {copied ? "Copiada" : "Copiar"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
