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
        select: {
          name: true,
          slug: true,
        },
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
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <div style={{ padding: "2rem" }}>
      <div className="hero-section" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1>{labels("platform.automationDetailTitle")}</h1>
            <p>{labels("platform.automationDetailDescription")}</p>
          </div>
          <Link href="/platform/automation" className="button button-secondary" style={{ textDecoration: "none", alignSelf: "start" }}>
            {labels("platform.automationDetailBack")}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationDetailStatus")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{workflow.isActive ? labels("platform.active") : labels("platform.inactive")}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationDetailTrigger")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{getWorkflowTriggerLabel(workflow.triggerType, labels)}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{labels("platform.automationDetailSteps")}</h3>
            <Activity size={24} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{workflow.steps.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-header">
          <h2>{workflow.name}</h2>
          <Activity size={20} />
        </div>
        <div className="dashboard-grid" style={{ marginBottom: "1rem" }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{labels("platform.automationDetailOrganization")}</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 900 }}>{workflow.organization.name}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{workflow.organization.slug}</div>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ color: "var(--muted-foreground)", fontWeight: 700 }}>{labels("platform.automationDetailUpdated")}</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 900 }}>{workflow.updatedAt.toLocaleDateString(locale)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-header">
          <h2>{labels("platform.automationDetailActivityTitle")}</h2>
          <Activity size={20} />
        </div>
        <p style={{ marginTop: 0, color: "var(--muted-foreground)" }}>{labels("platform.automationDetailActivityDescription")}</p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {recentActivity.length > 0 ? (
            recentActivity.map((notification) => (
              <div
                key={notification.id}
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.72)",
                  padding: "1rem 1.1rem",
                }}
              >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>{notification.type}</div>
                        <div style={{ marginTop: "0.35rem", color: "var(--muted-foreground)", fontWeight: 700 }}>
                          {notification.message}
                        </div>
                        {notification.candidate && notification.candidateId ? (
                          <div style={{ marginTop: "0.35rem", display: "grid", gap: "0.35rem" }}>
                            <Link href={`/candidatos/${notification.candidateId}`} style={{ fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}>
                              {notification.candidate.firstName} {notification.candidate.lastName}
                            </Link>
                            <Link
                              href={`/candidatos/${notification.candidateId}`}
                              className="button button-secondary"
                              style={{
                                textDecoration: "none",
                                width: "fit-content",
                                paddingInline: "0.8rem",
                                paddingBlock: "0.45rem",
                              }}
                            >
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
            <div style={{ color: "var(--muted-foreground)" }}>{labels("platform.automationDetailActivityEmpty")}</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>{labels("platform.automationDetailSteps")}</h2>
          <Activity size={20} />
        </div>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {workflow.steps.length > 0 ? (
            workflow.steps.map((step) => {
              const summary = summarizeWorkflowStep(step.type, step.config);
              return (
                <div
                  key={step.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(255,255,255,0.72)",
                    padding: "1rem 1.1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>
                        {getWorkflowStepLabel(step.type, labels)}
                      </div>
                      {summary ? (
                        <div style={{ marginTop: "0.35rem", color: "var(--muted-foreground)", fontWeight: 700 }}>
                          {summary}
                        </div>
                      ) : null}
                    </div>
                    <span className="status-badge active" style={{ backgroundColor: "var(--amber-flame)", color: "var(--pitch-black)" }}>
                      #{step.order}
                    </span>
                  </div>
                  <pre
                    style={{
                      marginTop: "0.8rem",
                      marginBottom: 0,
                      overflowX: "auto",
                      fontSize: "0.8rem",
                      lineHeight: 1.5,
                      background: "rgba(0,0,0,0.04)",
                      padding: "0.9rem",
                      borderRadius: "6px",
                    }}
                  >
                    {JSON.stringify(step.config, null, 2)}
                  </pre>
                </div>
              );
            })
          ) : (
            <div style={{ color: "var(--muted-foreground)" }}>{labels("platform.automationPageNoWorkflows")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
