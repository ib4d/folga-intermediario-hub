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

const AZURE_MAX_IMAGE_BYTES = 3_500_000;
const AZURE_MAX_IMAGE_DIMENSION = 2200;

function normalizeDate(value: unknown): string | undefined {
  if (!value) return undefined;

  try {
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/[^A-Z0-9]+/g, "");
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

  const compact = normalizeSearchText(value).replace(/\s+/g, " ");
  const numeric = compact.match(/\b(\d{1,2})[./\s-]+(\d{1,2})[./\s-]+(\d{4})\b/);
  if (numeric) {
    const [, day, month, year] = numeric;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const named = compact.match(/\b(\d{1,2})\s+([A-Z]{3,})(?:[./][A-Z]{3,})?\s+(\d{4})\b/);
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
    "RESIDENCEPERMIT",
    "TYPEOFPERMIT",
  ]);

  if (rejected.has(normalized)) return undefined;
  return /^[A-Z0-9]{6,14}$/.test(normalized) ? normalized : undefined;
}

function normalizeDocumentNumberForType(
  value: string | undefined,
  documentType: string
): string | undefined {
  const normalized = normalizeDocumentNumber(value);
  if (!normalized) return undefined;

  if (
    (documentType === "PASSPORT" || documentType === "KARTA_POBYTU") &&
    /^\d{11}$/.test(normalized)
  ) {
    return undefined;
  }

  if (documentType === "KARTA_POBYTU" && !/^[A-Z]{1,3}\d{6,10}$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeWhitespace(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const normalized = value.replace(/\s+/g, " ").trim();
  const compact = compactSearchText(normalized);
  const labelOnlyValues = new Set([
    "REMARKS",
    "UWAGI",
    "UWAGIREMARKS",
    "ADDRESSOFREGISTRATION",
    "ADRESZAMELDOWANIA",
    "ADRESZAMELDOWANIAADDRESSOFREGISTRATION",
    "DATEOFISSUEANDISSUINGAUTHORITY",
    "DATAWYDANIAIORGANWYDAJACY",
    "DATEOFEXPIRY",
    "DATAWAZNOSCI",
    "TYPEOFPERMIT",
    "RODZAJZEZWOLENIA",
    "PLACEANDCOUNTRYOFBIRTH",
    "MIEJSCEIKRAJURODZENIA",
    "PASSPORTNO",
    "PASAPORTEN",
  ]);

  if (labelOnlyValues.has(compact)) return undefined;
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCountryCode(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const compact = compactSearchText(value);
  if (!compact || compact === "SI" || compact === "YES" || compact === "NO") {
    return undefined;
  }

  const aliases: Array<[string, string]> = [
    ["COLOMBIANA", "COL"],
    ["COLOMBIAN", "COL"],
    ["COLOMBIA", "COL"],
    ["KOLUMBIA", "COL"],
    ["COL", "COL"],
    ["POLSKA", "POL"],
    ["POLAND", "POL"],
    ["POL", "POL"],
    ["UKRAINA", "UKR"],
    ["UKRAINE", "UKR"],
    ["UKR", "UKR"],
    ["BIALORUS", "BLR"],
    ["BELARUS", "BLR"],
    ["BLR", "BLR"],
  ];

  for (const [alias, code] of aliases) {
    if (compact === alias || compact.includes(alias)) return code;
  }

  return /^[A-Z]{3}$/.test(compact) ? compact : undefined;
}

function normalizeSex(value: string | undefined): string | undefined {
  const normalized = normalizeWhitespace(value)?.toUpperCase();
  if (!normalized) return undefined;
  if (normalized === "M" || normalized.startsWith("MASC")) return "M";
  if (normalized === "F" || normalized.startsWith("FEM")) return "F";
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

function cleanLabeledValue(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const cleaned = normalizeSearchText(value)
    .replace(/\/?\b(TYPE OF PERMIT|RODZAJ ZEZWOLENIA)\b/g, " ")
    .replace(/\/?\b(PLACE AND COUNTRY OF BIRTH|PLACE OF BIRTH|MIEJSCE I KRAJ URODZENIA)\b/g, " ")
    .replace(/\/?\b(ADDRESS OF REGISTRATION|ADRES ZAMELDOWANIA)\b/g, " ")
    .replace(/\/?\b(DATE OF ISSUE AND ISSUING AUTHORITY|DATA WYDANIA I ORGAN WYDAJACY)\b/g, " ")
    .replace(/\/?\b(UWAGI|REMARKS)\b/g, " ")
    .replace(/^[:/\s-]+/, " ");

  return normalizeWhitespace(cleaned);
}

function extractLineValueNearLabels(
  rawText: string | undefined,
  labels: string[],
  maxFollowingLines = 2
): string | undefined {
  if (!rawText) return undefined;

  const lines = rawText.split(/\r?\n/);
  const normalizedLabels = labels.map(normalizeSearchText);

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeSearchText(lines[index]);
    const label = normalizedLabels.find((item) => normalizedLine.includes(item));
    if (!label) continue;

    const sameLineRemainder = normalizedLine.slice(normalizedLine.indexOf(label) + label.length);
    const sameLineValue = cleanLabeledValue(sameLineRemainder);
    if (sameLineValue) return sameLineValue;

    for (let offset = 1; offset <= maxFollowingLines; offset += 1) {
      const nextLine = lines[index + offset];
      if (!nextLine) continue;

      const value = cleanLabeledValue(nextLine);
      if (value) return value;
    }
  }

  return undefined;
}

function extractDateNearLabels(rawText: string | undefined, labels: string[]): string | undefined {
  if (!rawText) return undefined;

  const lines = rawText.split(/\r?\n/);
  const normalizedLabels = labels.map(normalizeSearchText);

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeSearchText(lines[index]);
    if (!normalizedLabels.some((label) => normalizedLine.includes(label))) continue;

    for (let offset = 0; offset <= 2; offset += 1) {
      const date = normalizeHumanDate(lines[index + offset]);
      if (date) return date;
    }
  }

  return undefined;
}

function parseHeightCm(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{2,3})/);
  if (!match) return undefined;

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMrzDate(value: string | undefined, kind: "birth" | "expiry"): string | undefined {
  const match = value?.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!match) return undefined;

  const [, yy, mm, dd] = match;
  const yearNumber = Number.parseInt(yy, 10);
  const currentYear = new Date().getUTCFullYear() % 100;
  const fullYear =
    kind === "birth" && yearNumber > currentYear
      ? 1900 + yearNumber
      : 2000 + yearNumber;

  return normalizeHumanDate(`${dd} ${mm} ${fullYear}`);
}

