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

export function getOcrProviderName(): OcrProviderName {
  const provider = process.env.OCR_PROVIDER?.trim().toLowerCase();
  return provider === "manual" ? "manual" : "azure";
}

export function isManualOcrMode() {
  return getOcrProviderName() === "manual";
}

export function isAutomaticOcrAvailable() {
  return !isManualOcrMode();
}

export function getOcrProviderStatus(): OcrProviderStatus {
  const name = getOcrProviderName();

  if (name === "manual") {
    return {
      name,
      mode: "manual",
      supportsAutomaticExtraction: false,
      statusLabel: "Modo manual",
      statusDescription: "La lectura automatica no esta activa; los documentos quedan listos para revision manual.",
    };
  }

  return {
    name,
    mode: "automatic",
    supportsAutomaticExtraction: true,
    statusLabel: "Modo automatico",
    statusDescription: "La lectura automatica esta activa y puede extraer datos de documentos compatibles.",
  };
}

export function getOcrProvider(): OcrProvider {
  const provider = getOcrProviderName();

  if (provider === "azure") {
    return new AzureOcrProvider();
  }

  if (provider === "manual") {
    return new ManualOcrProvider();
  }

  throw new Error(`Unsupported OCR_PROVIDER: ${provider}`);
}

export async function analyzeIdentityDocument(fileBuffer: Buffer, mimeType: string) {
  return getOcrProvider().analyzeIdentityDocument(fileBuffer, mimeType);
}
