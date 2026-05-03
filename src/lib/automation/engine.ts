import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type TriggerType =
  | "CANDIDATE_CREATED"
  | "REGISTRATION_COMPLETED"
  | "DOCUMENT_UPLOADED"
  | "OCR_COMPLETED"
  | "STATUS_CHANGED"
  | "LOGISTICS_CREATED"
  | "DAILY_SUMMARY";

type WorkflowPayload = Record<string, unknown> & {
  organizationId: string;
  userId?: string;
  candidateId?: string;
  candidate?: {
    id?: string;
    intermediaryId?: string;
    [key: string]: unknown;
  };
};

type WorkflowStepWithConfig = {
  id: string;
  type: string;
  config: Prisma.JsonValue;
  order: number;
};

type WorkflowWithSteps = {
  id: string;
  name: string;
  steps: WorkflowStepWithConfig[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getConfig(step: WorkflowStepWithConfig): Record<string, unknown> {
  return isRecord(step.config) ? step.config : {};
}

function getValue(obj: unknown, path: string): unknown {
  if (!isRecord(obj)) return undefined;

  return path.split(".").reduce<unknown>((acc, part) => {
    if (!isRecord(acc)) return undefined;
    return acc[part];
  }, obj);
}

function interpolate(template: unknown, data: WorkflowPayload): string {
  if (typeof template !== "string") return "";

  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    const value = getValue(data, path.trim());
    return value === undefined || value === null ? match : String(value);
  });
}

function getCandidateId(payload: WorkflowPayload): string | undefined {
  if (typeof payload.candidateId === "string") return payload.candidateId;

  if (payload.candidate?.id && typeof payload.candidate.id === "string") {
    return payload.candidate.id;
  }

  return undefined;
}

function getNotificationUserId(
  config: Record<string, unknown>,
  payload: WorkflowPayload
): string | undefined {
  if (typeof config.userId === "string") return config.userId;
  if (typeof payload.userId === "string") return payload.userId;

  if (
    payload.candidate?.intermediaryId &&
    typeof payload.candidate.intermediaryId === "string"
  ) {
    return payload.candidate.intermediaryId;
  }

  return undefined;
}

export async function executeWorkflows(triggerType: TriggerType, payload: WorkflowPayload) {
  if (!payload.organizationId) {
    console.error(`[Automation] Missing organizationId for trigger ${triggerType}`);
    return;
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      organizationId: payload.organizationId,
      isActive: true,
      triggerType,
    },
    include: {
      steps: {
        orderBy: { order: "asc" },
      },
    },
  });

  for (const workflow of workflows) {
    await executeWorkflow(workflow, payload);
  }
}

async function executeWorkflow(workflow: WorkflowWithSteps, payload: WorkflowPayload) {
  let currentPayload: WorkflowPayload | null = { ...payload };

  for (const step of workflow.steps) {
    if (!currentPayload) break;

    try {
      currentPayload = await executeStep(step, currentPayload);
    } catch (error) {
      console.error(`[Automation] Workflow ${workflow.id} step ${step.id} failed:`, error);
      break;
    }
  }
}

async function executeStep(
  step: WorkflowStepWithConfig,
  payload: WorkflowPayload
): Promise<WorkflowPayload | null> {
  const config = getConfig(step);

  switch (step.type) {
    case "SEND_NOTIFICATION": {
      const userId = getNotificationUserId(config, payload);

      if (!userId) {
        console.warn("[Automation] SEND_NOTIFICATION skipped: no userId");
        return payload;
      }

      await prisma.notification.create({
        data: {
          organizationId: payload.organizationId,
          userId,
          candidateId: getCandidateId(payload),
          type: typeof config.type === "string" ? config.type : "INFO",
          message: `${interpolate(config.title, payload)} ${interpolate(
            config.message,
            payload
          )}`.trim(),
        },
      });

      return payload;
    }

    case "UPDATE_CANDIDATE": {
      const candidateId = getCandidateId(payload);

      if (!candidateId) return payload;

      if (!isRecord(config.data)) {
        console.warn("[Automation] UPDATE_CANDIDATE skipped: config.data is invalid");
        return payload;
      }

      await prisma.candidate.updateMany({
        where: {
          id: candidateId,
          organizationId: payload.organizationId,
        },
        data: config.data as Prisma.CandidateUpdateManyMutationInput,
      });

      return payload;
    }

    case "CONDITION": {
      if (typeof config.field !== "string") return null;

      const value = getValue(payload, config.field);
      return value === config.value ? payload : null;
    }

    case "WEBHOOK_CALL": {
      if (typeof config.url !== "string") return payload;

      await fetch(config.url, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }).catch((error) => {
        console.error("[Automation] Webhook call failed:", error);
      });

      return payload;
    }

    case "SEND_EMAIL": {
      console.warn("[Automation] SEND_EMAIL is not implemented yet.");
      return payload;
    }

    case "CREATE_TASK":
    case "WAIT": {
      console.warn(`[Automation] ${step.type} is not implemented yet.`);
      return payload;
    }

    default: {
      console.warn(`[Automation] Unknown step type: ${step.type}`);
      return payload;
    }
  }
}