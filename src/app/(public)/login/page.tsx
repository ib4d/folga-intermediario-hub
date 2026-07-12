"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import AuthShell from "@/components/public/AuthShell";
import { clearSessionAction } from "@/app/actions/auth";
import LanguageSwitcher from "@/components/public/LanguageSwitcher";
import { normalizeLanguage, t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = normalizeLanguage(searchParams.get("lang"));
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [callbackPathname, callbackQuery = ""] = callbackUrl.split("?");
  const callbackQueryParams = new URLSearchParams(callbackQuery);
  const isDemoOnboarding =
    callbackPathname === "/onboarding" && callbackQueryParams.get("mode") === "demo";
  const isStandardOnboarding = callbackPathname === "/onboarding" && !isDemoOnboarding;
  const labels = t.bind(null, language);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const contextTitle = isDemoOnboarding
    ? labels("login.demoContextTitle")
    : isStandardOnboarding
      ? labels("login.onboardingContextTitle")
      : labels("login.contextTitle");
  const contextDescription = isDemoOnboarding
    ? labels("login.demoContextDescription")
    : isStandardOnboarding
      ? labels("login.onboardingContextDescription")
      : labels("login.context");
  const contextActionLabel = isDemoOnboarding
    ? labels("login.demoContextAction")
    : isStandardOnboarding
      ? labels("login.onboardingContextAction")
      : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (result?.error) {
        setError(labels("login.invalidCredentials"));
      } else {
        router.push(result?.url || "/dashboard");
        router.refresh();
      }
    } catch {
      setError(labels("login.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge={labels("login.badge")}
      title={labels("login.shellTitle")}
      description={labels("login.shellDescription")}
      footer={<span>{labels("login.footer")}</span>}
    >
      <div className="public-login-stack">
        <div className="public-login-context">
          <div className="public-login-context-title">{contextTitle}</div>
          <div className="public-login-context-copy">{contextDescription}</div>
          {contextActionLabel ? (
            <Link href={callbackUrl} className="public-login-context-link">
              {contextActionLabel}
            </Link>
          ) : null}
        </div>

        <div className="public-login-language">
          <LanguageSwitcher currentLanguage={language} />
        </div>

        <div className="public-login-heading">
          <div className="public-login-heading-title">{labels("login.title")}</div>
          <p className="public-login-heading-copy">{labels("login.description")}</p>
        </div>

        {error ? <div className="public-login-error">{error}</div> : null}

        <form onSubmit={handleSubmit} className="public-login-form">
          <div className="input-group public-login-field">
            <label className="label" htmlFor="email">
              {labels("login.email")}
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              placeholder="tu@empresa.com"
            />
          </div>

          <div className="input-group public-login-field">
            <label className="label" htmlFor="password">
              {labels("login.password")}
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              placeholder={labels("login.passwordPlaceholder")}
            />
          </div>

          <button type="submit" className="button public-login-submit" disabled={loading}>
            {loading ? labels("login.submitting") : labels("login.submit")}
          </button>
        </form>

        <form action={clearSessionAction}>
          <button type="submit" className="button button-secondary public-login-submit" disabled={loading}>
            {labels("login.clearSession")}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
