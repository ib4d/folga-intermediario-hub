"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type IntegrityIssue = {
  id: string;
  type: string;
  number: string | null;
  candidateId: string;
  candidateName: string;
  ocrStatus: string | null;
  isVerified: boolean;
  url: string;
  reason: string;
};

type IntegrityResult = {
  checkedAt: string;
  totalDocuments: number;
  accessibleDocuments: number;
  brokenDocuments: number;
  verifiedDocuments: number;
  manualReviewDocuments: number;
  pendingReviewDocuments: number;
  issues: IntegrityIssue[];
};

type Labels = {
  title: string;
  description: string;
  button: string;
  checking: string;
  accessible: string;
  broken: string;
  verified: string;
  manual: string;
  pending: string;
  lastChecked: string;
  emptyIssues: string;
  issueLabel: string;
  candidateLabel: string;
  statusLabel: string;
  urlLabel: string;
  error: string;
};

export default function DocumentIntegrityCard({ labels }: { labels: Labels }) {
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasIssues = useMemo(() => (result?.issues?.length ?? 0) > 0, [result]);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/documents/integrity", { method: "GET" });
      const payload = (await response.json()) as
        | { success: true; integrity: IntegrityResult }
        | { success: false; message?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? labels.error : payload.message || labels.error);
      }

      setResult(payload.integrity);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: "2rem", padding: "1.25rem 1.5rem" }}>
      <div className="card-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h2 style={{ marginBottom: "0.35rem" }}>{labels.title}</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem", maxWidth: "760px" }}>
            {labels.description}
          </p>
        </div>
        <button className="button button-secondary" onClick={runCheck} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {loading ? labels.checking : labels.button}
        </button>
      </div>

      {error ? (
        <p className="form-message-error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}

      <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
        <div className="card" style={{ padding: "1rem", backgroundColor: "#ecfdf5" }}>
          <div className="card-header">
            <h3>{labels.accessible}</h3>
            <CheckCircle2 size={20} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1 }}>
            {result ? result.accessibleDocuments : "-"}
          </div>
        </div>

        <div className="card" style={{ padding: "1rem", backgroundColor: "#fff7ed" }}>
          <div className="card-header">
            <h3>{labels.broken}</h3>
            <AlertTriangle size={20} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1 }}>
            {result ? result.brokenDocuments : "-"}
          </div>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <div className="card-header">
            <h3>{labels.verified}</h3>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, lineHeight: 1 }}>
            {result ? result.verifiedDocuments : "-"}
          </div>
          <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>
            {labels.manual}: {result ? result.manualReviewDocuments : "-"} | {labels.pending}: {result ? result.pendingReviewDocuments : "-"}
          </p>
        </div>
      </div>

      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700 }}>
            {labels.lastChecked}: {new Date(result.checkedAt).toLocaleString()}
          </p>
          {hasIssues ? (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {result.issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    border: "1px solid #fca5a5",
                    background: "#fff1f2",
                    padding: "0.85rem 1rem",
                    display: "grid",
                    gap: "0.35rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.9rem" }}>
                      {labels.issueLabel}:{" "}
                      {issue.type}
                      {issue.number ? ` (${issue.number})` : ""}
                    </strong>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#991b1b" }}>
                      {issue.reason}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {labels.candidateLabel}: {issue.candidateName} | {labels.statusLabel}: {issue.ocrStatus || "PENDING"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", wordBreak: "break-all" }}>
                    {labels.urlLabel}: {issue.url}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #86efac",
                background: "#f0fdf4",
                padding: "0.9rem 1rem",
                color: "#166534",
                fontWeight: 700,
                fontSize: "0.875rem",
              }}
            >
              {labels.emptyIssues}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
