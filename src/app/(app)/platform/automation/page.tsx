import { auth } from "@/auth";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity } from "lucide-react";
import Link from "next/link";

type AutomationWorkflowFilter = "all" | "doc-expiring" | "billing-attention" | "plan-pressure";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getWorkflowTriggerLabel(triggerType: string, labels: (key: TranslationKey) => string) {
  switch (triggerType) {
    case "DOC_EXPIRING_DETECTED":
      return labels("platform.automationTriggerDocExpiring");
    case "BILLING_ATTENTION_DETECTED":
      return labels("platform.automationTriggerBillingAttention");
    case "PLAN_PRESSURE_DETECTED":
      return labels("platform.automationTriggerPlanPressure");
    default:
      return triggerType.replace(/_/g, " ");
  }
}

function getWorkflowFilterLabel(filter: AutomationWorkflowFilter, labels: (key: TranslationKey) => string) {
  switch (filter) {
    case "doc-expiring":
      return labels("platform.automationTriggerDocExpiring");
    case "billing-attention":
      return labels("platform.automationTriggerBillingAttention");
    case "plan-pressure":
      return labels("platform.automationTriggerPlanPressure");
    default:
      return labels("platform.automationWorkflowFilterAll");
  }
}

function buildWorkflowFilterHref(filter: AutomationWorkflowFilter) {
  return filter === "all" ? "/platform/automation" : `/platform/automation?trigger=${filter}`;
}

function getWorkflowStepLabel(type: string, labels: (key: TranslationKey) => string) {
  switch (type) {
    case "SEND_NOTIFICATION":
      return labels("platform.workflowStepSendNotification");
    case "UPDATE_CANDIDATE":
      return labels("platform.workflowStepUpdateCandidate");
    case "CONDITION":
      return labels("platform.workflowStepCondition");
    case "WEBHOOK_CALL":
      return labels("platform.workflowStepWebhookCall");
    case "SEND_EMAIL":
      return labels("platform.workflowStepSendEmail");
    case "CREATE_TASK":
      return labels("platform.workflowStepCreateTask");
    case "WAIT":
      return labels("platform.workflowStepWait");
    default:
      return labels("platform.workflowStepUnknown");
  }
}

function summarizeWorkflowStep(type: string, config: unknown) {
  if (!isRecord(config)) return "";

  switch (type) {
    case "SEND_NOTIFICATION":
      return typeof config.userId === "string" ? config.userId : "";
    case "WEBHOOK_CALL":
      return typeof config.url === "string" ? config.url : "";
    case "CONDITION":
      return typeof config.field === "string"
        ? `${config.field}${"value" in config ? ` = ${String(config.value)}` : ""}`
        : "";
    case "UPDATE_CANDIDATE":
      return isRecord(config.data) ? Object.keys(config.data).join(", ") : "";
    default:
      return "";
  }
}

