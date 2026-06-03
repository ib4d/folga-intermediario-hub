"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/app/actions/organization";

type OnboardingFormProps = {
  title: string;
  description: string;
  stepsLabel: string;
  steps: readonly string[];
  nameLabel: string;
  namePlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  footerText: string;
};

const initialOrganizationState = {
  error: "",
};

export default function OnboardingForm({
  title,
  description,
  stepsLabel,
  steps,
  nameLabel,
  namePlaceholder,
  submitLabel,
  submittingLabel,
  footerText,
}: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    createOrganizationAction,
    initialOrganizationState
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{title}</div>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {description}
        </p>
      </div>

      <div
        style={{
          border: "1px solid rgba(11, 5, 0, 0.12)",
          background: "rgba(255, 255, 255, 0.72)",
          padding: "0.95rem 1rem",
          display: "grid",
          gap: "0.6rem",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: "0.92rem" }}>{stepsLabel}</div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.35rem", lineHeight: 1.5 }}>
          {steps.map((step) => (
            <li key={step} style={{ fontSize: "0.9rem" }}>
              {step}
            </li>
          ))}
        </ul>
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
          {nameLabel}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          className="input"
          placeholder={namePlaceholder}
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
        {isPending ? submittingLabel : submitLabel}
      </button>

      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
        {footerText}
      </p>
    </form>
  );
}
