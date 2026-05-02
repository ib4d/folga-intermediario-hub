import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_DI_ENDPOINT;
const key = process.env.AZURE_DI_KEY;

export interface OcrExtractedData {
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
  dateOfIssue?: string;
  sex?: string;
  nationality?: string;
  issuingCountry?: string;
  placeOfBirth?: string;
  documentType?: string;
  kartaPobytuType?: string;
  voivodatoStatus?: string;
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

function mapAzureIdDocumentFields(fields: Record<string, unknown>): OcrExtractedData {
  const get = (key: string) => extractFieldValue(fields[key]);
  
  let docNumber = get("DocumentNumber") || get("PersonalNumber");
  
  // If no document number found, try to find a 11-digit number for PESEL in any field content
  if (!docNumber) {
    for (const key in fields) {
      const val = extractFieldValue(fields[key]);
      if (val && /^\d{11}$/.test(val)) {
        docNumber = val;
        break;
      }
    }
  }

  return {
    firstName: get("FirstName"),
    lastName: get("LastName"),
    documentNumber: docNumber,
    dateOfBirth: normalizeDate(get("DateOfBirth")),
    dateOfExpiry: normalizeDate(get("DateOfExpiry")),
    dateOfIssue: normalizeDate(get("DateOfIssue")),
    sex: get("Sex"),
    nationality: get("Nationality"),
    issuingCountry: get("CountryRegion") ?? get("IssuingCountry"),
    placeOfBirth: get("PlaceOfBirth"),
    documentType: get("DocumentType") ?? "PASSPORT",
    rawFields: fields as Record<string, unknown>,
  };
}

async function pdfBufferToPngBuffer(pdfBuffer: Buffer): Promise<Buffer | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
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
    await page.render({ canvasContext: ctx, viewport }).promise;
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
  let processMime = mimeType;

  if (mimeType === "application/pdf" || mimeType === "application/octet-stream") {
    const pngBuffer = await pdfBufferToPngBuffer(fileBuffer);
    if (pngBuffer) {
      processBuffer = pngBuffer;
      processMime = "image/png";
    }
  }

  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const uint8Data = new Uint8Array(processBuffer);
    const poller = await client.beginAnalyzeDocument(
      "prebuilt-idDocument",
      uint8Data,
      {
        contentType: processMime as any,
      } as any
    );
    const result = await poller.pollUntilDone();
    if (!result.documents || result.documents.length === 0) return null;
    const doc = result.documents[0];
    if (!doc.fields) return null;
    return mapAzureIdDocumentFields(doc.fields as Record<string, unknown>);
  } catch (error) {
    console.error("[OCR] analyzeDocument error:", error);
    return null;
  }
}

export async function analyzePassport(imageUrl: string): Promise<OcrExtractedData | null> {
  if (!endpoint || !key) return null;
  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const poller = await client.beginAnalyzeDocumentFromUrl("prebuilt-idDocument", imageUrl);
    const result = await poller.pollUntilDone();
    if (!result.documents?.[0]?.fields) return null;
    return mapAzureIdDocumentFields(result.documents[0].fields as Record<string, unknown>);
  } catch (error) {
    console.error("[OCR] analyzePassport URL error:", error);
    return null;
  }
}