import { TriggerType } from "@/lib/automation/engine";

export interface SystemEvent {
  type: TriggerType | "LEAD_CREATED" | "OUTREACH_SENT" | "REPLY_RECEIVED";
  organizationId: string;
  payload: any;
  userId?: string;
  timestamp: Date;
}

type EventHandler = (event: SystemEvent) => Promise<void>;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)?.push(handler);
  }

  async emit(event: SystemEvent) {
    console.log(`[EventBus] Emitting event: ${event.type} for org: ${event.organizationId}`);
    
    const handlers = this.handlers.get(event.type) || [];
    const globalHandlers = this.handlers.get("*") || [];
    
    const allHandlers = [...handlers, ...globalHandlers];

    // Execute all handlers in parallel (non-blocking for the emitter)
    Promise.all(allHandlers.map(handler => 
      handler(event).catch(err => console.error(`[EventBus] Error in handler for ${event.type}:`, err))
    ));
  }
}

export const eventBus = new EventBus();

/**
 * Standard function to emit events across the platform
 */
export async function emitEvent(type: SystemEvent["type"], organizationId: string, payload: any, userId?: string) {
  const event: SystemEvent = {
    type,
    organizationId,
    payload,
    userId,
    timestamp: new Date()
  };
  
  return eventBus.emit(event);
}
