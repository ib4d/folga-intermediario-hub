import { SystemEvent } from "./events";

export interface Plugin {
  name: string;
  version: string;
  onEvent?: (event: SystemEvent) => Promise<void>;
  actions?: Record<string, Function>;
}

export interface Agent {
  name: string;
  role: string;
  triggers: string[];
  execute: (event: SystemEvent) => Promise<void>;
}

class Registry {
  private plugins: Map<string, Plugin> = new Map();
  private agents: Map<string, Agent> = new Map();

  registerPlugin(plugin: Plugin) {
    this.plugins.set(plugin.name, plugin);
    console.log(`[Registry] Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  registerAgent(agent: Agent) {
    this.agents.set(agent.name, agent);
    console.log(`[Registry] Agent registered: ${agent.name} (${agent.role})`);
  }

  getPlugins() { return Array.from(this.plugins.values()); }
  getAgents() { return Array.from(this.agents.values()); }
}

export const registry = new Registry();
