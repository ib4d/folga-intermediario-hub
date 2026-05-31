import { getOcrProviderStatus } from "@/lib/providers/ocr";
import { getStorageProvider, getStorageProviderStatus } from "@/lib/providers/storage";

export function getProviderStatus() {
  const storageProvider = getStorageProvider();
  const storage = getStorageProviderStatus();
  const ocr = getOcrProviderStatus();
  const manualOcrMode = ocr.mode === "manual";

  return {
    storageProvider,
    storage,
    storageName: storage.name,
    storageMode: storage.mode,
    ocr,
    ocrMode: ocr.mode,
    manualOcrMode,
    automaticOcrAvailable: ocr.supportsAutomaticExtraction,
  } as const;
}