function normalizeMrzPersonName(value: string | undefined): string | undefined {
  const normalized = normalizeWhitespace(value?.replace(/</g, " "));
  return normalized ? normalized.toUpperCase() : undefined;
}

function parseMrzName(value: string | undefined): Pick<OcrExtractedData, "firstName" | "lastName"> {
  if (!value) return {};

  const [lastNamePart, firstNamePart] = value.split("<<");
  return {
    firstName: normalizeMrzPersonName(firstNamePart),
    lastName: normalizeMrzPersonName(lastNamePart),
  };
}

function getMrzLines(rawText: string | undefined): string[] {
  if (!rawText) return [];

  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeSearchText(line).replace(/\s+/g, ""))
    .filter((line) => /^[A-Z0-9<]{20,}$/.test(line));
}

function parseMrz(rawText: string | undefined): OcrExtractedData {
  const lines = getMrzLines(rawText);

  for (let index = 0; index < lines.length - 1; index += 1) {
    const firstLine = lines[index];
    const secondLine = lines[index + 1];

    if (!firstLine.startsWith("P<") || secondLine.length < 27) continue;

    const nameData = parseMrzName(firstLine.slice(5));
    return {
      ...nameData,
      documentNumber: normalizeDocumentNumberForType(secondLine.slice(0, 9), "PASSPORT"),
      dateOfBirth: parseMrzDate(secondLine.slice(13, 19), "birth"),
      dateOfExpiry: parseMrzDate(secondLine.slice(21, 27), "expiry"),
      sex: normalizeSex(secondLine[20]),
      nationality: normalizeCountryCode(secondLine.slice(10, 13)),
      issuingCountry: normalizeCountryCode(firstLine.slice(2, 5)),
      documentType: "PASSPORT",
      documentTypeCode: "P",
    };
  }

  for (let index = 0; index < lines.length - 2; index += 1) {
    const firstLine = lines[index];
    const secondLine = lines[index + 1];
    const thirdLine = lines[index + 2];

    if (!/^I[A-Z<]?POL/.test(firstLine)) continue;

    const documentNumber =
      normalizeDocumentNumberForType(
        firstLine.match(/^I[A-Z<]?POL([A-Z]{1,3}\d{6,8})\d?/)?.[1],
        "KARTA_POBYTU"
      ) ??
      normalizeDocumentNumberForType(firstLine.match(/([A-Z]{1,3}\d{6,10})/)?.[1], "KARTA_POBYTU");

    const dateMatch = secondLine.match(/^(\d{6})\d?([MF<])(\d{6})\d?([A-Z]{3})/);
    const nameData = parseMrzName(thirdLine);

    return {
      ...nameData,
      documentNumber,
      dateOfBirth: parseMrzDate(dateMatch?.[1], "birth"),
      sex: normalizeSex(dateMatch?.[2]),
      dateOfExpiry: parseMrzDate(dateMatch?.[3], "expiry"),
      nationality: normalizeCountryCode(dateMatch?.[4]),
      issuingCountry: "POL",
      documentType: "KARTA_POBYTU",
    };
  }

  return {};
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

function inferDocumentType(
  fields: Record<string, unknown>,
  rawText: string | undefined,
  mrzData: OcrExtractedData
): string {
  if (mrzData.documentType) return mrzData.documentType;

  const documentTypeCode = extractFieldValue(fields.DocumentType);
  const category = normalizeSearchText(extractFieldValue(fields.Category) ?? "");
  const normalizedRawText = normalizeSearchText(rawText ?? "");

  if (documentTypeCode === "P" || normalizedRawText.includes("PASSPORT") || normalizedRawText.includes("PASAPORTE")) {
    return "PASSPORT";
  }

  if (
    category.includes("ZEZWOLENIE NA POBYT") ||
    normalizedRawText.includes("KARTA POBYTU") ||
    normalizedRawText.includes("RESIDENCE PERMIT")
  ) {
    return "KARTA_POBYTU";
  }

  if (normalizedRawText.includes("NUMER PESEL") || normalizedRawText.includes("URZAD GMINY")) {
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

  const previousEntries = proxyKeys.map((proxyKey) => [proxyKey, process.env[proxyKey]] as const);
  const loopbackProxyPattern = /^http:\/\/127\.0\.0\.1:9\/?$/i;

  for (const [proxyKey, value] of previousEntries) {
    if (value && loopbackProxyPattern.test(value)) {
      delete process.env[proxyKey];
    }
  }

  return () => {
    for (const [proxyKey, value] of previousEntries) {
      if (value === undefined) {
        delete process.env[proxyKey];
      } else {
        process.env[proxyKey] = value;
      }
    }
  };
}

function mapAzureIdDocumentFields(
  fields: Record<string, unknown>,
  rawText: string | undefined
): OcrExtractedData {
  const get = (fieldName: string) => extractFieldValue(fields[fieldName]);
  const normalizedRawText = rawText ? normalizeSearchText(rawText) : "";
  const mrzData = parseMrz(rawText);
  const inferredDocumentType = inferDocumentType(fields, rawText, mrzData);

  const personalNumber =
    get("PersonalNumber") ??
    extractRegexGroup(normalizedRawText, [
      /(?:NUMER PESEL|PERSONAL NUMBER\s*\(?PESEL\)?)[^0-9]{0,40}([0-9]{11})/i,
      /\b([0-9]{11})\b/,
    ]) ??
    mrzData.personalNumber;

  let documentNumber =
    inferredDocumentType === "PESEL"
      ? undefined
      : normalizeDocumentNumberForType(mrzData.documentNumber, inferredDocumentType);

  if (!documentNumber && inferredDocumentType === "PASSPORT") {
    documentNumber = normalizeDocumentNumberForType(
      get("DocumentNumber") ??
        extractRegexGroup(normalizedRawText, [
          /(?:PASSPORT\s*NO\.?|PASAPORTE\s*N\.?)[^A-Z0-9]{0,30}([A-Z0-9]{6,14})/i,
          /\b([A-Z]{1,2}\d{6,9})\b/i,
        ]),
      inferredDocumentType
    );
  }

  if (!documentNumber && inferredDocumentType === "KARTA_POBYTU") {
    documentNumber = normalizeDocumentNumberForType(
      extractRegexGroup(normalizedRawText, [
        /\b(RS\d{7,8})\d?\b/i,
        /(?:KARTA\s+POBYTU|RESIDENCE\s+PERMIT)[\s\S]{0,120}\b([A-Z]{1,3}\d{6,10})\b/i,
      ]) ??
        get("DocumentNumber") ??
        get("IdNumber") ??
        get("CardNumber"),
      inferredDocumentType
    );
  }

  if (!documentNumber && inferredDocumentType !== "PESEL") {
    documentNumber = normalizeDocumentNumberForType(
      get("DocumentNumber") ??
        get("IdNumber") ??
        get("Number") ??
        get("CardNumber") ??
        extractRegexGroup(normalizedRawText, [/\b([A-Z]{1,3}\d{6,10})\b/i]),
      inferredDocumentType
    );
  }

  if (!documentNumber && inferredDocumentType !== "PESEL") {
    for (const fieldName in fields) {
      const fieldValue = extractFieldValue(fields[fieldName]);
      const normalizedDocumentNumber = normalizeDocumentNumberForType(
        fieldValue,
        inferredDocumentType
      );
      if (normalizedDocumentNumber) {
        documentNumber = normalizedDocumentNumber;
        break;
      }
    }
  }

  const dateOfIssue =
    normalizeDate(get("DateOfIssue")) ??
    extractDateNearLabels(rawText, [
      "DATE OF ISSUE",
      "FECHA DE EXPEDICION",
      "DATA WYDANIA",
    ]);

  const dateOfExpiry =
    normalizeDate(get("DateOfExpiry") ?? get("DateOfExpiration")) ??
    mrzData.dateOfExpiry ??
    extractDateNearLabels(rawText, [
      "DATE OF EXPIRY",
      "DATE OF EXPIRATION",
      "FECHA DE VENCIMIENTO",
      "DATA WAZNOSCI",
    ]);

  const dateOfBirth =
    normalizeDate(get("DateOfBirth")) ??
    mrzData.dateOfBirth ??
    extractDateNearLabels(rawText, [
      "DATE OF BIRTH",
      "FECHA DE NACIMIENTO",
      "DATA URODZENIA",
    ]);

  const passportAuthority =
    normalizeWhitespace(get("IssuingAuthority")) ??
    cleanLabeledValue(
      extractRegexGroup(normalizedRawText, [
        /(?:AUTORIDAD|AUTHORITY)[^A-Z0-9]{0,20}([A-Z0-9 .-]{3,80})/i,
      ])
    );

  const kartaPobytuType =
    inferredDocumentType === "KARTA_POBYTU"
      ? normalizeWhitespace(get("Category")) ??
        extractLineValueNearLabels(rawText, ["RODZAJ ZEZWOLENIA", "TYPE OF PERMIT"])
      : undefined;

  const remarks =
    inferredDocumentType === "KARTA_POBYTU"
      ? extractLineValueNearLabels(rawText, ["UWAGI", "REMARKS"], 1)
      : undefined;

  const municipalityOffice =
    inferredDocumentType === "PESEL"
      ? extractLineValueNearLabels(rawText, ["URZAD GMINY"], 0)
      : undefined;

  const addressOfRegistration =
    inferredDocumentType === "KARTA_POBYTU"
      ? extractLineValueNearLabels(rawText, ["ADRES ZAMELDOWANIA", "ADDRESS OF REGISTRATION"], 1)
      : undefined;

  const placeOfBirth =
    normalizeWhitespace(get("PlaceOfBirth")) ??
    extractLineValueNearLabels(rawText, [
      "PLACE AND COUNTRY OF BIRTH",
      "PLACE OF BIRTH",
      "LUGAR DE NACIMIENTO",
      "MIEJSCE I KRAJ URODZENIA",
    ]);

  const heightCm =
    parseHeightCm(get("Height")) ??
    parseHeightCm(extractLineValueNearLabels(rawText, ["WZROST", "HEIGHT"], 1));

  const issuingCountry =
    normalizeCountryCode(get("CountryRegion")) ??
    normalizeCountryCode(get("IssuingCountry")) ??
    mrzData.issuingCountry ??
    (normalizedRawText.includes("POLSKA") ? "POL" : undefined);

  const nationality =
    normalizeCountryCode(get("Nationality")) ??
    mrzData.nationality ??
    normalizeCountryCode(extractLineValueNearLabels(rawText, ["NATIONALITY", "NACIONALIDAD", "OBYWATELSTWO"]));

  const passportType =
    normalizeWhitespace(get("DocumentType")) ??
    cleanLabeledValue(
      extractRegexGroup(normalizedRawText, [
        /(?:TIPO|TYPE)[^A-Z0-9]{0,20}([A-Z])/i,
      ])
    );

  return {
    firstName: normalizeWhitespace(get("FirstName")) ?? mrzData.firstName,
    lastName: normalizeWhitespace(get("LastName")) ?? mrzData.lastName,
    documentNumber,
    personalNumber,
    dateOfBirth,
    dateOfExpiry,
    dateOfIssue,
    sex: normalizeSex(get("Sex")) ?? mrzData.sex,
    nationality,
    issuingCountry,
    placeOfBirth,
    documentType: inferredDocumentType,
    documentTypeCode: get("DocumentType") ?? mrzData.documentTypeCode,
    issuingAuthority: passportAuthority,
    passportAuthority,
    passportType,
    passportBiometric:
      inferredDocumentType === "PASSPORT" ? detectPassportBiometric(rawText, fields) : undefined,
    kartaPobytuType,
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
    let bestBuffer: Buffer | null = null;

    for (const dimensionFactor of [1, 0.85, 0.7, 0.55, 0.42]) {
      const scale =
        Math.min(1, AZURE_MAX_IMAGE_DIMENSION / Math.max(image.width, image.height)) *
        dimensionFactor;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, width, height);

      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
        const compressed = canvas.toBuffer("image/jpeg", { quality });
        if (!bestBuffer || compressed.length < bestBuffer.length) {
          bestBuffer = compressed;
        }
        if (compressed.length <= AZURE_MAX_IMAGE_BYTES) {
          return compressed;
        }
      }
    }

    return bestBuffer ?? fileBuffer;
  } catch (err) {
    console.error("[OCR] Image shrink failed; sending original image:", err);
    return fileBuffer;
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

  const processBuffer = await shrinkImageForAzure(fileBuffer, mimeType);
  const restoreProxyEnv = disableBrokenLoopbackProxy();

  try {
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const uint8Data = new Uint8Array(processBuffer);
    const poller = await client.beginAnalyzeDocument("prebuilt-idDocument", uint8Data);
    const result = await poller.pollUntilDone();
    if (!result.documents || result.documents.length === 0) return null;

    const document = result.documents[0];
    if (!document.fields) return null;

    return mapAzureIdDocumentFields(
      document.fields as Record<string, unknown>,
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
