import { auth } from "@/auth";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity } from "lucide-react";
import Link from "next/link";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type AutomationWorkflowFilter = "all" | "doc-expiring" | "billing-attention" | "plan-pressure";

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
    case "SEND_NOTIFICATION": {
      if (typeof config.userId === "string") return config.userId;
      return "";
    }
    case "WEBHOOK_CALL": {
      return typeof config.url === "string" ? config.url : "";
    }
    case "CONDITION": {
      if (typeof config.field === "string") {
        return `${config.field}${"value" in config ? ` = ${String(config.value)}` : ""}`;
      }
      return "";
    }
    case "UPDATE_CANDIDATE": {
      return isRecord(config.data) ? Object.keys(config.data).join(", ") : "";
    }
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
        select: {
          name: true,
          slug: true,
        },
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
        in: [
          "DOC_EXPIRING",
          "BILLING_SUBSCRIPTION_ATTENTION",
          "BILLING_USAGE_PRESSURE",
        ],
      },
    },
    _count: { _all: true },
  });
  const recentActivityByType = recentActivityCounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = item._count._all;
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

  return (
    <div style={{ padding: "2rem" }}>
      <div className="hero-section" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1>{labels("platform.automationPageTitle")}</h1>
            <p>{labels("platform.automationPageDescription")}</p>
            <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {(["all", "doc-expiring", "billing-attention", "plan-pressure"] as AutomationWorkflowFilter[]).map((filter) => (
                <Link
                  key={filter}
                  href={buildWorkflowFilterHref(filter)}
                  className={`status-badge ${selectedFilter === filter ? "active" : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  {getWorkflowFilterLabel(filter, labels)}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/platform" className="button button-secondary" style={{ textDecoration: "none", alignSelf: "start" }}>
            {labels("platform.automationBackToPlatform")}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationPageTotal")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{totalWorkflows}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationPageActive")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{activeWorkflows}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationTriggers")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{totalTriggers}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationPageSteps")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 900 }}>{totalSteps}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{labels("platform.automationPageTitle")}</h2>
          <Activity size={20} />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{labels("platform.automationPageWorkflow")}</th>
                <th>{labels("platform.organization")}</th>
                <th>{labels("platform.automationPageStatus")}</th>
                <th>{labels("platform.automationPageTrigger")}</th>
                <th>{labels("platform.automationPageSteps")}</th>
                <th>{labels("platform.automationDetailActivityTitle")}</th>
                <th>{labels("platform.automationPageUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {workflows.length > 0 ? (
                workflows.map((workflow) => (
                  <tr key={workflow.id}>
                    <td style={{ fontWeight: "bold" }}>
                      <Link href={`/platform/automation/${workflow.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        {workflow.name}
                      </Link>
                      <div style={{ marginTop: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {workflow.steps.map((step) => {
                          const summary = summarizeWorkflowStep(step.type, step.config);
                          return (
                            <span
                              key={step.id}
                              className="status-badge"
                              style={{ backgroundColor: "rgba(255,255,255,0.88)", color: "var(--pitch-black)" }}
                            >
                              {getWorkflowStepLabel(step.type, labels)}
                              {summary ? ` · ${summary}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {workflow.organization.name}
                      <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{workflow.organization.slug}</div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${workflow.isActive ? "active" : ""}`}
                        style={workflow.isActive ? {} : { backgroundColor: "rgba(185, 28, 28, 0.1)", color: "#991b1b" }}
                      >
                        {workflow.isActive ? labels("platform.active") : labels("platform.inactive")}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge active" style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}>
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
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          {getWorkflowTriggerLabel(workflow.triggerType, labels)}
                        </Link>
                      </span>
                    </td>
                    <td>{workflow.steps.length}</td>
                    <td>{getRecentActivityCount(workflow.triggerType)}</td>
                    <td>{workflow.updatedAt.toLocaleDateString(locale)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ color: "var(--muted-foreground)" }}>
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
