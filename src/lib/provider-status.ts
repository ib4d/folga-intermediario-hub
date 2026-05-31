import { isAutomaticOcrAvailable, isManualOcrMode } from "@/lib/providers/ocr";
import { getStorageProvider } from "@/lib/providers/storage";

export function getProviderStatus() {
  const storageProvider = getStorageProvider();
  const manualOcrMode = isManualOcrMode();

  return {
    storageProvider,
    storageName: storageProvider.name,
    storageMode: storageProvider.name === "local" ? "local" : "supabase",
    ocrMode: manualOcrMode ? "manual" : "automatic",
    manualOcrMode,
    automaticOcrAvailable: isAutomaticOcrAvailable(),
  } as const;
}
