import { getOcrProviderStatus } from "@/lib/providers/ocr";
import { getStorageProvider } from "@/lib/providers/storage";

export function getProviderStatus() {
  const storageProvider = getStorageProvider();
  const ocr = getOcrProviderStatus();
  const manualOcrMode = ocr.mode === "manual";

  return {
    storageProvider,
    storageName: storageProvider.name,
    storageMode: storageProvider.name === "local" ? "local" : "supabase",
    ocr,
    ocrMode: ocr.mode,
    manualOcrMode,
    automaticOcrAvailable: ocr.supportsAutomaticExtraction,
  } as const;
}
