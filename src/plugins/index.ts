import { Plugin } from "@/core/registry";
import { registry } from "@/core/registry";

/**
 * Standard interface for ORI CRUIT HUB plugins
 */
export interface OriPlugin extends Plugin {
  id: string;
  description: string;
  isEnabled: boolean;
}

/**
 * Marketplace Simulation
 * In a real scenario, this would load from a DB or folder
 */
export const marketplacePlugins: OriPlugin[] = [
  {
    id: "whatsapp-notif",
    name: "WhatsApp Notifications",
    version: "1.0.0",
    description: "Prototipo de avisos de estado a través de WhatsApp Business API. El envío de mensajes aún no está implementado.",
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
    description: "Prototipo de exportación de candidatos aprobados. La sincronización con HRappka aún no está implementada.",
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
