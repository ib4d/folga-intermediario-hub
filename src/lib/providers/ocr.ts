import { analyzeDocument as analyzeAzureDocument, type OcrExtractedData } from "@/lib/ocr";

export type OcrProviderName = "azure";

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

export function getOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER || "azure";

  if (provider !== "azure") {
    throw new Error(`Unsupported OCR_PROVIDER: ${provider}`);
  }

  return new AzureOcrProvider();
}

export async function analyzeIdentityDocument(fileBuffer: Buffer, mimeType: string) {
  return getOcrProvider().analyzeIdentityDocument(fileBuffer, mimeType);
}
