import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_DI_ENDPOINT;
const key = process.env.AZURE_DI_KEY;

export interface OcrExtractedData {
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  personalNumber?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
  dateOfIssue?: string;
  sex?: string;
  nationality?: string;
  issuingCountry?: string;
  placeOfBirth?: string;
  documentType?: string;
  documentTypeCode?: string;
  issuingAuthority?: string;
  passportAuthority?: string;
  passportType?: string;
  passportBiometric?: boolean;
  kartaPobytuType?: string;
  remarks?: string;
  municipalityOffice?: string;
  addressOfRegistration?: string;
  heightCm?: number;
  voivodatoStatus?: string;
  rawText?: string;
  rawFields?: Record<string, unknown>;
}

function normalizeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  try {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

const AZURE_MAX_IMAGE_BYTES = 3_500_000;
const AZURE_MAX_IMAGE_DIMENSION = 2200;

function normalizeDocumentNumber(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

  if (!/[0-9]/.test(normalized)) return undefined;

  const rejected = new Set([
    "REMARKS",
    "UWAGI",
    "ADDRESSOFREGISTRATION",
    "ADRESZAMELDOWANIA",
    "PASSPORT",
    "PASAPORTE",
    "KARTAPOBYTU",
  ]);

  if (rejected.has(normalized)) return undefined;
  return /^[A-Z0-9]{6,14}$/.test(normalized) ? normalized : undefined;
}

function normalizeHumanDate(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const monthMap: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    MAJ: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    AGO: "08",
    SEP: "09",
    OCT: "10",
    PAZ: "10",
    NOV: "11",
    DEC: "12",
    DIC: "12",
  };

  const compact = value.trim().toUpperCase().replace(/\s+/g, " ");
  const numeric = compact.match(/\b(\d{1,2})[./\s-]+(\d{1,2})[./\s-]+(\d{4})\b/);
  if (numeric) {
    const [, day, month, year] = numeric;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const named = compact.match(/\b(\d{1,2})\s+([A-ZÁÉÍÓÚÑ]{3,})[./A-Z]*\s+(\d{4})\b/);
  if (named) {
    const [, day, rawMonth, year] = named;
    const month = monthMap[normalizeSearchText(rawMonth).slice(0, 3)];
    if (month) return `${year}-${month}-${day.padStart(2, "0")}`;
  }

  return normalizeDate(value);
}

function extractFieldValue(field: unknown): string | undefined {
  if (!field) return undefined;
  const f = field as Record<string, unknown>;
  if (f.value !== undefined && f.value !== null) return String(f.value);
  if (f.content) return String(f.content);
  return undefined;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function extractRawFieldText(fields: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = extractFieldValue(fields[key]);
    if (value) return value;
  }

  return undefined;
}

function extractRegexGroup(
  rawText: string | undefined,
  patterns: RegExp[],
  transform?: (value: string) => string | undefined
): string | undefined {
  if (!rawText) return undefined;

  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    const value = match?.[1]?.trim();
    if (!value) continue;
    return transform ? transform(value) : value;
  }

  return undefined;
}

function normalizeWhitespace(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  const compact = normalizeSearchText(normalized).replace(/[^A-Z0-9]+/g, "");
  const labelOnlyValues = new Set([
    "REMARKS",
    "UWAGI",
    "UWAGIREMARKS",
    "ADDRESSOFREGISTRATION",
    "ADRESZAMELDOWANIA",
    "ADRESZAMELDOWANIAADDRESSOFREGISTRATION",
    "DATEOFISSUEANDISSUINGAUTHORITY",
    "DATAWYDANIAIORGANWYDAJACY",
  ]);
  if (labelOnlyValues.has(compact)) return undefined;
  return normalized.length > 0 ? normalized : undefined;
}

function parseHeightCm(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{2,3})/);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function detectPassportBiometric(
  rawText: string | undefined,
  fields: Record<string, unknown>
): boolean | undefined {
  const normalized = rawText ? normalizeSearchText(rawText) : "";
  if (normalized.includes("BIOMETRIC") || normalized.includes("BIOPASAPORTE")) {
    return true;
  }

  const mrzContent = extractFieldValue(fields.MachineReadableZone);
  if (mrzContent && extractFieldValue(fields.DocumentNumber)) {
    return true;
  }

  return undefined;
}

