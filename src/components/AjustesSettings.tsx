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
  const [settingsMessage, setSettingsMessage] = useState<PasswordMessage | null>(null);
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
      setSettingsMessage(null);
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        setSettingsMessage({
          type: "success",
          text: labels("settings.preferencesSaved"),
        });
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSettingsMessage({
          type: "error",
          text: labels("settings.preferencesSaveError"),
        });
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
      setPasswordMessage({
        type: "error",
        text: labels("settings.passwordMinLength"),
      });
      return;
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: labels("settings.passwordMismatch"),
      });
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
        setPasswordMessage({
          type: "error",
          text: payload.error ?? labels("settings.passwordUpdateFailed"),
        });
        return;
      }

      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
      setPasswordMessage({
        type: "success",
        text: labels("settings.passwordUpdated"),
      });
    });
  };

  return (
    <div className="ajustes-settings-shell">
      <div className="card ajustes-settings-panel ajustes-settings-panel--soft">
        <h3 className="ajustes-settings-section-title">
          <Shield size={20} /> {labels("settings.profileSecurity")}
        </h3>

        <div className="input-group ajustes-settings-avatar-group">
          <label className="label">{labels("settings.avatar")}</label>
          <div className="ajustes-settings-avatar-row">
            <div className="ajustes-settings-avatar">
              {settings.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.avatarUrl} alt="Avatar" className="ajustes-settings-avatar-image" />
              ) : (
                <span className="ajustes-settings-avatar-fallback">U</span>
              )}
            </div>
            <div className="ajustes-settings-avatar-field">
              <input
                type="url"
                placeholder={labels("settings.avatarPlaceholder")}
                value={settings.avatarUrl || ""}
                onChange={(event) => setSettings({ ...settings, avatarUrl: event.target.value })}
                className="input ajustes-settings-avatar-input"
              />
              <p className="ajustes-settings-help">
                {labels("settings.avatarHelp")}
              </p>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="label">{labels("settings.twoFactor")}</label>
          <label className="ajustes-settings-toggle-label">
            <div className="ajustes-settings-toggle">
              <div className="ajustes-settings-toggle-thumb" />
            </div>
            <span>{labels("settings.disabled")}</span>
          </label>
          <p className="ajustes-settings-help">
            {labels("settings.twoFactorHelp")}
          </p>
        </div>

        <form className="input-group ajustes-settings-password-form" onSubmit={handlePasswordUpdate}>
          <label className="label" htmlFor="current-password">{labels("settings.changePassword")}</label>
          <input
            id="current-password"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder={labels("settings.currentPassword")}
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            required
          />
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder={labels("settings.newPassword")}
            value={passwordForm.nextPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, nextPassword: event.target.value }))}
            required
            minLength={12}
          />
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder={labels("settings.confirmPassword")}
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
          <button className="button button-secondary ajustes-settings-button" type="submit" disabled={isPasswordPending}>
            {isPasswordPending ? <Loader2 size={18} className="animate-spin" /> : null}
            {labels("settings.changePassword")}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="ajustes-settings-section-title">{labels("settings.interfaceLanguage")}</h3>
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
          <p className="ajustes-settings-help ajustes-settings-help--top">
            {labels("settings.languageHelp")}
          </p>
        </div>
        <button
          className="button ajustes-settings-button"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? labels("common.saving") : saved ? labels("common.saved") : labels("common.save")}
        </button>
        {settingsMessage ? (
          <p className={`${settingsMessage.type === "success" ? "form-message-success" : "form-message-error"} ajustes-settings-message`}>
            {settingsMessage.text}
          </p>
        ) : null}
      </div>

      <div className="card">
        <h3 className="ajustes-settings-section-title">
          <Bell size={20} /> {labels("settings.emailNotifications")}
        </h3>

        <div className="ajustes-settings-notifications">
          {([
            { key: "notifyNewCandidates", label: labels("settings.notifyNewCandidates") },
            { key: "notifyLegalAlerts", label: labels("settings.notifyLegalAlerts") },
            { key: "notifyExpiringDocs", label: labels("settings.notifyExpiringDocs") },
          ] as { key: keyof Settings; label: string }[]).map(({ key, label }) => (
            <label
              key={key}
              className="label ajustes-settings-notification-item"
              onClick={() => toggle(key)}
            >
              <input
                type="checkbox"
                checked={settings[key] as boolean}
                onChange={() => toggle(key)}
                className="ajustes-settings-checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <button
          className="button ajustes-settings-button ajustes-settings-button--icon"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <><Loader2 size={18} className="animate-spin" /> {labels("common.saving")}</>
          ) : saved ? (
            <><CheckCircle size={18} /> {labels("common.saved")}</>
          ) : (
            <><Save size={18} /> {labels("common.savePreferences")}</>
          )}
        </button>
        {settingsMessage ? (
          <p className={`${settingsMessage.type === "success" ? "form-message-success" : "form-message-error"} ajustes-settings-message`}>
            {settingsMessage.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
