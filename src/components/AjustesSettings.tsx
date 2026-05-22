"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Bell, CheckCircle, Loader2, Save, Shield } from "lucide-react";
import { AppLanguage, LANGUAGE_LABELS, SUPPORTED_LANGUAGES, t } from "@/lib/i18n";

type Settings = {
  notifyNewCandidates: boolean;
  notifyLegalAlerts: boolean;
  notifyExpiringDocs: boolean;
  twoFactorEnabled: boolean;
  interfaceLanguage: AppLanguage;
  avatarUrl?: string;
};

type PasswordMessage = {
  type: "success" | "error";
  text: string;
};

const defaultSettings: Settings = {
  notifyNewCandidates: true,
  notifyLegalAlerts: true,
  notifyExpiringDocs: true,
  twoFactorEnabled: false,
  interfaceLanguage: "es",
};

export default function AjustesSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<PasswordMessage | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const [isPending, startTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const labels = t.bind(null, settings.interfaceLanguage);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings((previous) => ({ ...previous, ...data }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Error al guardar preferencias");
      }
    });
  };

  const toggle = (key: keyof Settings) => {
    setSettings((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const handlePasswordUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.nextPassword.length < 12) {
      setPasswordMessage({ type: "error", text: "La nueva contrasena necesita minimo 12 caracteres." });
      return;
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "La confirmacion no coincide." });
      return;
    }

    startPasswordTransition(async () => {
      const response = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          nextPassword: passwordForm.nextPassword,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setPasswordMessage({ type: "error", text: payload.error ?? "No se pudo actualizar la contrasena." });
        return;
      }

      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
      setPasswordMessage({ type: "success", text: "Contrasena actualizada correctamente." });
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div className="card" style={{ backgroundColor: "var(--white-smoke)" }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield size={20} /> {labels("settings.profileSecurity")}
        </h3>

        <div className="input-group" style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #ccc" }}>
          <label className="label">Avatar / Foto de Perfil</label>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "var(--pitch-black)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {settings.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "20px", fontWeight: "bold" }}>U</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="url"
                className="input"
                placeholder="URL de la imagen (ej: https://ejemplo.com/foto.jpg)"
                value={settings.avatarUrl || ""}
                onChange={(event) => setSettings({ ...settings, avatarUrl: event.target.value })}
                style={{ marginBottom: "0.5rem" }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>
                Pega una URL publica o subela a tu proveedor de almacenamiento.
              </p>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="label">Autenticacion en 2 Pasos (2FA)</label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "not-allowed", opacity: 0.7 }}>
            <div
              style={{
                width: "48px",
                height: "26px",
                backgroundColor: "#ccc",
                borderRadius: "13px",
                position: "relative",
                cursor: "not-allowed",
                transition: "background 0.2s",
                border: "2px solid var(--pitch-black)",
              }}
            >
              <div style={{
                position: "absolute",
                top: "1px",
                left: "1px",
                width: "20px",
                height: "20px",
                backgroundColor: "white",
                borderRadius: "50%",
                transition: "left 0.2s",
              }} />
            </div>
            <span>Desactivado</span>
          </label>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>
            Se activara cuando el flujo 2FA este conectado a correo o autenticador.
          </p>
        </div>

        <form className="input-group" style={{ marginTop: "1rem" }} onSubmit={handlePasswordUpdate}>
          <label className="label" htmlFor="current-password">Cambiar Contrasena</label>
          <input
            id="current-password"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Contrasena actual"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            required
          />
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Nueva contrasena"
            value={passwordForm.nextPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))}
            required
            minLength={12}
          />
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Confirmar nueva contrasena"
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            required
            minLength={12}
          />
          {passwordMessage ? (
            <p className={passwordMessage.type === "success" ? "form-message-success" : "form-message-error"}>
              {passwordMessage.text}
            </p>
          ) : null}
          <button className="button button-secondary" style={{ width: "100%" }} type="submit" disabled={isPasswordPending}>
            {isPasswordPending ? <Loader2 size={18} className="animate-spin" /> : null}
            Actualizar Contrasena
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "1rem" }}>{labels("settings.interfaceLanguage")}</h3>
        <div className="input-group">
          <label className="label" htmlFor="interface-language">
            {labels("settings.preferredLanguage")}
          </label>
          <select
            id="interface-language"
            className="select"
            value={settings.interfaceLanguage}
            onChange={(event) =>
              setSettings({
                ...settings,
                interfaceLanguage: event.target.value as Settings["interfaceLanguage"],
              })
            }
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {LANGUAGE_LABELS[language]}
              </option>
            ))}
          </select>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
            {labels("settings.languageHelp")}
          </p>
        </div>
        <button
          className="button"
          style={{ width: "100%", marginTop: "0.75rem" }}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? labels("common.saving") : saved ? labels("common.saved") : labels("common.save")}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Bell size={20} /> {labels("settings.emailNotifications")}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {([
            { key: "notifyNewCandidates", label: "Nuevos candidatos" },
            { key: "notifyLegalAlerts", label: "Alertas legales urgentes" },
            { key: "notifyExpiringDocs", label: "Documentos a punto de expirar" },
          ] as { key: keyof Settings; label: string }[]).map(({ key, label }) => (
            <label
              key={key}
              className="label"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
              onClick={() => toggle(key)}
            >
              <input
                type="checkbox"
                checked={settings[key] as boolean}
                onChange={() => toggle(key)}
                style={{ width: "20px", height: "20px", accentColor: "var(--pitch-black)" }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <button
          className="button"
          style={{ width: "100%", marginTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <><Loader2 size={18} className="animate-spin" /> Guardando...</>
          ) : saved ? (
            <><CheckCircle size={18} /> Guardado!</>
          ) : (
            <><Save size={18} /> {labels("common.savePreferences")}</>
          )}
        </button>
      </div>
    </div>
  );
}
