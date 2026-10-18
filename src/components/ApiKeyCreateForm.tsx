"use client";

import { useActionState, useState } from "react";
import { CheckCircle, Clipboard, Key, Loader2, Plus } from "lucide-react";
import { createApiKeyFormAction } from "@/app/actions/settings";
import { AppLanguage, t } from "@/lib/i18n";

const initialState = {
  error: "",
  key: "",
  name: "",
};

export default function ApiKeyCreateForm({ language }: { language: AppLanguage }) {
  const [state, formAction, isPending] = useActionState(createApiKeyFormAction, initialState);
  const [copied, setCopied] = useState(false);
  const labels = t.bind(null, language);

  const copyKey = async () => {
    if (!state.key) return;
    await navigator.clipboard.writeText(state.key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="card settings-form-card settings-api-create-card">
      <h2 className="settings-card-heading">{labels("settings.createApiKey")}</h2>
      <form action={formAction} className="settings-api-create-form">
        <div className="settings-api-name-field">
          <label htmlFor="keyName" className="label">{labels("settings.apiKeyName")}</label>
          <input
            id="keyName"
            name="name"
            type="text"
            placeholder={labels("settings.apiKeyNameExample")}
            required
            className="input"
          />
        </div>
        <button type="submit" className="button settings-api-create-button" disabled={isPending}>
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {isPending ? labels("settings.creatingKey") : labels("settings.createKey")}
        </button>
      </form>

      {state.error ? (
        <div className="alert-card danger settings-api-message" role="alert">
          {state.error}
        </div>
      ) : null}

      {state.key ? (
        <div className="alert-card success settings-api-result" role="status">
          <div className="settings-api-result-title">
            <Key size={18} />
            {labels("settings.keyCreated")}: {state.name}
          </div>
          <p>
            {labels("settings.copyKeyOnce")}
          </p>
          <div className="settings-api-key-copy-row">
            <code>{state.key}</code>
            <button type="button" className="button button-secondary" onClick={copyKey}>
              {copied ? <CheckCircle size={16} /> : <Clipboard size={16} />}
              {copied ? labels("settings.copied") : labels("settings.copy")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
