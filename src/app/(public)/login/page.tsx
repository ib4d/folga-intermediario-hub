"use client";

import { useState } from "react";
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
  const labels = t.bind(null, language);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/dashboard",
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
      footer={
        <span>
          {labels("login.footer")}
        </span>
      }
    >
      <div style={{ display: "grid", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <LanguageSwitcher currentLanguage={language} />
        </div>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{labels("login.title")}</div>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {labels("login.description")}
          </p>
        </div>

        {error ? (
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
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
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

          <div className="input-group" style={{ marginBottom: 0 }}>
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

          <button
            type="submit"
            className="button"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? labels("login.submitting") : labels("login.submit")}
          </button>
        </form>

        <form action={clearSessionAction}>
          <button
            type="submit"
            className="button button-secondary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {labels("login.clearSession")}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
