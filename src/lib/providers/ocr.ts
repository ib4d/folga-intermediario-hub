import { analyzeDocument as analyzeAzureDocument, type OcrExtractedData } from "@/lib/ocr";

export type OcrProviderName = "azure" | "manual";

export class OcrProviderUnavailableError extends Error {
  readonly code = "OCR_PROVIDER_UNAVAILABLE";
  readonly provider: OcrProviderName;

  constructor(provider: OcrProviderName, message: string) {
    super(message);
    this.name = "OcrProviderUnavailableError";
    this.provider = provider;
  }
}

export interface OcrProvider {
  readonly name: OcrProviderName;
  analyzeIdentityDocument(fileBuffer: Buffer, mimeType: string): Promise<OcrExtractedData | null>;
}

export type OcrProviderMode = "manual" | "automatic";

export interface OcrProviderStatus {
  readonly name: OcrProviderName;
  readonly mode: OcrProviderMode;
  readonly supportsAutomaticExtraction: boolean;
  readonly statusLabel: string;
  readonly statusDescription: string;
}

type OcrProviderConfig = {
  readonly provider: OcrProvider;
  readonly status: OcrProviderStatus;
};

class AzureOcrProvider implements OcrProvider {
  readonly name = "azure" as const;

  analyzeIdentityDocument(fileBuffer: Buffer, mimeType: string) {
    return analyzeAzureDocument(fileBuffer, mimeType);
  }
}

class ManualOcrProvider implements OcrProvider {
  readonly name = "manual" as const;

  async analyzeIdentityDocument(fileBuffer: Buffer, mimeType: string): Promise<OcrExtractedData | null> {
    void fileBuffer;
    void mimeType;
    throw new OcrProviderUnavailableError(
      "manual",
      "OCR is running in manual mode. Documents can still be uploaded and reviewed without automatic extraction."
    );
  }
}

const OCR_PROVIDER_REGISTRY: Record<OcrProviderName, OcrProviderConfig> = {
  azure: {
    provider: new AzureOcrProvider(),
    status: {
      name: "azure",
      mode: "automatic",
      supportsAutomaticExtraction: true,
      statusLabel: "Modo automatico",
      statusDescription: "La lectura automatica esta activa y puede extraer datos de documentos compatibles.",
    },
  },
  manual: {
    provider: new ManualOcrProvider(),
    status: {
      name: "manual",
      mode: "manual",
      supportsAutomaticExtraction: false,
      statusLabel: "Modo manual",
      statusDescription: "La lectura automatica no esta activa; los documentos quedan listos para revision manual.",
    },
  },
};

export function getAvailableOcrProviders(): readonly OcrProviderStatus[] {
  return Object.values(OCR_PROVIDER_REGISTRY).map((entry) => entry.status);
}

export function getOcrProviderName(): OcrProviderName {
  const provider = process.env.OCR_PROVIDER?.trim().toLowerCase();
  if (provider === "manual" || provider === "azure") {
    return provider;
  }

  return "azure";
}

export function isManualOcrMode() {
  return getOcrProviderName() === "manual";
}

export function isAutomaticOcrAvailable() {
  return !isManualOcrMode();
}

export function getOcrProviderStatus(): OcrProviderStatus {
  const name = getOcrProviderName();
  return OCR_PROVIDER_REGISTRY[name].status;
}

export function getOcrProvider(): OcrProvider {
  const provider = getOcrProviderName();
  return OCR_PROVIDER_REGISTRY[provider].provider;
}

export async function analyzeIdentityDocument(fileBuffer: Buffer, mimeType: string) {
  return getOcrProvider().analyzeIdentityDocument(fileBuffer, mimeType);
}