export default async function PlatformAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ trigger?: string }>;
}) {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  const { trigger } = await searchParams;
  const selectedFilter: AutomationWorkflowFilter =
    trigger === "doc-expiring" || trigger === "billing-attention" || trigger === "plan-pressure" ? trigger : "all";

  const workflows = await prisma.workflow.findMany({
    where:
      selectedFilter === "doc-expiring"
        ? { triggerType: "DOC_EXPIRING_DETECTED" }
        : selectedFilter === "billing-attention"
          ? { triggerType: "BILLING_ATTENTION_DETECTED" }
          : selectedFilter === "plan-pressure"
            ? { triggerType: "PLAN_PRESSURE_DETECTED" }
            : undefined,
    include: {
      organization: {
        select: { name: true, slug: true },
      },
      steps: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((workflow) => workflow.isActive).length;
  const totalTriggers = new Set(workflows.map((workflow) => workflow.triggerType)).size;
  const totalSteps = workflows.reduce((sum, workflow) => sum + workflow.steps.length, 0);

  const recentActivityStart = new Date();
  recentActivityStart.setDate(recentActivityStart.getDate() - 30);

  const recentActivityCounts = await prisma.notification.groupBy({
    by: ["type"],
    where: {
      createdAt: { gte: recentActivityStart },
      type: {
        in: ["DOC_EXPIRING", "BILLING_SUBSCRIPTION_ATTENTION", "BILLING_USAGE_PRESSURE"],
      },
    },
    _count: { _all: true },
  });

  const recentActivityByType = recentActivityCounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = item._count._all;
    return acc;
  }, {});

  const recentActivityLast = await prisma.notification.groupBy({
    by: ["type"],
    where: {
      createdAt: { gte: recentActivityStart },
      type: {
        in: ["DOC_EXPIRING", "BILLING_SUBSCRIPTION_ATTENTION", "BILLING_USAGE_PRESSURE"],
      },
    },
    _max: { createdAt: true },
  });

  const recentActivityLastByType = recentActivityLast.reduce<Record<string, Date | null>>((acc, item) => {
    acc[item.type] = item._max.createdAt;
    return acc;
  }, {});

  function getRecentActivityCount(triggerType: string) {
    switch (triggerType) {
      case "DOC_EXPIRING_DETECTED":
        return recentActivityByType.DOC_EXPIRING ?? 0;
      case "BILLING_ATTENTION_DETECTED":
        return recentActivityByType.BILLING_SUBSCRIPTION_ATTENTION ?? 0;
      case "PLAN_PRESSURE_DETECTED":
        return recentActivityByType.BILLING_USAGE_PRESSURE ?? 0;
      default:
        return 0;
    }
  }

  function getRecentActivityLastDate(triggerType: string) {
    const date =
      triggerType === "DOC_EXPIRING_DETECTED"
        ? recentActivityLastByType.DOC_EXPIRING
        : triggerType === "BILLING_ATTENTION_DETECTED"
          ? recentActivityLastByType.BILLING_SUBSCRIPTION_ATTENTION
          : triggerType === "PLAN_PRESSURE_DETECTED"
            ? recentActivityLastByType.BILLING_USAGE_PRESSURE
            : null;

    return date ? date.toLocaleDateString(locale) : labels("billing.notAvailable");
  }

  const workflowFilters: AutomationWorkflowFilter[] = ["all", "doc-expiring", "billing-attention", "plan-pressure"];

  return (
    <div className="automation-page">
      <div className="hero-section automation-hero">
        <div className="automation-hero-top">
          <div>
            <h1>{labels("platform.automationPageTitle")}</h1>
            <p>{labels("platform.automationPageDescription")}</p>
          </div>
          <Link href="/platform" className="button button-secondary automation-back-link">
            {labels("platform.automationBackToPlatform")}
          </Link>
        </div>

        <div className="automation-filter-row">
          {workflowFilters.map((filter) => (
            <Link
              key={filter}
              href={buildWorkflowFilterHref(filter)}
              className={`status-badge automation-chip ${selectedFilter === filter ? "active" : ""}`}
            >
              {getWorkflowFilterLabel(filter, labels)}
            </Link>
          ))}
        </div>
      </div>

      <div className="dashboard-grid automation-metric-grid">
        <div className="card automation-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationPageTotal")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-metric-value">{totalWorkflows}</div>
        </div>
        <div className="card automation-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationPageActive")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-metric-value">{activeWorkflows}</div>
        </div>
        <div className="card automation-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggers")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-metric-value">{totalTriggers}</div>
        </div>
        <div className="card automation-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationPageSteps")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-metric-value">{totalSteps}</div>
        </div>
      </div>

      <div className="card automation-table-card">
        <div className="card-header">
          <h2>{labels("platform.automationPageTitle")}</h2>
          <Activity size={20} />
        </div>
        <div className="table-container table-container--responsive">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.automationPageWorkflow")}</th>
                <th>{labels("platform.organization")}</th>
                <th>{labels("platform.automationPageStatus")}</th>
                <th>{labels("platform.automationPageTrigger")}</th>
                <th>{labels("platform.automationPageSteps")}</th>
                <th>{labels("platform.automationDetailActivityTitle")}</th>
                <th>{labels("platform.automationPageLastActivity")}</th>
                <th>{labels("platform.automationPageUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {workflows.length > 0 ? (
                workflows.map((workflow) => (
                  <tr key={workflow.id}>
                    <td className="automation-workflow-cell">
                      <Link href={`/platform/automation/${workflow.id}`} className="automation-workflow-link">
                        {workflow.name}
                      </Link>
                      <div className="automation-step-summary-list">
                        {workflow.steps.map((step) => {
                          const summary = summarizeWorkflowStep(step.type, step.config);
                          return (
                            <span key={step.id} className="status-badge automation-step-summary">
                              {getWorkflowStepLabel(step.type, labels)}
                              {summary ? ` · ${summary}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {workflow.organization.name}
                      <div className="automation-subtext">{workflow.organization.slug}</div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${workflow.isActive ? "active" : "automation-status--inactive"}`}
                      >
                        {workflow.isActive ? labels("platform.active") : labels("platform.inactive")}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={buildWorkflowFilterHref(
                          workflow.triggerType === "DOC_EXPIRING_DETECTED"
                            ? "doc-expiring"
                            : workflow.triggerType === "BILLING_ATTENTION_DETECTED"
                              ? "billing-attention"
                              : workflow.triggerType === "PLAN_PRESSURE_DETECTED"
                                ? "plan-pressure"
                                : "all",
                        )}
                        className="status-badge automation-trigger-badge"
                      >
                        {getWorkflowTriggerLabel(workflow.triggerType, labels)}
                      </Link>
                    </td>
                    <td>{workflow.steps.length}</td>
                    <td>{getRecentActivityCount(workflow.triggerType)}</td>
                    <td>{getRecentActivityLastDate(workflow.triggerType)}</td>
                    <td>{workflow.updatedAt.toLocaleDateString(locale)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="automation-empty-state">
                    {labels("platform.automationPageNoWorkflows")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
