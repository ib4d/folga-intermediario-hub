"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getOrganizationSignupVerificationInfo,
  verifyOrganizationSignupAction,
} from "@/app/actions/organization";
import AuthShell from "@/components/public/AuthShell";
import { t } from "@/lib/i18n";

type LookupStatus = "checking" | "valid" | "invalid" | "error" | "existing";

export default function OrganizationSignupVerification({
  language,
  status,
  error,
}: {
  language: "es" | "en" | "pl";
  status: string;
  error: string;
}) {
  const labels = t.bind(null, language);
  const [token, setToken] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("checking");

  useEffect(() => {
    let active = true;
    const scheduleLookupStatus = (nextStatus: LookupStatus) => {
      void Promise.resolve().then(() => {
        if (active) setLookupStatus(nextStatus);
      });
    };
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const linkToken = fragment.get("token") ?? "";

    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    if (status === "existing") {
      return () => {
        active = false;
      };
    }

    if (!/^[A-Za-z0-9_-]{43}$/.test(linkToken) || status === "invalid" || status === "error") {
      scheduleLookupStatus(status === "error" ? "error" : "invalid");
      return () => {
        active = false;
      };
    }

    getOrganizationSignupVerificationInfo(linkToken)
      .then((result) => {
        if (!active) return;
        if (result.status === "valid") {
          setToken(linkToken);
          setOrganizationName(result.organizationName);
          setLookupStatus("valid");
        } else {
          setLookupStatus(result.status);
        }
      })
      .catch(() => {
        if (active) setLookupStatus("error");
      });

    return () => {
      active = false;
    };
  }, [status]);

  const currentLookupStatus = status === "existing" ? "existing" : lookupStatus;
  const valid = currentLookupStatus === "valid";
  const description = valid
    ? labels("onboarding.verifyDescription").replace("{organization}", organizationName)
    : currentLookupStatus === "existing"
      ? labels("onboarding.verifyExisting")
      : currentLookupStatus === "checking"
        ? labels("onboarding.verifyLoading")
        : currentLookupStatus === "error" || status === "error"
          ? labels("onboarding.verifyFailure")
          : labels("onboarding.verifyInvalid");

  return (
    <AuthShell
      badge={labels("onboarding.verifyBadge")}
      title={valid ? labels("onboarding.verifyTitle") : labels("onboarding.verifyBadge")}
      description={description}
    >
      {valid ? (
        <form action={verifyOrganizationSignupAction} className="public-login-form">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="language" value={language} />
          {error === "password" ? (
            <p role="alert" className="public-login-error">{labels("onboarding.verifyPasswordError")}</p>
          ) : null}
          <div className="input-group public-login-field">
            <label className="label" htmlFor="signup-password">{labels("onboarding.passwordLabel")}</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              className="input"
              placeholder={labels("onboarding.passwordPlaceholder")}
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
          </div>
          <div className="input-group public-login-field">
            <label className="label" htmlFor="signup-confirm-password">{labels("onboarding.confirmPasswordLabel")}</label>
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              className="input"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
            />
          </div>
          <button type="submit" className="button public-login-submit">
            {labels("onboarding.verifySubmit")}
          </button>
        </form>
      ) : currentLookupStatus === "checking" ? (
        <p role="status" className="public-login-success">{labels("onboarding.verifyLoading")}</p>
      ) : (
        <div className="compact-stack">
          {currentLookupStatus === "existing" ? null : (
            <p role="alert" className="public-login-error">
              {currentLookupStatus === "error" || status === "error"
                ? labels("onboarding.verifyFailure")
                : labels("onboarding.verifyInvalid")}
            </p>
          )}
          {currentLookupStatus === "existing" ? (
            <Link href={`/login?lang=${language}`} className="button">
              {labels("onboarding.existingAccountAction")}
            </Link>
          ) : null}
          <Link href={`/onboarding?lang=${language}`} className="button">
            {labels("onboarding.submit")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
