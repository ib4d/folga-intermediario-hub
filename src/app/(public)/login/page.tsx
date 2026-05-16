"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import AuthShell from "@/components/public/AuthShell";
import { clearSessionAction } from "@/app/actions/auth";

export default function LoginPage() {
  const router = useRouter();
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
        setError("Correo o contrasena incorrectos.");
      } else {
        router.push(result?.url || "/dashboard");
        router.refresh();
      }
    } catch {
      setError("Error al iniciar sesion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Acceso seguro"
      title="Entra a tu mesa de control"
      description="Accede al flujo operativo de ORI CRUIT HUB para revisar candidatos, documentos y tareas pendientes."
      footer={
        <span>
          Si tu cuenta aun no tiene organizacion asignada, el sistema te llevara al
          onboarding despues de entrar.
        </span>
      }
    >
      <div style={{ display: "grid", gap: "1.25rem" }}>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>Iniciar sesion</div>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Usa tus credenciales para continuar con el trabajo diario del equipo.
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
              Correo electronico
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
              Contrasena
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
              placeholder="Introduce tu contrasena"
            />
          </div>

          <button
            type="submit"
            className="button"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <form action={clearSessionAction}>
          <button
            type="submit"
            className="button button-secondary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            Limpiar sesion antigua
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
