"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { t, type AppLanguage } from "@/lib/i18n";

type ReviewStatus = "OPEN" | "ACKNOWLEDGED" | "CLOSED";

interface BillingReviewControlsProps {
  reviewId: string;
  status: ReviewStatus;
  note: string | null;
  reviewedAt: string | null;
  language: AppLanguage;
}

export default function BillingReviewControls({
  reviewId,
  status: initialStatus,
  note: initialNote,
  reviewedAt: initialReviewedAt,
  language,
}: BillingReviewControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialStatus === "OPEN" ? initialNote ?? "" : "");
  const [savedNote, setSavedNote] = useState(initialNote ?? "");
  const [reviewedAt, setReviewedAt] = useState(initialReviewedAt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  async function saveReview(action: "acknowledge" | "close") {
    if (busy || !note.trim()) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/billing/stripe/reviews/${encodeURIComponent(reviewId)}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, note }),
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== "object" || !("reviewStatus" in result)) {
        throw new Error("review_update_failed");
      }

      const updated = result as { reviewStatus: ReviewStatus; reviewedAt: string; note: string };
      setStatus(updated.reviewStatus);
      setReviewedAt(updated.reviewedAt);
      setSavedNote(updated.note);
      setNote(updated.reviewStatus === "ACKNOWLEDGED" ? "" : updated.note);
      setMessage("saved");
      router.refresh();
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  const statusKey = status === "CLOSED"
    ? "billing.reviewStatusClosed"
    : status === "ACKNOWLEDGED"
      ? "billing.reviewStatusAcknowledged"
      : "billing.reviewStatusOpen";

  return (
    <div className="billing-review-controls">
      <div className="billing-review-status-line">
        <span className={`billing-review-status billing-review-status--${status.toLowerCase()}`}>
          {t(language, statusKey)}
        </span>
        {reviewedAt ? <span>{t(language, "billing.reviewedAt").replace("{date}", reviewedAt)}</span> : null}
      </div>

      {status !== "OPEN" && savedNote ? (
        <p className="billing-review-note">{savedNote}</p>
      ) : null}

      {status !== "CLOSED" ? (
        <div className="billing-review-form">
          <label htmlFor={`billing-review-note-${reviewId}`}>
            {t(language, status === "ACKNOWLEDGED" ? "billing.reviewCloseNoteLabel" : "billing.reviewNoteLabel")}
          </label>
          <textarea
            id={`billing-review-note-${reviewId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            required
            disabled={busy}
            placeholder={t(language, "billing.reviewNotePlaceholder")}
          />
          <div className="billing-review-actions">
            {status === "OPEN" ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void saveReview("acknowledge")}
                disabled={busy || !note.trim()}
                aria-busy={busy}
              >
                {busy ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {t(language, "billing.reviewAcknowledge")}
              </button>
            ) : null}
            <button
              className="button"
              type="button"
              onClick={() => void saveReview("close")}
              disabled={busy || !note.trim()}
              aria-busy={busy}
            >
              {busy ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {t(language, "billing.reviewClose")}
            </button>
          </div>
        </div>
      ) : null}

      {message === "saved" ? <p className="billing-review-feedback" role="status">{t(language, "billing.reviewSaved")}</p> : null}
      {message === "error" ? <p className="form-message-error" role="alert">{t(language, "billing.reviewSaveError")}</p> : null}
    </div>
  );
}
