"use client";

import { useState } from "react";
import { LoaderCircle, WalletCards } from "lucide-react";
import { t, type AppLanguage } from "@/lib/i18n";

interface BillingPortalButtonProps {
  language: AppLanguage;
  className?: string;
}

export default function BillingPortalButton({
  language,
  className = "button",
}: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function openPortal() {
    if (loading) return;
    setLoading(true);
    setError(false);

    try {
      const response = await fetch("/api/billing/stripe/portal", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const result: unknown = await response.json();
      const urlValue =
        result && typeof result === "object" && "url" in result
          ? result.url
          : null;
      if (!response.ok || typeof urlValue !== "string") {
        throw new Error("portal_unavailable");
      }

      const portalUrl = new URL(urlValue);
      if (
        portalUrl.protocol !== "https:" ||
        portalUrl.hostname !== "billing.stripe.com"
      ) {
        throw new Error("invalid_portal_url");
      }

      window.location.assign(portalUrl.toString());
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <span className="billing-portal-action">
      <button
        className={className}
        type="button"
        onClick={openPortal}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? <LoaderCircle size={16} className="animate-spin" /> : <WalletCards size={16} />}
        {t(language, loading ? "billing.portalOpening" : "billing.openStripePortal")}
      </button>
      {error ? (
        <span className="form-message-error" role="alert">
          {t(language, "billing.portalCreateError")}
        </span>
      ) : null}
    </span>
  );
}
