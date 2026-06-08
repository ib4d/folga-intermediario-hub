import { executeWorkflows, TriggerType } from "@/lib/automation/engine";
import { registry } from "@/core/registry";
import { ocrAgent } from "@/agents/ocr-agent";
import { scoringAgent } from "@/agents/scoring-agent";
import { loadEnabledPlugins } from "@/plugins";
import { getJobProvider } from "@/lib/providers/jobs";

export type SystemEventType =
  | TriggerType
  | "LEAD_CREATED"
  | "OUTREACH_SENT"
  | "REPLY_RECEIVED";

export interface SystemEvent<TPayload = Record<string, unknown>> {
  type: SystemEventType;
  organizationId: string;
  payload: TPayload & { organizationId: string };
  userId?: string;
  timestamp: Date;
}

type EventHandler = (event: SystemEvent) => Promise<void>;

class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  subscribe(eventType: string, handler: EventHandler) {
    const current = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...current, handler]);
  }

  async emit(event: SystemEvent) {
    const handlers = this.handlers.get(event.type) ?? [];
    const globalHandlers = this.handlers.get("*") ?? [];
    const allHandlers = [...handlers, ...globalHandlers];

    await Promise.all(
      allHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`[EventBus] Handler failed for ${event.type}:`, error);
        }
      })
    );
  }
}

export const eventBus = new EventBus();

const workflowTriggerTypes: TriggerType[] = [
  "CANDIDATE_CREATED",
  "REGISTRATION_COMPLETED",
  "DOCUMENT_UPLOADED",
  "OCR_COMPLETED",
  "STATUS_CHANGED",
  "LOGISTICS_CREATED",
  "DAILY_SUMMARY",
  "BILLING_ATTENTION_DETECTED",
  "PLAN_PRESSURE_DETECTED",
];

let platformHandlersRegistered = false;
let platformModulesRegistered = false;

function registerPlatformModulesOnce() {
  if (platformModulesRegistered) return;
  platformModulesRegistered = true;

  registry.registerAgent(ocrAgent);
  registry.registerAgent(scoringAgent);
  loadEnabledPlugins();
}

function registerPlatformHandlersOnce() {
  if (platformHandlersRegistered) return;
  platformHandlersRegistered = true;
  registerPlatformModulesOnce();

  eventBus.subscribe("*", async (event) => {
    if (workflowTriggerTypes.includes(event.type as TriggerType)) {
      await executeWorkflows(event.type as TriggerType, event.payload);
    }
  });

  eventBus.subscribe("*", async (event) => {
    const plugins = registry.getPlugins();

    await Promise.all(
      plugins.map(async (plugin) => {
        if (!plugin.onEvent) return;

        try {
          await plugin.onEvent(event);
        } catch (error) {
          console.error(`[Plugin:${plugin.name}] Failed on ${event.type}:`, error);
        }
      })
    );
  });

  eventBus.subscribe("*", async (event) => {
    const agents = registry.getAgents();

    await Promise.all(
      agents.map(async (agent) => {
        if (!agent.triggers.includes(event.type) && !agent.triggers.includes("*")) return;

        try {
          await agent.execute(event);
        } catch (error) {
          console.error(`[Agent:${agent.name}] Failed on ${event.type}:`, error);
        }
      })
    );
  });
}

export async function emitEvent<TPayload extends Record<string, unknown>>(
  type: SystemEventType,
  organizationId: string,
  payload: TPayload,
  userId?: string
) {
  if (!organizationId) {
    throw new Error(`[EventBus] Missing organizationId for event ${type}`);
  }

  registerPlatformHandlersOnce();

  const event: SystemEvent<TPayload> = {
    type,
    organizationId,
    payload: {
      ...payload,
      organizationId,
    },
    userId,
    timestamp: new Date(),
  };

  await getJobProvider().dispatch(event, (systemEvent) => eventBus.emit(systemEvent));
}
