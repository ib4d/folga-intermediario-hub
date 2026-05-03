/**
 * AI OCR Agent
 * Smart post-processing layer for OCR data
 */

export interface OcrEnhancementResult {
  cleanedData: any;
  confidenceScore: number;
  warnings: string[];
  suggestedUpdates: any;
  documentType: string;
}

export async function enhanceOcrData(ocrData: any): Promise<OcrEnhancementResult> {
  const warnings: string[] = [];
  const cleanedData = { ...ocrData };
  let confidenceScore = 0.85; // Base confidence

  // 1. Detect Document Type
  const documentType = detectDocumentType(ocrData);

  // 2. Normalize Names (Uppercase first letter)
  if (cleanedData.firstName) {
    cleanedData.firstName = normalizeName(cleanedData.firstName);
  }
  if (cleanedData.lastName) {
    cleanedData.lastName = normalizeName(cleanedData.lastName);
  }

  // 3. Validate Passport Numbers (Basic regex for various countries)
  if (cleanedData.passportNumber) {
    const isValid = /^[A-Z0-9]{6,12}$/i.test(cleanedData.passportNumber);
    if (!isValid) {
      warnings.push("El número de pasaporte tiene un formato inusual.");
      confidenceScore -= 0.2;
    }
  }

  // 4. Infer Country from OCR Text if missing
  if (!cleanedData.country && ocrData.rawText) {
    const raw = ocrData.rawText.toUpperCase();
    if (raw.includes("COLOMBIA")) cleanedData.country = "Colombia";
    else if (raw.includes("VENEZUELA")) cleanedData.country = "Venezuela";
    else if (raw.includes("POLSKA") || raw.includes("POLAND")) cleanedData.country = "Polonia";
    else if (raw.includes("UKRAINE") || raw.includes("UKRAINA")) cleanedData.country = "Ucrania";
  }

  // 5. Detect Missing Fields
  const requiredFields = ["firstName", "lastName", "passportNumber", "expiryDate"];
  for (const field of requiredFields) {
    if (!cleanedData[field]) {
      warnings.push(`Campo requerido faltante: ${field}`);
      confidenceScore -= 0.1;
    }
  }

  return {
    cleanedData,
    confidenceScore: Math.max(0, confidenceScore),
    warnings,
    suggestedUpdates: cleanedData,
    documentType
  };
}

function detectDocumentType(data: any): string {
  const raw = (data.rawText || "").toUpperCase();
  if (raw.includes("PASSPORT") || raw.includes("PASAPORTE")) return "PASSPORT";
  if (raw.includes("IDENTITY CARD") || raw.includes("CEDULA")) return "ID_CARD";
  if (raw.includes("DRIVING LICENSE") || raw.includes("LICENCIA")) return "DRIVING_LICENSE";
  if (raw.includes("KARTA POBYTU")) return "KARTA_POBYTU";
  return "UNKNOWN";
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function validateOcrData(data: any): boolean {
  // Returns true if data is solid enough for automatic approval
  if (!data.firstName || !data.lastName || !data.passportNumber) return false;
  return true;
}