function inferDocumentType(fields: Record<string, unknown>, rawText: string | undefined): string {
  const documentTypeCode = extractFieldValue(fields.DocumentType);
  const category = normalizeSearchText(extractFieldValue(fields.Category) ?? "");
  const normalizedRawText = normalizeSearchText(rawText ?? "");

  if (documentTypeCode === "P" || normalizedRawText.includes("PASSPORT")) {
    return "PASSPORT";
  }

  if (
    category.includes("ZEZWOLENIE NA POBYT") ||
    normalizedRawText.includes("KARTA POBYTU")
  ) {
    return "KARTA_POBYTU";
  }

  if (
    normalizedRawText.includes("NUMER PESEL") ||
    normalizedRawText.includes("URZAD GMINY") ||
    normalizedRawText.includes("URZAD GMINY")
  ) {
    return "PESEL";
  }

  return "OTHER";
}

function disableBrokenLoopbackProxy() {
  const proxyKeys = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
  ] as const;

  const previousEntries = proxyKeys.map((key) => [key, process.env[key]] as const);
  const loopbackProxyPattern = /^http:\/\/127\.0\.0\.1:9\/?$/i;

  for (const [key, value] of previousEntries) {
    if (value && loopbackProxyPattern.test(value)) {
      delete process.env[key];
    }
  }

  return () => {
    for (const [key, value] of previousEntries) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function mapAzureIdDocumentFields(
  fields: Record<string, unknown>,
  rawText: string | undefined
): OcrExtractedData {
  const get = (key: string) => extractFieldValue(fields[key]);

  const normalizedRawText = rawText ? normalizeSearchText(rawText) : "";
  const personalNumber =
    get("PersonalNumber") ??
    extractRegexGroup(rawText, [
      /(?:NUMER PESEL|PERSONAL NUMBER\s*\(PESEL\))[:\s-]*([0-9]{11})/i,
      /\b([0-9]{11})\b/,
    ]);

  let docNumber = normalizeDocumentNumber(
    get("DocumentNumber") ??
      extractRawFieldText(fields, ["IdNumber", "Number", "CardNumber"]) ??
      extractRegexGroup(rawText, [
        /(?:PASSPORT\s*NO\.?|PASAPORTE\s*N[°O.]*)[:\s-]*([A-Z0-9]{6,14})/i,
        /(?:KARTA\s+POBYTU|RESIDENCE\s+PERMIT)[\s\S]{0,80}\b([A-Z]{1,3}\d{6,10})\b/i,
        /\b([A-Z]{1,3}\d{6,10})\b/i,
      ])
  );

  if (!docNumber) {
    for (const key in fields) {
      const val = extractFieldValue(fields[key]);
      const normalizedVal = normalizeDocumentNumber(val);
      if (normalizedVal) {
        docNumber = normalizedVal;
        break;
      }
    }
  }

  const issueDate =
    normalizeDate(get("DateOfIssue")) ??
    normalizeHumanDate(
      extractRegexGroup(rawText, [
        /(?:DATE OF ISSUE|FECHA DE EXPEDICI[OÓ]N|DATA WYDANIA[^0-9]*)[:\s-]*([0-9A-ZÁÉÍÓÚÑ./\s-]{8,24})/i,
      ])
    );
  const expiryDate =
    normalizeDate(get("DateOfExpiry") ?? get("DateOfExpiration")) ??
    normalizeHumanDate(
      extractRegexGroup(rawText, [
        /(?:DATE OF EXPIRY|DATE OF EXPIRATION|FECHA DE VENCIMIENTO|DATA WA[ŻZ]NO[ŚS]CI)[:\s-]*([0-9A-ZÁÉÍÓÚÑ./\s-]{8,24})/i,
      ])
    );
  const passportAuthority =
    normalizeWhitespace(get("IssuingAuthority")) ??
    extractRegexGroup(rawText, [
      /(?:AUTORIDAD|AUTHORITY)[:\s-]*([^\n]+)/i,
    ], normalizeWhitespace);
  const kartaType =
    normalizeWhitespace(get("Category")) ??
    extractRegexGroup(rawText, [
      /(?:RODZAJ ZEZWOLENIA|TYPE OF PERMIT)[:\s-]*([^\n]+)/i,
    ], normalizeWhitespace);
  const remarks =
    extractRegexGroup(rawText, [
      /(?:UWAGI\/REMARKS)[:\s-]*([^\n]+)/i,
    ], normalizeWhitespace);
  const addressOfRegistration =
    extractRegexGroup(rawText, [
      /(?:ADRES ZAMELDOWANIA|ADDRESS OF REGISTRATION)[:\s-]*([^\n]+)/i,
    ], normalizeWhitespace);
  const municipalityOffice =
    extractRegexGroup(rawText, [
      /(URZ[ĄA]D GMINY\s*[-–]\s*[^\n]+)/i,
    ], normalizeWhitespace);
  const heightCm =
    parseHeightCm(get("Height")) ??
    parseHeightCm(
      extractRegexGroup(rawText, [
        /(?:WZROST|HEIGHT)[:\s-]*([0-9]{2,3})/i,
      ])
    );
  const inferredDocumentType = inferDocumentType(fields, rawText);

  if (inferredDocumentType === "PASSPORT") {
    docNumber =
      normalizeDocumentNumber(
        extractRegexGroup(rawText, [
          /(?:PASSPORT\s*NO\.?|PASAPORTE\s*N[°O.]*)[:\s-]*([A-Z0-9]{6,14})/i,
          /\b([A-Z]{1,2}\d{6,9})\b/i,
        ])
      ) ?? docNumber;
  }

  if (inferredDocumentType === "KARTA_POBYTU") {
    docNumber =
      normalizeDocumentNumber(
        extractRegexGroup(rawText, [
          /\b(RS\d{6,10})\b/i,
          /\b([A-Z]{1,3}\d{6,10})\b/i,
        ])
      ) ?? docNumber;
  }
  const issuingCountry =
    get("CountryRegion") ??
    get("IssuingCountry") ??
    (normalizedRawText.includes("POLSKA") ? "POL" : undefined);
  const passportType =
    normalizeWhitespace(get("DocumentType")) ??
    extractRegexGroup(rawText, [
      /(?:TIPO|TYPE)[:\s-]*([A-Z])/i,
    ]);

  return {
    firstName: get("FirstName"),
    lastName: get("LastName"),
    documentNumber: docNumber,
    personalNumber,
    dateOfBirth: normalizeDate(get("DateOfBirth")),
    dateOfExpiry: expiryDate,
    dateOfIssue: issueDate,
    sex: get("Sex"),
    nationality: get("Nationality"),
    issuingCountry,
    placeOfBirth: get("PlaceOfBirth"),
    documentType: inferredDocumentType,
    documentTypeCode: get("DocumentType"),
    issuingAuthority: passportAuthority,
    passportAuthority,
    passportType,
    passportBiometric: inferredDocumentType === "PASSPORT"
      ? detectPassportBiometric(rawText, fields)
      : undefined,
    kartaPobytuType: inferredDocumentType === "KARTA_POBYTU" ? kartaType : undefined,
    remarks,
    municipalityOffice,
    addressOfRegistration,
    heightCm,
    rawText,
    rawFields: fields as Record<string, unknown>,
  };
}

async function shrinkImageForAzure(fileBuffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!mimeType.startsWith("image/")) return fileBuffer;
  if (fileBuffer.length <= AZURE_MAX_IMAGE_BYTES) return fileBuffer;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCanvas, loadImage } = require("canvas") as typeof import("canvas");
    const image = await loadImage(fileBuffer);
    const scale = Math.min(
      1,
      AZURE_MAX_IMAGE_DIMENSION / Math.max(image.width, image.height)
    );
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      const compressed = canvas.toBuffer("image/jpeg", { quality });
      if (compressed.length <= AZURE_MAX_IMAGE_BYTES || quality === 0.52) {
        return compressed;
      }
    }
  } catch (err) {
    console.error("[OCR] Image shrink failed; sending original image:", err);
  }

  return fileBuffer;
}

