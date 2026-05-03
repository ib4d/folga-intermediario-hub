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
export async function executeWorkflows(triggerType: TriggerType, payload: any) {
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

async function executeWorkflow(workflow: any, payload: any) {
  console.log(`[Automation] Executing workflow: ${workflow.name}`);
  
  let currentPayload = { ...payload };

  for (const step of workflow.steps) {
    try {
      currentPayload = await executeStep(step, currentPayload);
      if (!currentPayload) break; // Condition failed or step stopped execution
    } catch (error) {
      console.error(`[Automation] Step ${step.id} failed:`, error);
      break; 
    }
  }
}

async function executeStep(step: any, payload: any): Promise<any> {
  const config = step.config as any;

  switch (step.type) {
    case "SEND_NOTIFICATION":
      await prisma.notification.create({
        data: {
          organizationId: payload.organizationId,
          userId: config.userId || payload.userId || payload.candidate?.intermediaryId,
          message: `${interpolate(config.title, payload)}: ${interpolate(config.message, payload)}`,
          type: config.type || "INFO",
          candidateId: payload.candidateId || payload.candidate?.id
        }
      });
      return payload;

    case "SEND_EMAIL":
      // Placeholder for actual email sender integration
      console.log(`[Automation] Sending email to ${config.to}: ${interpolate(config.subject, payload)}`);
      // await sendEmail(config.to, config.subject, interpolate(config.body, payload));
      return payload;

    case "UPDATE_CANDIDATE":
      if (!payload.candidateId && !payload.candidate?.id) return payload;
      await prisma.candidate.update({
        where: { id: payload.candidateId || payload.candidate?.id },
        data: config.data
      });
      return payload;

    case "CONDITION":
      // Simple equality check for now
      const value = get(payload, config.field);
      const matches = value === config.value;
      return matches ? payload : null;

    case "WEBHOOK_CALL":
      console.log(`[Automation] Calling webhook: ${config.url}`);
      fetch(config.url, {
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
function interpolate(template: string, data: any): string {
  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    return get(data, path) || match;
  });
}

/**
 * Deep get helper: get(data, "candidate.name")
 */
function get(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
