import { initPlatform } from "@/core/executor";
import { registry } from "@/core/registry";
import { ocrAgent } from "@/agents/ocr-agent";
import { scoringAgent } from "@/agents/scoring-agent";
import { loadEnabledPlugins } from "@/plugins";

const globalForPlatform = globalThis as unknown as {
  isPlatformInitialized: boolean | undefined
}

export function ensurePlatformInitialized() {
  if (globalForPlatform.isPlatformInitialized) return;

  console.log("[Platform] Registering Core Agents...");
  registry.registerAgent(ocrAgent);
  registry.registerAgent(scoringAgent);

  console.log("[Platform] Loading Plugins...");
  loadEnabledPlugins();

  initPlatform();
  
  globalForPlatform.isPlatformInitialized = true;
}
