import { auth } from "@/auth";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { Activity } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type AutomationPageProps = {
  params: Promise<{ id: string }>;
};

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
  if (typeof config !== "object" || config === null || Array.isArray(config)) return "";
  const record = config as Record<string, unknown>;

  switch (type) {
    case "SEND_NOTIFICATION":
      return typeof record.userId === "string" ? record.userId : "";
    case "WEBHOOK_CALL":
      return typeof record.url === "string" ? record.url : "";
    case "CONDITION":
      return typeof record.field === "string"
        ? `${record.field}${"value" in record ? ` = ${String(record.value)}` : ""}`
        : "";
    case "UPDATE_CANDIDATE":
      return typeof record.data === "object" && record.data !== null && !Array.isArray(record.data)
        ? Object.keys(record.data as Record<string, unknown>).join(", ")
        : "";
    default:
      return "";
  }
}

function getRelatedNotificationTypes(triggerType: string) {
  switch (triggerType) {
    case "DOC_EXPIRING_DETECTED":
      return ["DOC_EXPIRING"];
    case "BILLING_ATTENTION_DETECTED":
      return ["BILLING_SUBSCRIPTION_ATTENTION"];
    case "PLAN_PRESSURE_DETECTED":
      return ["BILLING_USAGE_PRESSURE"];
    default:
      return [];
  }
}

export default async function AutomationWorkflowDetailPage({ params }: AutomationPageProps) {
  await requirePlatformAdmin();
  const session = await auth();
  const language = normalizeLanguage(session?.user?.interfaceLanguage);
  const labels = t.bind(null, language);
  const locale = language === "pl" ? "pl-PL" : language === "en" ? "en-US" : "es-ES";
  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({
    where: { id },
    include: {
      organization: {
        select: { name: true, slug: true },
      },
      steps: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!workflow) {
    notFound();
  }

  const relatedNotificationTypes = getRelatedNotificationTypes(workflow.triggerType);
  const recentActivity = relatedNotificationTypes.length
    ? await prisma.notification.findMany({
        where: {
          organizationId: workflow.organizationId,
          type: { in: relatedNotificationTypes },
        },
        include: {
          candidate: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <div className="automation-detail-page">
      <div className="hero-section automation-detail-hero">
        <div className="automation-detail-hero-top">
          <div>
            <h1>{labels("platform.automationDetailTitle")}</h1>
            <p>{labels("platform.automationDetailDescription")}</p>
          </div>
          <Link href="/platform/automation" className="button button-secondary automation-back-link">
            {labels("platform.automationDetailBack")}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid automation-detail-metric-grid">
        <div className="card automation-detail-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationDetailStatus")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-detail-value">{workflow.isActive ? labels("platform.active") : labels("platform.inactive")}</div>
        </div>
        <div className="card automation-detail-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationDetailTrigger")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-detail-value">{getWorkflowTriggerLabel(workflow.triggerType, labels)}</div>
        </div>
        <div className="card automation-detail-metric-card">
          <div className="card-header">
            <h3>{labels("platform.automationDetailSteps")}</h3>
            <Activity size={24} />
          </div>
          <div className="automation-detail-value">{workflow.steps.length}</div>
        </div>
      </div>

      <div className="card automation-detail-summary-card">
        <div className="card-header">
          <h2>{workflow.name}</h2>
          <Activity size={20} />
        </div>
        <div className="dashboard-grid automation-detail-info-grid">
          <div className="card automation-detail-info-card">
            <div className="automation-detail-label">{labels("platform.automationDetailOrganization")}</div>
            <div className="automation-detail-org">{workflow.organization.name}</div>
            <div className="automation-subtext">{workflow.organization.slug}</div>
          </div>
          <div className="card automation-detail-info-card">
            <div className="automation-detail-label">{labels("platform.automationDetailUpdated")}</div>
            <div className="automation-detail-org">{workflow.updatedAt.toLocaleDateString(locale)}</div>
          </div>
        </div>
      </div>

      <div className="card automation-detail-activity-card">
        <div className="card-header">
          <h2>{labels("platform.automationDetailActivityTitle")}</h2>
          <Activity size={20} />
        </div>
        <p className="automation-detail-copy">{labels("platform.automationDetailActivityDescription")}</p>
        <div className="automation-detail-stack">
          {recentActivity.length > 0 ? (
            recentActivity.map((notification) => (
              <div key={notification.id} className="automation-entry-card">
                <div className="automation-entry-top">
                  <div>
                    <div className="automation-entry-type">{notification.type}</div>
                    <div className="automation-entry-message">{notification.message}</div>
                    {notification.candidate && notification.candidateId ? (
                      <div className="automation-entry-links">
                        <Link href={`/candidatos/${notification.candidateId}`} className="automation-entry-candidate-link">
                          {notification.candidate.firstName} {notification.candidate.lastName}
                        </Link>
                        <Link href={`/candidatos/${notification.candidateId}`} className="button button-secondary automation-entry-button">
                          {labels("documents.openCandidate")}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  <span className={`status-badge ${notification.isRead ? "" : "active"}`}>
                    {notification.isRead ? labels("platform.inactive") : labels("platform.active")}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="automation-empty-state">{labels("platform.automationDetailActivityEmpty")}</div>
          )}
        </div>
      </div>

      <div className="card automation-detail-steps-card">
        <div className="card-header">
          <h2>{labels("platform.automationDetailSteps")}</h2>
          <Activity size={20} />
        </div>
        <div className="automation-detail-stack">
          {workflow.steps.length > 0 ? (
            workflow.steps.map((step) => {
              const summary = summarizeWorkflowStep(step.type, step.config);
              return (
                <div key={step.id} className="automation-entry-card">
                  <div className="automation-entry-top">
                    <div>
                      <div className="automation-entry-type">{getWorkflowStepLabel(step.type, labels)}</div>
                      {summary ? <div className="automation-entry-message">{summary}</div> : null}
                      <div className="automation-subtext">Paso #{step.order}</div>
                    </div>
                    <span className="status-badge automation-step-summary">Paso {step.order}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="automation-empty-state">{labels("platform.automationPageNoWorkflows")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
