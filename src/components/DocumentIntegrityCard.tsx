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
    <div className="card module-panel">
      <div className="page-section-header">
        <div className="page-section-copy">
          <h2 className="page-section-title">{labels.title}</h2>
          <p className="page-section-description">{labels.description}</p>
        </div>
        <button className="button button-secondary" onClick={runCheck} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {loading ? labels.checking : labels.button}
        </button>
      </div>

      {error ? (
        <p className="form-message-error document-integrity-error">
          {error}
        </p>
      ) : null}

      <div className="dashboard-grid document-integrity-grid">
        <div className="card metric-card metric-card-tone-success document-integrity-metric">
          <div className="card-header">
            <h3>{labels.accessible}</h3>
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-card-value">{result ? result.accessibleDocuments : "-"}</div>
        </div>

        <div className="card metric-card metric-card-tone-danger document-integrity-metric">
          <div className="card-header">
            <h3>{labels.broken}</h3>
            <AlertTriangle size={20} />
          </div>
          <div className="metric-card-value">{result ? result.brokenDocuments : "-"}</div>
        </div>

        <div className="card metric-card document-integrity-metric">
          <div className="card-header">
            <h3>{labels.verified}</h3>
          </div>
          <div className="metric-card-value">{result ? result.verifiedDocuments : "-"}</div>
          <p className="metric-card-helper">
            {labels.manual}: {result ? result.manualReviewDocuments : "-"} | {labels.pending}: {result ? result.pendingReviewDocuments : "-"}
          </p>
        </div>
      </div>

      {result ? (
        <div className="document-integrity-body">
          <p className="document-integrity-timestamp">
            {labels.lastChecked}: {new Date(result.checkedAt).toLocaleString()}
          </p>
          {hasIssues ? (
            <div className="document-integrity-issues">
              {result.issues.map((issue) => (
                <div key={issue.id} className="document-integrity-issue">
                  <div className="document-integrity-issue-head">
                    <strong className="document-integrity-issue-title">
                      {labels.issueLabel}:{" "}
                      {issue.type}
                      {issue.number ? ` (${issue.number})` : ""}
                    </strong>
                    <span className="document-integrity-issue-reason">
                      {issue.reason}
                    </span>
                  </div>
                  <div className="document-integrity-issue-meta">
                    {labels.candidateLabel}: {issue.candidateName} | {labels.statusLabel}: {issue.ocrStatus || "PENDING"}
                  </div>
                  <div className="document-integrity-issue-url">
                    {labels.urlLabel}: {issue.url}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="document-integrity-ok">
              {labels.emptyIssues}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
