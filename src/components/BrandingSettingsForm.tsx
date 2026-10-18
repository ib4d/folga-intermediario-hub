"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CheckCircle, Loader2, Save } from "lucide-react";
import { updateOrganizationBranding } from "@/app/actions/settings";
import BrandLogo from "@/components/BrandLogo";
import { AppLanguage, t } from "@/lib/i18n";

type Props = {
  organizationName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  language: AppLanguage;
};

export default function BrandingSettingsForm({
  organizationName,
  primaryColor: initialPrimaryColor,
  secondaryColor: initialSecondaryColor,
  logoUrl: initialLogoUrl,
  language,
}: Props) {
  const labels = t.bind(null, language);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoError, setLogoError] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        await updateOrganizationBranding({ primaryColor, secondaryColor, logoUrl });
        setMessage("saved");
      } catch {
        setMessage("error");
      }
    });
  };

  return (
    <div className="card settings-form-card branding-settings-card">
      <div className="branding-settings-preview">
        <span className="branding-settings-preview-label">{labels("settings.brandPreview")}</span>
        <div className="branding-settings-preview-content" style={{ color: secondaryColor }}>
          {logoUrl && !logoError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={labels("settings.logoCurrent")}
              onError={() => setLogoError(true)}
              className="branding-settings-preview-logo"
            />
          ) : (
            <div className="branding-settings-default-logo">
              <BrandLogo variant="green" />
              <strong>{organizationName}</strong>
            </div>
          )}
          <span className="branding-settings-preview-accent" style={{ backgroundColor: primaryColor }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="branding-settings-form">
        <div className="branding-settings-field branding-settings-logo-field">
          <label className="label" htmlFor="branding-logo-url">{labels("settings.logoUrl")}</label>
          <input
            id="branding-logo-url"
            type="url"
            value={logoUrl}
            onChange={(event) => {
              setLogoUrl(event.target.value);
              setLogoError(false);
              setMessage(null);
            }}
            placeholder="https://example.com/logo.png"
            className="input"
          />
          <p className="ajustes-settings-help">{labels("settings.logoUrlHelp")}</p>
          {logoError ? <p className="branding-settings-image-error">{labels("settings.logoPreviewError")}</p> : null}
        </div>

        <div className="branding-settings-colors">
          <div className="branding-settings-field">
            <label className="label" htmlFor="branding-primary-color">{labels("settings.primaryColor")}</label>
            <div className="branding-settings-color-control">
              <input
                id="branding-primary-color"
                type="color"
                value={primaryColor}
                onChange={(event) => {
                  setPrimaryColor(event.target.value);
                  setMessage(null);
                }}
                aria-label={labels("settings.primaryColor")}
              />
              <output htmlFor="branding-primary-color">{primaryColor.toUpperCase()}</output>
            </div>
          </div>
          <div className="branding-settings-field">
            <label className="label" htmlFor="branding-secondary-color">{labels("settings.secondaryColor")}</label>
            <div className="branding-settings-color-control">
              <input
                id="branding-secondary-color"
                type="color"
                value={secondaryColor}
                onChange={(event) => {
                  setSecondaryColor(event.target.value);
                  setMessage(null);
                }}
                aria-label={labels("settings.secondaryColor")}
              />
              <output htmlFor="branding-secondary-color">{secondaryColor.toUpperCase()}</output>
            </div>
          </div>
        </div>

        {message ? (
          <p className={message === "saved" ? "form-message-success" : "form-message-error"} role="status">
            {labels(message === "saved" ? "settings.preferencesSaved" : "settings.preferencesSaveError")}
          </p>
        ) : null}
        <button type="submit" className="button branding-settings-submit" disabled={isPending}>
          {isPending ? <Loader2 size={17} className="animate-spin" /> : message === "saved" ? <CheckCircle size={17} /> : <Save size={17} />}
          {isPending ? labels("common.saving") : message === "saved" ? labels("common.saved") : labels("settings.saveChanges")}
        </button>
      </form>
    </div>
  );
}
