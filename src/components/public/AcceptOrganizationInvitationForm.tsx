"use client";

import { useActionState } from "react";
import Link from "next/link";
import { acceptInvitationAction } from "@/app/actions/invitations";
import { t, type AppLanguage } from "@/lib/i18n";

const initialState = { error: "", accepted: false };

export default function AcceptOrganizationInvitationForm({
  token,
  language,
  requiresNewAccount,
  invitedName,
}: {
  token: string;
  language: AppLanguage;
  requiresNewAccount: boolean;
  invitedName: string;
}) {
  const [state, formAction, pending] = useActionState(acceptInvitationAction, initialState);
  const labels = t.bind(null, language);

  if (state.accepted) {
    return (
      <div className="compact-stack">
        <p role="status" className="public-login-success">{state.error}</p>
        <Link href={`/login?lang=${language}`} className="button">
          {labels("public.nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="compact-stack">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="language" value={language} />
      {state.error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 700 }}>{state.error}</p>
      ) : null}
      {requiresNewAccount ? (
        <>
          <div className="input-group">
            <label className="label" htmlFor="invite-full-name">{labels("invite.acceptName")}</label>
            <input
              id="invite-full-name"
              name="fullName"
              type="text"
              className="input"
              defaultValue={invitedName}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="invite-password">{labels("invite.acceptPassword")}</label>
            <input
              id="invite-password"
              name="password"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
          </div>
        </>
      ) : null}
      <button type="submit" className="button" disabled={pending}>
        {pending ? labels("invite.accepting") : labels("invite.acceptButton")}
      </button>
      <span className="sr-only" aria-live="polite">{pending ? labels("invite.accepting") : ""}</span>
    </form>
  );
}
