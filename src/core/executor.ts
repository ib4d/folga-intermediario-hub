import { eventBus, SystemEvent } from "./events";
import { registry } from "./registry";
import { executeWorkflows, TriggerType } from "@/lib/automation/engine";

/**
 * ORI-OS Executor
 * Initializes the system and links events to engines, plugins, and agents.
 */
export function initPlatform() {
  console.log("[Platform] Initializing ORI-OS Layer...");

  // 1. Link Event Bus to Automation Engine
  eventBus.subscribe("*", async (event: SystemEvent) => {
    // Only pass compatible trigger types to the workflow engine
    const triggerTypes: string[] = [
      "CANDIDATE_CREATED", 
      "REGISTRATION_COMPLETED", 
      "DOCUMENT_UPLOADED", 
      "OCR_COMPLETED", 
      "STATUS_CHANGED", 
      "LOGISTICS_CREATED",
      "DAILY_SUMMARY"
    ];
    
    if (triggerTypes.includes(event.type)) {
      await executeWorkflows(event.type as TriggerType, event.payload);
    }
  });

  // 2. Link Event Bus to Plugins
  eventBus.subscribe("*", async (event: SystemEvent) => {
    const plugins = registry.getPlugins();
    for (const plugin of plugins) {
      if (plugin.onEvent) {
        plugin.onEvent(event).catch(err => 
          console.error(`[Platform] Plugin ${plugin.name} failed on ${event.type}:`, err)
        );
      }
    }
  });

  // 3. Link Event Bus to Agents
  eventBus.subscribe("*", async (event: SystemEvent) => {
    const agents = registry.getAgents();
    for (const agent of agents) {
      if (agent.triggers.includes(event.type) || agent.triggers.includes("*")) {
        agent.execute(event).catch(err => 
          console.error(`[Platform] Agent ${agent.name} failed on ${event.type}:`, err)
        );
      }
    }
  });

  console.log("[Platform] ORI-OS Layer Ready.");
}
