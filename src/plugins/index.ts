import { Plugin } from "@/core/registry";
import { registry } from "@/core/registry";

/**
 * Standard interface for ORI CRUIT HUB plugins
 */
export interface FolgaPlugin extends Plugin {
  id: string;
  description: string;
  isEnabled: boolean;
}

/**
 * Marketplace Simulation
 * In a real scenario, this would load from a DB or folder
 */
export const marketplacePlugins: FolgaPlugin[] = [
  {
    id: "whatsapp-notif",
    name: "WhatsApp Notifications",
    version: "1.0.0",
    description: "Send automatic status updates via WhatsApp Business API",
    isEnabled: false,
    onEvent: async (event) => {
      if (event.type === "STATUS_CHANGED") {
        console.log("[Plugin: WhatsApp] Status changed. Notification pending implementation.");
      }
    }
  },
  {
    id: "hrappka-export",
    name: "HRappka Sync",
    version: "1.0.0",
    description: "Sync approved candidates directly with HRappka platform",
    isEnabled: false,
    onEvent: async (event) => {
      if (event.type === "STATUS_CHANGED" && event.payload.newStatus === "APROBADO") {
        console.log("[Plugin: HRappka] Exporting candidate to HRappka...");
      }
    }
  }
];

export function loadEnabledPlugins() {
  const enabled = marketplacePlugins.filter(p => p.isEnabled);
  enabled.forEach(p => registry.registerPlugin(p));
}