export async function analyzeDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OcrExtractedData | null> {
  if (!endpoint || !key) {
    console.error("[OCR] Azure DI credentials missing");
    return null;
  }

  let processBuffer = fileBuffer;
  processBuffer = await shrinkImageForAzure(fileBuffer, mimeType);

  const restoreProxyEnv = disableBrokenLoopbackProxy();

  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const uint8Data = new Uint8Array(processBuffer);
    const poller = await client.beginAnalyzeDocument(
      "prebuilt-idDocument",
      uint8Data
    );
    const result = await poller.pollUntilDone();
    if (!result.documents || result.documents.length === 0) return null;
    const doc = result.documents[0];
    if (!doc.fields) return null;
    return mapAzureIdDocumentFields(
      doc.fields as Record<string, unknown>,
      result.content
    );
  } catch (error) {
    console.error("[OCR] analyzeDocument error:", error);
    return null;
  } finally {
    restoreProxyEnv();
  }
}

export async function analyzePassport(imageUrl: string): Promise<OcrExtractedData | null> {
  if (!endpoint || !key) return null;
  const restoreProxyEnv = disableBrokenLoopbackProxy();
  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const poller = await client.beginAnalyzeDocumentFromUrl("prebuilt-idDocument", imageUrl);
    const result = await poller.pollUntilDone();
    if (!result.documents?.[0]?.fields) return null;
    return mapAzureIdDocumentFields(
      result.documents[0].fields as Record<string, unknown>,
      result.content
    );
  } catch (error) {
    console.error("[OCR] analyzePassport URL error:", error);
    return null;
  } finally {
    restoreProxyEnv();
  }
}
