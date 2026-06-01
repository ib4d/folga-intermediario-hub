import { getAvailableOcrProviders, getOcrProviderStatus } from "@/lib/providers/ocr";
import { getAvailableStorageProviders, getStorageProvider, getStorageProviderStatus } from "@/lib/providers/storage";

export function getProviderStatus() {
  const storageProvider = getStorageProvider();
  const storage = getStorageProviderStatus();
  const ocr = getOcrProviderStatus();
  const availableStorage = getAvailableStorageProviders();
  const availableOcr = getAvailableOcrProviders();
  const manualOcrMode = ocr.mode === "manual";

  return {
    storageProvider,
    storage,
    availableStorage,
    availableOcr,
    storageName: storage.name,
    storageMode: storage.mode,
    ocr,
    ocrMode: ocr.mode,
    manualOcrMode,
    automaticOcrAvailable: ocr.supportsAutomaticExtraction,
  } as const;
}
