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

  let docNumber =
    get("DocumentNumber") ??
    extractRawFieldText(fields, ["IdNumber", "Number", "CardNumber"]) ??
    extractRegexGroup(rawText, [
      /\b([A-Z]{2}\d{7,9})\b/i,
      /\b([A-Z0-9]{6,12})\b/,
    ]);

  if (!docNumber) {
    for (const key in fields) {
      const val = extractFieldValue(fields[key]);
      if (val && /^[A-Z0-9]{6,12}$/i.test(val)) {
        docNumber = val;
        break;
      }
    }
  }

  const issueDate = normalizeDate(get("DateOfIssue"));
  const expiryDate = normalizeDate(get("DateOfExpiry") ?? get("DateOfExpiration"));
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

async function pdfBufferToPngBuffer(pdfBuffer: Buffer): Promise<Buffer | null> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const scale = 2.5;
    const viewport = page.getViewport({ scale });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCanvas } = require("canvas");
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    const renderContext = { canvasContext: ctx, viewport, canvas } as unknown as Parameters<
      typeof page.render
    >[0];
    await page.render(renderContext).promise;
    return canvas.toBuffer("image/png");
  } catch (err) {
    console.error("[OCR] PDF->PNG failed:", err);
    return null;
  }
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
  // const processMime = mimeType; // Removed as it is currently unused in the refined OCR flow

  if (mimeType === "application/pdf" || mimeType === "application/octet-stream") {
    const pngBuffer = await pdfBufferToPngBuffer(fileBuffer);
    if (pngBuffer) {
      processBuffer = pngBuffer;
    }
  }

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
