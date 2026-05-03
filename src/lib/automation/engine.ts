import { prisma } from "@/lib/prisma";

export type TriggerType = 
  | "CANDIDATE_CREATED" 
  | "REGISTRATION_COMPLETED" 
  | "DOCUMENT_UPLOADED" 
  | "OCR_COMPLETED" 
  | "STATUS_CHANGED" 
  | "LOGISTICS_CREATED"
  | "DAILY_SUMMARY";

/**
 * Main Automation Engine
 * Executes workflows based on triggers
 */
export async function executeWorkflows(triggerType: TriggerType, payload: Record<string, unknown>) {
  const organizationId = payload.organizationId;
  if (!organizationId) {
    console.error(`[Automation] Trigger ${triggerType} missing organizationId`);
    return;
  }

  // Find active workflows for this trigger and organization
  const workflows = await prisma.workflow.findMany({
    where: {
      organizationId,
      isActive: true,
      triggerType,
    },
    include: {
      steps: {
        orderBy: { order: 'asc' }
      }
    }
  });

  console.log(`[Automation] Found ${workflows.length} workflows for ${triggerType}`);

  for (const workflow of workflows) {
    executeWorkflow(workflow, payload).catch(err => {
      console.error(`[Automation] Workflow ${workflow.id} failed:`, err);
    });
  }
}

async function executeWorkflow(workflow: any, payload: Record<string, unknown>) {
  console.log(`[Automation] Executing workflow: ${workflow.name}`);
  
  let currentPayload = { ...payload };

  for (const step of workflow.steps) {
    try {
      const nextPayload = await executeStep(step, currentPayload);
      if (!nextPayload) break; // Condition failed or step stopped execution
      currentPayload = nextPayload;
    } catch (error) {
      console.error(`[Automation] Step ${step.id} failed:`, error);
      break; 
    }
  }
}

async function executeStep(step: { type: string, config: Record<string, unknown> }, payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const config = step.config;

  switch (step.type) {
    case "SEND_NOTIFICATION":
      await prisma.notification.create({
        data: {
          organizationId: payload.organizationId as string,
          userId: (config.userId as string) || (payload.userId as string) || (payload.candidate as any)?.intermediaryId,
          message: `${interpolate(config.title as string, payload)}: ${interpolate(config.message as string, payload)}`,
          type: (config.type as string) || "INFO",
          candidateId: (payload.candidateId as string) || (payload.candidate as any)?.id
        }
      });
      return payload;

    case "SEND_EMAIL":
      // Placeholder for actual email sender integration
      console.log(`[Automation] Sending email to ${config.to as string}: ${interpolate(config.subject as string, payload)}`);
      // await sendEmail(config.to, config.subject, interpolate(config.body as string, payload));
      return payload;

    case "UPDATE_CANDIDATE":
      if (!payload.candidateId && !(payload.candidate as any)?.id) return payload;
      await prisma.candidate.update({
        where: { id: (payload.candidateId as string) || (payload.candidate as any)?.id },
        data: config.data as any
      });
      return payload;

    case "CONDITION":
      // Simple equality check for now
      const value = get(payload, config.field as string);
      const matches = value === config.value;
      return matches ? payload : null;

    case "WEBHOOK_CALL":
      console.log(`[Automation] Calling webhook: ${config.url}`);
      fetch(config.url as string, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      }).catch(e => console.error("[Automation] Webhook failed", e));
      return payload;

    default:
      console.warn(`[Automation] Unknown step type: ${step.type}`);
      return payload;
  }
}

/**
 * Basic string interpolation: "Hello {candidate.name}" -> "Hello John"
 */
function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    return (get(data, path) as string) || match;
  });
}

/**
 * Deep get helper: get(data, "candidate.name")
 */
function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc, part) => (acc as Record<string, unknown>) && (acc as Record<string, unknown>)[part], obj);
}
