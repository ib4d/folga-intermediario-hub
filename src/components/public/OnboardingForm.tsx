"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createOrganizationAction } from "@/app/actions/organization";

type OnboardingFormProps = {
  mode: "standard" | "demo";
  title: string;
  description: string;
  stepsLabel: string;
  steps: readonly string[];
  nameLabel: string;
  namePlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  footerText: string;
  requiresAccount: boolean;
  accountTitle: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  existingAccountLabel: string;
  existingAccountAction: string;
  existingAccountHref: string;
};

const initialOrganizationState = {
  error: "",
};

export default function OnboardingForm({
  mode,
  title,
  description,
  stepsLabel,
  steps,
  nameLabel,
  namePlaceholder,
  submitLabel,
  submittingLabel,
  footerText,
  requiresAccount,
  accountTitle,
  fullNameLabel,
  fullNamePlaceholder,
  emailLabel,
  emailPlaceholder,
  passwordLabel,
  passwordPlaceholder,
  existingAccountLabel,
  existingAccountAction,
  existingAccountHref,
}: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    createOrganizationAction,
    initialOrganizationState
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: "1.25rem" }}>
      <input type="hidden" name="mode" value={mode} />
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

      {requiresAccount ? (
        <div
          style={{
            border: "1px solid rgba(11, 5, 0, 0.12)",
            background: "rgba(255, 255, 255, 0.72)",
            padding: "0.95rem 1rem",
            display: "grid",
            gap: "0.9rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <div style={{ fontWeight: 900, fontSize: "0.92rem" }}>{accountTitle}</div>
            <div style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.5 }}>
              {existingAccountLabel}{" "}
              <Link href={existingAccountHref} style={{ fontWeight: 800, color: "var(--pitch-black)" }}>
                {existingAccountAction}
              </Link>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="fullName">
              {fullNameLabel}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="input"
              placeholder={fullNamePlaceholder}
              required
              disabled={isPending}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="email">
              {emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder={emailPlaceholder}
              required
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="password">
              {passwordLabel}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder={passwordPlaceholder}
              required
              disabled={isPending}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        </div>
      ) : null}

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
