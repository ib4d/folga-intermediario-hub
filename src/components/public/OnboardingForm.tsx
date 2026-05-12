"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/app/actions/organization";

const initialOrganizationState = {
  error: "",
};

export default function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(
    createOrganizationAction,
    initialOrganizationState
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>Crea tu organizacion</div>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Define el espacio de trabajo inicial para empezar a operar en Folga Hub.
        </p>
      </div>

      {state.error ? (
        <div
          style={{
            padding: "0.85rem 1rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            border: "2px solid #991b1b",
            fontSize: "0.875rem",
            fontWeight: 700,
          }}
        >
          {state.error}
        </div>
      ) : null}

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="label" htmlFor="name">
          Nombre de la empresa o agencia
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="input"
          placeholder="Ej: Folga Recruitment"
          required
          disabled={isPending}
        />
      </div>

      <button
        type="submit"
        className="button"
        style={{ width: "100%", marginTop: "0.5rem" }}
        disabled={isPending}
      >
        {isPending ? "Creando organizacion..." : "Crear organizacion"}
      </button>

      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
        Al crear una organizacion aceptas los terminos del servicio y la politica de
        privacidad de la plataforma.
      </p>
    </form>
  );
}
