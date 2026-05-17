"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, Shield, Save, CheckCircle, Loader2 } from "lucide-react";

type Settings = {
  notifyNewCandidates: boolean;
  notifyLegalAlerts: boolean;
  notifyExpiringDocs: boolean;
  twoFactorEnabled: boolean;
  interfaceLanguage: "es" | "pl" | "en";
  avatarUrl?: string;
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
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Error al guardar preferencias");
      }
    });
  };

  const toggle = (key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Seguridad */}
      <div className="card" style={{ backgroundColor: "var(--white-smoke)" }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield size={20} /> Perfil y Seguridad
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
                onChange={(e) => setSettings({ ...settings, avatarUrl: e.target.value })}
                style={{ marginBottom: "0.5rem" }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>Pega una URL pública o súbela a tu proveedor de almacenamiento.</p>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label className="label">Autenticación en 2 Pasos (2FA)</label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <div
              onClick={() => toggle("twoFactorEnabled")}
              style={{
                width: "48px",
                height: "26px",
                backgroundColor: settings.twoFactorEnabled ? "var(--pitch-black)" : "#ccc",
                borderRadius: "13px",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
                border: "2px solid var(--pitch-black)",
              }}
            >
              <div style={{
                position: "absolute",
                top: "1px",
                left: settings.twoFactorEnabled ? "22px" : "1px",
                width: "20px",
                height: "20px",
                backgroundColor: settings.twoFactorEnabled ? "var(--amber-flame)" : "white",
                borderRadius: "50%",
                transition: "left 0.2s",
              }} />
            </div>
            <span>{settings.twoFactorEnabled ? "Activado" : "Desactivado"}</span>
          </label>
        </div>

        <div className="input-group" style={{ marginTop: "1rem" }}>
          <label className="label">Cambiar Contraseña</label>
          <button
            className="button button-secondary"
            style={{ width: "100%" }}
            onClick={() => alert("Función de cambio de contraseña: próximamente disponible.")}
          >
            Actualizar Contraseña
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "1rem" }}>Idioma de Interfaz</h3>
        <div className="input-group">
          <label className="label" htmlFor="interface-language">
            Idioma preferido
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
            <option value="es">Espanol</option>
            <option value="pl">Polski</option>
            <option value="en">English</option>
          </select>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
            Base preparada para ES, PL y EN. Las pantallas se iran conectando a traducciones por modulo.
          </p>
        </div>
        <button
          className="button"
          style={{ width: "100%", marginTop: "0.75rem" }}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Guardando..." : saved ? "Guardado" : "Guardar idioma"}
        </button>
      </div>

      {/* Notificaciones */}
      <div className="card">
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Bell size={20} /> Notificaciones por Email
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
            <><CheckCircle size={18} /> ¡Guardado!</>
          ) : (
            <><Save size={18} /> Guardar Preferencias</>
          )}
        </button>
      </div>
    </div>
  );
}
