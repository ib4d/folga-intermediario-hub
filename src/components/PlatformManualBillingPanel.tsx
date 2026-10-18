"use client";

import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  activateManualPlanAction,
  revokeManualPlanAction,
  type ManualBillingActionState,
} from "@/app/actions/platform-billing";
import { t, type AppLanguage, type TranslationKey } from "@/lib/i18n";

type OrganizationBillingRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  storedPlan: string;
  effectivePlan: string;
  provider: string;
  status: string;
  validUntil: string;
};

type ManualBillingAuditRow = {
  id: string;
  organization: string;
  actor: string;
  action: string;
  plan: string;
  periodEnd: string;
  proposalReference: string;
  invoiceReference: string;
  paymentReference: string;
  createdAt: string;
};

const initialState: ManualBillingActionState = { error: "", success: "" };

function ActionFeedback({
  state,
  language,
}: {
  state: ManualBillingActionState;
  language: AppLanguage;
}) {
  const messageKey = state.error || state.success;
  if (!messageKey) return null;
  return (
    <div className={`platform-manual-billing-feedback ${state.error ? "is-error" : "is-success"}`} role={state.error ? "alert" : "status"}>
      {t(language, messageKey as TranslationKey)}
    </div>
  );
}

export default function PlatformManualBillingPanel({
  language,
  organizations,
  auditEntries,
}: {
  language: AppLanguage;
  organizations: OrganizationBillingRow[];
  auditEntries: ManualBillingAuditRow[];
}) {
  const [activationState, activationAction, activationPending] = useActionState(activateManualPlanAction, initialState);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeManualPlanAction, initialState);
  const labels = t.bind(null, language);

  return (
    <div className="platform-admin-page platform-manual-billing-page">
      <section className="hero-section platform-admin-hero">
        <div>
          <p className="platform-manual-billing-eyebrow">{labels("platformBilling.eyebrow")}</p>
          <h1>{labels("platformBilling.title")}</h1>
          <p>{labels("platformBilling.description")}</p>
        </div>
      </section>

      <div className="alert-card warning platform-manual-billing-notice">
        <ShieldCheck size={20} />
        <div>
          <strong>{labels("platformBilling.guardrailTitle")}</strong>
          <p>{labels("platformBilling.guardrailCopy")}</p>
        </div>
      </div>

      <section className="card platform-admin-section platform-manual-billing-card">
        <div className="card-header"><h2>{labels("platformBilling.activateTitle")}</h2></div>
        <p className="platform-admin-section-copy">{labels("platformBilling.activateCopy")}</p>
        {organizations.length === 0 ? (
          <p className="billing-empty-note">{labels("platformBilling.noOrganizations")}</p>
        ) : (
          <form action={activationAction} className="platform-manual-billing-form">
            <label>
              <span>{labels("platformBilling.organization")}</span>
              <select name="organizationId" required defaultValue="">
                <option value="" disabled>{labels("platformBilling.selectOrganization")}</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id} disabled={!organization.isActive}>
                    {organization.name} · {organization.slug}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{labels("platformBilling.plan")}</span>
              <select name="plan" required defaultValue="STARTER">
                <option value="STARTER">STARTER</option>
                <option value="PRO">PRO</option>
                <option value="BUSINESS">BUSINESS</option>
              </select>
            </label>
            <label>
              <span>{labels("platformBilling.validUntil")}</span>
              <input name="validUntil" type="date" required />
            </label>
            <label>
              <span>{labels("platformBilling.proposalReference")}</span>
              <input name="proposalReference" type="text" maxLength={100} required />
            </label>
            <label>
              <span>{labels("platformBilling.invoiceReference")}</span>
              <input name="invoiceReference" type="text" maxLength={100} required />
            </label>
            <label>
              <span>{labels("platformBilling.paymentReference")}</span>
              <input name="paymentReference" type="text" maxLength={100} required />
            </label>
            <label className="platform-manual-billing-confirm">
              <input name="paymentConfirmed" type="checkbox" required />
              <span>{labels("platformBilling.paymentConfirmed")}</span>
            </label>
            <p className="platform-manual-billing-help">{labels("platformBilling.extensionRule")}</p>
            <button className="button button-primary" type="submit" disabled={activationPending}>
              {activationPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {activationPending ? labels("platformBilling.saving") : labels("platformBilling.activate")}
            </button>
            <ActionFeedback state={activationState} language={language} />
          </form>
        )}
      </section>

      <section className="card platform-admin-section platform-manual-billing-card">
        <div className="card-header"><h2>{labels("platformBilling.revokeTitle")}</h2></div>
        <p className="platform-admin-section-copy">{labels("platformBilling.revokeCopy")}</p>
        <form action={revokeAction} className="platform-manual-billing-form">
          <label>
            <span>{labels("platformBilling.organization")}</span>
            <select name="organizationId" required defaultValue="">
              <option value="" disabled>{labels("platformBilling.selectOrganization")}</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id} disabled={!organization.isActive}>
                  {organization.name} · {organization.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="platform-manual-billing-wide-field">
            <span>{labels("platformBilling.revokeReason")}</span>
            <textarea name="reason" rows={3} maxLength={500} required />
          </label>
          <label className="platform-manual-billing-confirm">
            <input name="revokeConfirmed" type="checkbox" required />
            <span>{labels("platformBilling.revokeConfirmed")}</span>
          </label>
          <button className="button button-secondary" type="submit" disabled={revokePending}>
            {revokePending ? <Loader2 size={16} className="animate-spin" /> : null}
            {revokePending ? labels("platformBilling.saving") : labels("platformBilling.revoke")}
          </button>
          <ActionFeedback state={revokeState} language={language} />
        </form>
      </section>

      <section className="card platform-admin-section platform-manual-billing-card">
        <div className="card-header"><h2>{labels("platformBilling.currentTitle")}</h2></div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platformBilling.organization")}</th>
                <th>{labels("platformBilling.storedPlan")}</th>
                <th>{labels("platformBilling.effectivePlan")}</th>
                <th>{labels("platformBilling.provider")}</th>
                <th>{labels("platformBilling.subscriptionStatus")}</th>
                <th>{labels("platformBilling.validUntil")}</th>
              </tr>
            </thead>
            <tbody>
              {organizations.length ? organizations.map((organization) => (
                <tr key={organization.id}>
                  <td className="platform-admin-table-name">{organization.name}<div className="platform-admin-table-meta">{organization.slug}</div></td>
                  <td>{organization.storedPlan}</td>
                  <td><strong>{organization.effectivePlan}</strong></td>
                  <td>{organization.provider}</td>
                  <td>{organization.status}</td>
                  <td>{organization.validUntil || labels("billing.notAvailable")}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="platform-admin-table-empty">{labels("platformBilling.noOrganizations")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card platform-admin-section platform-manual-billing-card">
        <div className="card-header"><h2>{labels("platformBilling.auditTitle")}</h2></div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platformBilling.organization")}</th>
                <th>{labels("platformBilling.subscriptionStatus")}</th>
                <th>{labels("platformBilling.actor")}</th>
                <th>{labels("platformBilling.plan")}</th>
                <th>{labels("platformBilling.validUntil")}</th>
                <th>{labels("platformBilling.invoiceReference")}</th>
                <th>{labels("platformBilling.paymentReference")}</th>
                <th>{labels("platformBilling.proposalReference")}</th>
                <th>{labels("platform.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {auditEntries.length ? auditEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.organization}</td>
                  <td>{entry.action === "MANUAL_PLAN_ACTIVATED"
                    ? labels("platformBilling.eventActivated")
                    : entry.action === "MANUAL_PLAN_EXTENDED"
                      ? labels("platformBilling.eventExtended")
                      : labels("platformBilling.eventRevoked")}</td>
                  <td>{entry.actor}</td>
                  <td>{entry.plan}</td>
                  <td>{entry.periodEnd || labels("billing.notAvailable")}</td>
                  <td>{entry.invoiceReference || labels("billing.notAvailable")}</td>
                  <td>{entry.paymentReference || labels("billing.notAvailable")}</td>
                  <td>{entry.proposalReference || labels("billing.notAvailable")}</td>
                  <td>{entry.createdAt}</td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="platform-admin-table-empty">{labels("platformBilling.auditNoRows")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
