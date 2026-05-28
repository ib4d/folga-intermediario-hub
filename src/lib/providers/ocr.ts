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
      "OCR is running in manual review mode. Documents can still be uploaded and reviewed without automatic extraction."
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
