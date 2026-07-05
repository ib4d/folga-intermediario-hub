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
  documentDisposition?: "PRIMARY" | "BACK";
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
  const numeric = compact.match(/\b(\d{1,2})[./\s-]+(\d{1,2})[./\s-]+(\d{4,5})\b/);
  if (numeric) {
    const [, day, month, rawYear] = numeric;
    const year = rawYear.length === 5 && rawYear.startsWith("20")
      ? `20${rawYear.slice(-2)}`
      : rawYear;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const named = compact.match(/\b(\d{1,2})\s*([A-Z0-9]{3,})(?:[./]([A-Z0-9]{3,}))?\s*(\d{4})\b/);
  if (named) {
    const [, day, rawMonth, alternateMonth, year] = named;
    const monthToken = [rawMonth, alternateMonth]
      .filter(Boolean)
      .map((item) => normalizeSearchText(item).replace(/^0/, "O").slice(0, 3))
      .find((item) => monthMap[item]);
    const month = monthToken ? monthMap[monthToken] : undefined;
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
  let normalized = normalizeDocumentNumber(value);
  if (!normalized) return undefined;

  if (
    (documentType === "PASSPORT" || documentType === "KARTA_POBYTU") &&
    /^\d{11}$/.test(normalized)
  ) {
    return undefined;
  }

  if (documentType === "KARTA_POBYTU" && /^RED\d{6}$/.test(normalized)) {
    normalized = `RS9${normalized.slice(3)}`;
  }

  if (documentType === "KARTA_POBYTU" && !/^[A-Z]{1,3}\d{6,10}$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizePersonalNumber(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const normalized = value
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

  if (!normalized) return undefined;
  if (!/\d{6,}/.test(normalized)) return undefined;
  if (/^[A-Z]{1,3}\d{6,10}$/.test(normalized)) return normalized;
  if (/^\d{8,14}$/.test(normalized)) return normalized;

  return undefined;
}

function isValidPesel(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;

  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const checksum = weights.reduce(
    (sum, weight, index) => sum + Number(value[index]) * weight,
    0,
  );
  const expectedCheckDigit = (10 - (checksum % 10)) % 10;
  return expectedCheckDigit === Number(value[10]);
}

function peselBirthPrefix(dateOfBirth: string | undefined): string | undefined {
  if (!dateOfBirth) return undefined;

  const match = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  let month = Number(match[2]);
  const day = Number(match[3]);

  if (year >= 1800 && year <= 1899) month += 80;
  else if (year >= 2000 && year <= 2099) month += 20;
  else if (year >= 2100 && year <= 2199) month += 40;
  else if (year >= 2200 && year <= 2299) month += 60;
  else if (year < 1900 || year > 2299) return undefined;

  return `${String(year).slice(-2)}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

function normalizePeselAgainstBirthDate(
  value: string | undefined,
  dateOfBirth: string | undefined,
): string | undefined {
  const normalized = normalizePersonalNumber(value);
  if (!normalized || !/^\d{11}$/.test(normalized)) return normalized;

  const expectedPrefix = peselBirthPrefix(dateOfBirth);
  if (!expectedPrefix) return normalized;

  if (normalized.startsWith(expectedPrefix)) {
    return normalized;
  }

  const reconstructed = `${expectedPrefix}${normalized.slice(6)}`;
  const changedDigits = [...normalized.slice(0, 6)].filter(
    (digit, index) => digit !== expectedPrefix[index],
  ).length;

  if (changedDigits <= 2 && isValidPesel(reconstructed)) {
    return reconstructed;
  }

  return isValidPesel(normalized) ? normalized : undefined;
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

function normalizeExtractedPersonName(value: string | undefined): string | undefined {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return undefined;

  const cleaned = normalized
    .replace(/^[^\p{L}0-9]+/u, "")
    .replace(/[^\p{L}0-9]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return undefined;

  const alphaCount = cleaned.replace(/[^\p{L}]/gu, "").length;
  if (alphaCount < 3) return undefined;
  if (/\d/.test(cleaned) && alphaCount < 6) return undefined;

  const compact = compactSearchText(cleaned);
  const rejectedFragments = [
    "PARENTSFORENAMES",
    "GIVENNAME",
    "GIVENNAMES",
    "SURNAME",
    "FIRSTNAME",
    "LASTNAME",
    "IMIONA",
    "NATIONALITY",
    "DATEOFBIRTH",
    "PLACEOFBIRTH",
    "ADDRESS",
    "MIEJSCEI KRAJURODZENIA",
    "RODZICOW",
    "IMIONARODZICOW",
    "DATEOF",
    "FECHA",
    "SIGNATURE",
    "HOLDERSSIGNATURE",
    "AUTHORITY",
    "AUTORIDAD",
    "NATIONALITY",
    "NACIONALIDAD",
    "SEX",
    "PASSPORT",
    "PERSONALNUMBER",
    "DOCUMENTNUMBER",
    "REPUBLICA",
    "COLOMBIA",
    "FIRMA",
    "CAMSCANNER",
    "COLLAGE",
    "SCANNER",
    "SCANNED",
  ].map((item) => item.replace(/\s+/g, ""));
  if (rejectedFragments.some((label) => compact.includes(label))) return undefined;

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const shortTokenCount = tokens.filter((token) => token.length <= 2).length;
  if (tokens.length > 4 && shortTokenCount >= 2) return undefined;
  if (tokens.every((token) => /^(IMG|WA|JPG|JPEG|PNG|SCAN|PHOTO|FOTO|IMAGE)$/i.test(token))) {
    return undefined;
  }

  return cleaned.toUpperCase();
}

function scorePersonNameCandidate(value: string | undefined): number {
  if (!value) return -1;
  const alphaCount = value.replace(/[^\p{L}]/gu, "").length;
  const wordCount = value.split(/\s+/).filter(Boolean).length;
  const digitsPenalty = /\d/.test(value) ? 10 : 0;

  return alphaCount + wordCount * 2 - digitsPenalty + Math.min(6, value.length / 4);
}

function pickBestPersonName(...values: Array<string | undefined>): string | undefined {
  const candidates = values
    .map((value) => normalizeExtractedPersonName(value))
    .filter((value): value is string => Boolean(value));

  if (candidates.length === 0) return undefined;
  return candidates.sort((left, right) => scorePersonNameCandidate(right) - scorePersonNameCandidate(left))[0];
}

function stripLeadingLabelNoise(value: string): string {
  const labelPatterns = [
    /^(?:IMIE|IMI|IMIONA|GIVEN NAME|GIVEN NAMES|NOMBRE|NOMBRES|FIRST NAME|FIRST NAMES|SURNAME|LAST NAME|NAZWISKO|APELLIDO|APELLIDOS|PARENTS FORENAMES|PARENTS FORNAMES|MOTHER|FATHER|NAME|NATIONALITY|NACIONALIDAD|OBYWATELSTWO|SEX|DATE OF BIRTH|DATE OF ISSUE|DATE OF EXPIRY|PLACE OF BIRTH|PLACE AND COUNTRY OF BIRTH|ADDRESS OF REGISTRATION|ADRES ZAMELDOWANIA|TYPE OF PERMIT|RODZAJ ZEZWOLENIA|REMARKS|UWAGI|DOCUMENT NUMBER|PASSPORT NO|PASSPORT|PASAPORTE|PERSONAL NUMBER|NUMER PESEL|PESEL)\b[\s:./-]*/i,
  ];

  let current = value;
  let previous = "";

  while (current !== previous) {
    previous = current;
    for (const pattern of labelPatterns) {
      current = current.replace(pattern, " ").trimStart();
    }
  }

  return current;
}

function extractBestPersonValueNearLabels(
  rawText: string | undefined,
  labels: string[],
  maxFollowingLines = 1
): string | undefined {
  if (!rawText) return undefined;

  const lines = rawText.split(/\r?\n/);
  const normalizedLabels = labels.map(normalizeSearchText);
  const candidates: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeSearchText(lines[index]);
    const label = normalizedLabels.find((item) => normalizedLine.includes(item));
    if (!label) continue;

    const sameLineRemainder = normalizedLine.slice(normalizedLine.indexOf(label) + label.length);
    const sameLineValue = cleanLabeledValue(sameLineRemainder);
    if (sameLineValue) candidates.push(sameLineValue);

    for (let offset = 1; offset <= maxFollowingLines; offset += 1) {
      const nextLine = lines[index + offset];
      if (!nextLine) continue;

      const value = cleanLabeledValue(nextLine);
      if (value) candidates.push(value);
    }
  }

  return pickBestPersonName(...candidates);
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

  const cleaned = stripLeadingLabelNoise(
    normalizeSearchText(value)
      .replace(/\/?\b(IMIE|IMI\b|IMIONA|GIVEN NAME|GIVEN NAMES|NOMBRE|NOMBRES|SURNAME|LAST NAME|NAZWISKO|APELLIDOS)\b/g, " ")
      .replace(/\/?\b(TYPE OF PERMIT|RODZAJ ZEZWOLENIA)\b/g, " ")
      .replace(/\/?\b(PLACE AND COUNTRY OF BIRTH|PLACE OF BIRTH|MIEJSCE I KRAJ URODZENIA)\b/g, " ")
      .replace(/\/?\b(ADDRESS OF REGISTRATION|ADRES ZAMELDOWANIA)\b/g, " ")
      .replace(/\/?\b(DATE OF ISSUE AND ISSUING AUTHORITY|DATA WYDANIA I ORGAN WYDAJACY)\b/g, " ")
      .replace(/\/?\b(DATE OF EXPIRY|DATA WAZNOSCI)\b/g, " ")
      .replace(/\/?\b(UWAGI|REMARKS)\b/g, " ")
      .replace(/^[:/\s-]+/, " ")
  );

  const normalized = normalizeWhitespace(cleaned);
  if (!normalized) return undefined;

  const stripped = normalized
    .replace(/^[^A-Z0-9]+/i, "")
    .replace(/[^A-Z0-9]+$/i, "")
    .trim();

  return stripped.length > 0 ? stripped : undefined;
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

function cleanPlaceOfBirthValue(value: string | undefined): string | undefined {
  const normalized = cleanLabeledValue(value);
  if (!normalized) return undefined;

  const withoutLabels = normalized
    .replace(/\bPLACE\s+AND\s+COUNTRY\s+OF\s+BIRTH\b/gi, " ")
    .replace(/\bPLACE\s+OF\s+BIRTH\b/gi, " ")
    .replace(/\bCOUNTRY\s+OF\s+BIRTH\b/gi, " ")
    .replace(/\bLUGAR\s+DE\s+NACIMIENTO\b/gi, " ")
    .replace(/\bMIEJSCE\s+I\s+KRAJ\s+URODZENIA\b/gi, " ");

  const tokens = withoutLabels
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        ![
          "PLACE",
          "BIRTH",
          "COUNTRY",
          "LUGAR",
          "NACIMIENTO",
          "MIEJSCE",
          "KRAJ",
          "URODZENIA",
          "AND",
          "OF",
          "Q",
          "BS",
          "AUTHORITY",
          "AUTORIDAD",
          "DATE",
          "ISSUE",
        ].includes(token),
    );

  if (tokens.length === 0) return undefined;

  const trimmedTokens =
    tokens.length > 1 && /^[A-Z]{3}$/.test(tokens[tokens.length - 1]) ? tokens.slice(0, -1) : tokens;

  if (trimmedTokens.length === 0) return undefined;
  if (trimmedTokens.every((token) => token.length <= 2)) return undefined;

  return trimmedTokens.join(" ");
}

function cleanIssuingAuthorityValue(value: string | undefined): string | undefined {
  const normalized = cleanLabeledValue(value)?.replace(/[|]/g, " ");
  if (!normalized) return undefined;
  const extractedAuthorityTail =
    normalized.match(
      /\b(?:AUTHORITY|AUTORIDAD|ORGAN WYDAJACY|ISSUING AUTHORITY)\b[\s:./_-]*([A-Z][A-Z .-]{2,})$/i,
    )?.[1] ??
    normalized.match(
      /\b(?:\d{1,2}\s+[A-Z]{3}(?:\/[A-Z]{3})?\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s*[_.,-]*\s*([A-Z][A-Z .-]{2,})$/i,
    )?.[1] ??
    normalized;

  const cleaned = extractedAuthorityTail
    .replace(/\b\d{1,2}[A-Z]{3}(?:\/[A-Z]{3})?\d{4}\b/gi, " ")
    .replace(/\b\d{1,2}\s+[A-Z]{3}(?:[./][A-Z]{3})?\s+\d{4}\b/gi, " ")
    .replace(/\b\d{1,2}\s*[./-]?\s*[A-Z0-9]{3}(?:\/[A-Z0-9]{3})?\s*\d{4}\b/gi, " ")
    .replace(/\b\d{1,2}\s+[A-Z]{3}(?:\/[A-Z]{3})?\s+\d{4}\s*[_.,-]*\s*/gi, " ")
    .replace(/\b\d{1,2}[./\s-]+\d{1,2}[./\s-]+\d{4,5}\s*[_.,-]*\s*/gi, " ")
    .replace(/\b\d{1,2}\s+[A-Z]{3}\b/gi, " ")
    .replace(/\bDATE OF ISSUE AND ISSUING AUTHORITY\b/gi, " ")
    .replace(/\bDATA WYDANIA I ORGAN WYDAJACY\b/gi, " ")
    .replace(/\bORGAN WYDAJACY\b/gi, " ")
    .replace(/\bDATA WYDANIA I ORGAN WYDAJACY\/DATE OF ISSUE AND ISSUING AUTHORITY\b/gi, " ")
    .replace(/\bDATE OF ISSUE AND ISSUING AUTHORITY\/DATA WYDANIA I ORGAN WYDAJACY\b/gi, " ")
    .replace(/\bDATE OF ISSUE\b/gi, " ")
    .replace(/\bFECHA DE EXPEDICION\b/gi, " ")
    .replace(/\bPLACE AND COUNTRY OF BIRTH\b/gi, " ")
    .replace(/\bPLACE OF BIRTH\b/gi, " ")
    .replace(/\bPLACE AND COUNTRY OF BIRTH\s+[A-Z]{1,3}\s+[A-Z]{1,3}\b/gi, " ")
    .replace(/\bAUTHORITY\b/gi, " ")
    .replace(/\bAUTORIDAD\b/gi, " ")
    .replace(/\bISSUING AUTHORITY\b/gi, " ")
    .replace(/\bDATA WYDANIA\b/gi, " ")
    .replace(/\bDATE OF ISSUE AND ISSUING AUTHORITY\b/gi, " ")
    .replace(/\b\d{1,2}\s+[A-Z]{3}\s+\d{4}\s+[A-Z]\.?\s+[A-Z]{2,}\b/gi, " ")
    .replace(/\b\d{1,2}\s+[A-Z]{3}\s+[A-Z]{3}\s+\d{4}\b/gi, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\s+[A-Z]\.?\s+[A-Z]{2,}\b/gi, " ")
    .replace(/^[./,_\-\s]+|[./,_\-\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return undefined;
  if (normalizeHumanDate(cleaned)) return undefined;
  if (/^\d{1,2}\s+[A-Z]{3}(?:[./][A-Z]{3})?\s+\d{4}$/i.test(cleaned)) return undefined;
  if (/^\d{1,2}\s+[A-Z]{3}$/i.test(cleaned)) return undefined;
  if (/^(?:[A-Z]{3}\s+){2,}\d{2,4}$/i.test(cleaned)) return undefined;

  const compact = compactSearchText(cleaned);
  const rejectedLabels = [
    "AUTHORITY",
    "AUTORIDAD",
    "DATEOFISSUE",
    "DATEOFEXPIRY",
    "FECHADEEXPEDICION",
    "FECHADEVENCIMIENTO",
    "HOLDERSSIGNATURE",
    "FIRMADELTITULAR",
  ];
  if (rejectedLabels.some((label) => compact === label)) return undefined;

  return cleaned.replace(/\bWOJEWODA\s+EODZKI\b/gi, "WOJEWODA LODZKI");
}

function cleanKartaRemarksValue(value: string | undefined): string | undefined {
  const normalized = cleanLabeledValue(value);
  if (!normalized) return undefined;

  const compact = compactSearchText(normalized);
  if (compact.includes("DOSTEPDORYNKUPRACY")) {
    return "DOSTEP DO RYNKU PRACY";
  }

  return normalized;
}

function restorePassportLastNameSpacing(
  value: string | undefined,
  spacingHint: string | undefined,
): string | undefined {
  const normalized = normalizeExtractedPersonName(value);
  if (!normalized) return undefined;
  if (normalized.includes(" ")) return normalized;
  const normalizedHint = normalizeExtractedPersonName(spacingHint);
  if (!normalizedHint?.includes(" ")) return normalized;

  const compact = (candidate: string) => normalizeSearchText(candidate).replace(/\s+/g, "");
  return compact(normalized) === compact(normalizedHint) ? normalizedHint : normalized;
}

function cleanPassportNameValue(value: string | undefined, mode: "first" | "last"): string | undefined {
  const normalized = normalizeSearchText(value ?? "")
    .replace(/[^A-Z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return undefined;

  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const stopTokens = new Set([
    "F",
    "M",
    "REPUBLICA",
    "COLOMBIA",
    "COLOMBIANA",
    "COL",
    "NACIONALIDAD",
    "NATIONALITY",
    "DATE",
    "BIRTH",
    "PLACE",
    "ISSUE",
    "EXPIRY",
    "AUTORIDAD",
    "AUTHORITY",
    "PERSONAL",
    "NUMBER",
    "PASSPORT",
    "ZOCL",
    "ZOCI",
  ]);

  const tokens: string[] = [];
  for (const token of rawTokens) {
    if (stopTokens.has(token)) break;
    if (token.length === 1 && token !== "Y") break;
    if (token.length === 2 && mode === "first") break;
    tokens.push(token);
  }

  if (tokens.length === 0) return undefined;
  return normalizeExtractedPersonName(tokens.join(" "));
}

function hasPassportNameBleed(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeSearchText(value);
  if (!normalized) return false;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (["F", "M"].includes(tokens[0])) return true;
  if (tokens.length > 4) return true;
  if (tokens.some((token) => ["COL", "ZOCL", "ZOCI", "REPUBLICA", "COLOMBIA", "AUTORIDAD", "AUTHORITY"].includes(token))) {
    return true;
  }

  return false;
}

function pickBestPassportName(...values: Array<string | undefined>): string | undefined {
  const normalizedCandidates = values
    .map((value) => normalizeExtractedPersonName(value))
    .filter((value): value is string => Boolean(value));

  if (normalizedCandidates.length === 0) return undefined;

  const safeCandidates = normalizedCandidates.filter((value) => !hasPassportNameBleed(value));
  const candidates = safeCandidates.length > 0 ? safeCandidates : normalizedCandidates;

  return candidates.sort((left, right) => scorePersonNameCandidate(right) - scorePersonNameCandidate(left))[0];
}

function isLikelyPassportTrailingNoiseToken(token: string): boolean {
  const normalized = normalizeSearchText(token).trim();
  if (!normalized) return false;
  if (normalized.length === 1) return true;
  if (/^[KLX]+$/.test(normalized)) return true;
  if (!/[AEIOUY]/.test(normalized) && normalized.length <= 4 && new Set(normalized.split("")).size <= 3) {
    return true;
  }

  return false;
}

function trimPassportFirstNameNoise(firstName: string | undefined): string | undefined {
  const normalizedFirstName = normalizeExtractedPersonName(firstName);
  if (!normalizedFirstName) return undefined;

  const tokens = normalizeSearchText(normalizedFirstName).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;

  while (tokens.length > 1 && isLikelyPassportTrailingNoiseToken(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const lastToken = tokens[tokens.length - 1];
  if (lastToken) {
    const trailingNoise = lastToken.match(/^([A-Z]{4,})([KLX])$/);
    if (trailingNoise && /[AEIOUY]/.test(trailingNoise[1])) {
      tokens[tokens.length - 1] = trailingNoise[1];
    }
  }

  return normalizeExtractedPersonName(tokens.join(" "));
}

function collectPassportFirstNameTokens(...values: Array<string | undefined>): string[] {
  const tokens = values
    .flatMap((value) =>
      normalizeSearchText(trimPassportFirstNameNoise(value) ?? "")
        .split(/\s+/)
        .filter((token) => token.length >= 3)
    )
    .filter(Boolean);

  return [...new Set(tokens)];
}

function trimPassportLastNameNoise(
  lastName: string | undefined,
  ...firstNameHints: Array<string | undefined>
): string | undefined {
  const normalizedLastName = normalizeExtractedPersonName(lastName);
  if (!normalizedLastName) return undefined;

  const cleanedLastNameTokens = normalizeSearchText(normalizedLastName)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token, index, allTokens) => !(token.length === 1 && index > 0 && index < allTokens.length - 1))
    .map((token, index) => {
      if (index === 0) return token;
      const fillerPrefix = token.match(/^[KLX]([A-Z]{4,})$/);
      return fillerPrefix && /[AEIOUY]/.test(fillerPrefix[1]) ? fillerPrefix[1] : token;
    });
  const cleanedLastName = normalizeExtractedPersonName(cleanedLastNameTokens.join(" "));
  if (!cleanedLastName) return undefined;

  const firstNameTokens = collectPassportFirstNameTokens(...firstNameHints);
  if (firstNameTokens.length === 0) return cleanedLastName;

  const lastNameTokens = normalizeSearchText(cleanedLastName).split(/\s+/).filter(Boolean);
  if (lastNameTokens.length <= 1) return cleanedLastName;

  for (let index = 1; index < lastNameTokens.length; index += 1) {
    const token = lastNameTokens[index];
    const matchedFirstName = firstNameTokens.find(
      (firstNameToken) =>
        token === firstNameToken ||
        token.includes(firstNameToken) ||
        token.endsWith(firstNameToken) ||
        token.startsWith(firstNameToken)
    );
    if (!matchedFirstName) continue;

    const trimmedTokens = lastNameTokens.slice(0, index);
    const previousToken = trimmedTokens[trimmedTokens.length - 1];
    if (previousToken) {
      const trailingNoise = previousToken.match(/^([A-Z]+?)([A-Z])$/);
      if (
        trailingNoise &&
        trailingNoise[1].length >= 3 &&
        token.startsWith(trailingNoise[2] + matchedFirstName)
      ) {
        trimmedTokens[trimmedTokens.length - 1] = trailingNoise[1];
      }
    }

    const trimmedValue = normalizeExtractedPersonName(trimmedTokens.join(" "));
    if (trimmedValue) return trimmedValue;
  }

  return cleanedLastName;
}

function cleanPassportPlaceOfBirthValue(value: string | undefined): string | undefined {
  const normalized = normalizeSearchText(value ?? "")
    .replace(/[^A-Z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return undefined;

  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.filter((token, index) => !(index === 0 && ["F", "M"].includes(token)));
  while (tokens.length > 0) {
    const last = tokens[tokens.length - 1];
    if (/^[A-Z]{1,3}$/.test(last) || last === "ZOCL" || last === "ZOCI") {
      tokens.pop();
      continue;
    }
    break;
  }

  return cleanPlaceOfBirthValue(tokens.join(" "));
}

function extractPassportLabeledNextLine(rawText: string | undefined, labels: RegExp[]): string | undefined {
  if (!rawText) return undefined;
  const lines = rawText.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = normalizeSearchText(lines[index]);
    if (!labels.some((label) => label.test(line))) continue;

    for (let offset = 1; offset <= 2; offset += 1) {
      const candidate = lines[index + offset];
      if (!candidate) continue;
      const cleaned = normalizeWhitespace(candidate);
      if (cleaned) return cleaned;
    }
  }

  return undefined;
}

function extractPassportFieldValue(rawText: string | undefined, labels: string[], stopLabels: string[]): string | undefined {
  if (!rawText) return undefined;

  const labelPattern = labels
    .map((label) => normalizeSearchText(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const stopPattern = stopLabels
    .map((label) => normalizeSearchText(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const normalizedRawText = normalizeSearchText(rawText);

  const match = normalizedRawText.match(
    new RegExp(`(?:${labelPattern})[^A-Z0-9]{0,20}([A-Z0-9 .-]{3,120}?)(?=\\s+(?:${stopPattern})\\b|$)`, "i")
  );

  return cleanLabeledValue(match?.[1]);
}

function extractPassportRegexValue(
  rawText: string | undefined,
  patterns: RegExp[],
): string | undefined {
  if (!rawText) return undefined;

  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    const value = cleanLabeledValue(match?.[1]);
    if (value) return value;
  }

  return undefined;
}

function extractKartaPobytuType(rawText: string | undefined): string | undefined {
  if (!rawText) return undefined;

  const lines = rawText.split(/\r?\n/);
  const labelPatterns = ["RODZAJ ZEZWOLENIA", "TYPE OF PERMIT"];
  const permitKinds = [
    /\b(CZASOWY)\b/i,
    /\b(STA[ŁL]Y)\b/i,
    /\b(REZYDENT[A-Z ]*UE)\b/i,
    /\b(REZYDENT[A-Z ]*DLUGOTERMINOWEGO)\b/i,
    /\b(TEMPORARY)\b/i,
    /\b(PERMANENT)\b/i,
    /\b(LONG[- ]TERM RESIDENT)\b/i,
    /\b(EU RESIDENT)\b/i,
  ];

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeSearchText(lines[index]);
    if (!labelPatterns.some((label) => normalizedLine.includes(label))) continue;

    const sameLineRemainder = normalizeSearchText(
      normalizedLine.replace(/.*?(RODZAJ ZEZWOLENIA|TYPE OF PERMIT)\b[\s:./-]*/i, " ")
    );

    const candidateBlock = [
      sameLineRemainder,
      ...lines.slice(index + 1, index + 4).map(normalizeSearchText),
    ].join(" ");

    for (const pattern of permitKinds) {
      const match = candidateBlock.match(pattern);
      if (match?.[1]) {
        const permitKind = match[1].replace(/\s+/g, " ").trim().toUpperCase();

        if (permitKind.includes("CZASOWY") || permitKind.includes("TEMPORARY")) {
          return "Permiso de residencia temporal";
        }

        if (permitKind.includes("STA") || permitKind.includes("PERMANENT")) {
          return "Permiso de residencia permanente";
        }

        if (permitKind.includes("REZYDENT") || permitKind.includes("RESIDENT")) {
          return "Residencia de larga duracion";
        }

        return "Permiso de residencia";
      }
    }
  }

  return undefined;
}

function extractNameNearLabels(rawText: string | undefined): Pick<OcrExtractedData, "firstName" | "lastName"> {
  if (!rawText) return {};

  const firstName = extractBestPersonValueNearLabels(rawText, [
    "FIRST NAME",
    "GIVEN NAMES",
    "GIVEN NAME",
    "IMIONA",
    "IMIE",
    "NOMBRES",
    "NOMBRE",
  ]);
  const lastName = extractBestPersonValueNearLabels(rawText, [
    "SURNAME",
    "LAST NAME",
    "NAZWISKO",
    "APELLIDOS",
    "APELLIDO",
  ]);

  return {
    firstName,
    lastName,
  };
}

function extractDateNearLabels(rawText: string | undefined, labels: string[]): string | undefined {
  if (!rawText) return undefined;

  const lines = rawText.split(/\r?\n/);
  const normalizedLabels = labels.map(normalizeSearchText);

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = normalizeSearchText(lines[index]);
    if (!normalizedLabels.some((label) => normalizedLine.includes(label))) continue;

    for (let offset = 0; offset <= 2; offset += 1) {
      const candidateLine = lines[index + offset];
      const date = normalizeHumanDate(candidateLine);
      if (date) return date;

      if (!candidateLine) continue;

      const inlineDate =
        candidateLine.match(/\b\d{1,2}[./\s-]+\d{1,2}[./\s-]+\d{4,5}\b/)?.[0] ??
        candidateLine.match(/\b\d{1,2}\s+[A-Z]{3}(?:\/[A-Z]{3})?\s+\d{4}\b/i)?.[0] ??
        candidateLine.match(/\b\d{1,2}[A-Z]{3}(?:\/[A-Z]{3})?\d{4}\b/i)?.[0];

      const normalizedInlineDate = normalizeHumanDate(inlineDate);
      if (normalizedInlineDate) return normalizedInlineDate;
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
    firstName: normalizeExtractedPersonName(normalizeMrzPersonName(firstNamePart)),
    lastName: normalizeExtractedPersonName(normalizeMrzPersonName(lastNamePart)),
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
      personalNumber: normalizePersonalNumber(secondLine.slice(28, 42).replace(/</g, "")),
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

    const fixedPositionDocumentNumber =
      firstLine.length >= 14 ? firstLine.slice(5, 14).replace(/</g, "") : undefined;
    const documentNumber =
      normalizeDocumentNumberForType(fixedPositionDocumentNumber, "KARTA_POBYTU") ??
      normalizeDocumentNumberForType(firstLine.match(/([A-Z]{1,3}\d{6,10})/)?.[1], "KARTA_POBYTU");

    const dateMatch = secondLine.match(/^(\d{6})\d?([MF<])(\d{6})\d?([A-Z0-9]{3})/);
    const nameData = parseMrzName(thirdLine);
    const nationalityToken = dateMatch?.[4]?.replace(/0/g, "O");

    return {
      ...nameData,
      documentNumber,
      dateOfBirth: parseMrzDate(dateMatch?.[1], "birth"),
      sex: normalizeSex(dateMatch?.[2]),
      dateOfExpiry: parseMrzDate(dateMatch?.[3], "expiry"),
      nationality: normalizeCountryCode(nationalityToken),
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
    normalizedRawText.includes("RESIDENCE PERMIT") ||
    normalizedRawText.includes("RODZAJ ZEZWOLENIA") ||
    normalizedRawText.includes("TYPE OF PERMIT")
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
  const documentDisposition =
    inferredDocumentType === "KARTA_POBYTU" &&
    /(?:UWAGI|REMARKS|DATA WYDANIA|DATE OF ISSUE AND ISSUING AUTHORITY|NUMER EWIDENCYJNY PESEL)/i.test(rawText ?? "")
      ? "BACK"
      : "PRIMARY";
  const rawNameData = extractNameNearLabels(rawText);
  const kartaFrontNameMatch = rawText?.match(
    /\n\s*([A-Z][A-Z .-]{3,})\s*\n\s*([A-Z][A-Za-z .-]{3,})\s*\n\s*(?:PLEC|SEX|OBYWATELSTWO|NATIONALITY)/i,
  );
  const kartaFrontLastName = normalizeExtractedPersonName(kartaFrontNameMatch?.[1]?.replace(/[.]+/g, " "));
  const kartaFrontFirstName = normalizeExtractedPersonName(kartaFrontNameMatch?.[2]?.replace(/[.]+/g, " "));
  const passportFrontFirstName = cleanPassportNameValue(
    extractPassportLabeledNextLine(rawText, [/(?:NOMBRES|GIVEN NAMES?)/i]),
    "first"
  ) ?? cleanPassportNameValue(
    extractPassportRegexValue(rawText, [
      /(?:NOMBRES|GIVEN NAMES?)[^\S\r\n]*[:/.-]?[^\S\r\n]*([\p{L}< ]{3,})(?=\r?\n(?:NACIONALIDAD|NATIONALITY))/iu,
    ]),
    "first"
  );
  const passportFrontLastName = cleanPassportNameValue(
    extractPassportLabeledNextLine(rawText, [/(?:APELLIDOS|SURNAME)/i]),
    "last"
  ) ?? cleanPassportNameValue(
    extractPassportRegexValue(rawText, [
      /(?:APELLIDOS|SURNAME)[^\S\r\n]*[:/.-]?[^\S\r\n]*([\p{L}< ]{3,})(?=\r?\n(?:NOMBRES|GIVEN NAMES?))/iu,
    ]),
    "last"
  ) ?? cleanPassportNameValue(
    extractPassportRegexValue(rawText, [
      /\bPASSPORT[^\S\r\n]+([A-Z ]{3,})(?=\r?\n(?:NOMBRES|GIVEN NAMES?))/iu,
    ]),
    "last"
  );

  const personalNumber =
    normalizePersonalNumber(get("PersonalNumber")) ??
    extractRegexGroup(normalizedRawText, [
      /(?:PERSONAL\s*NO\.?|NUM\.?\s*PERSONAL|PERSONAL NUMBER\s*\(?PESEL\)?)[^A-Z0-9]{0,40}([A-Z]{0,3}\d{6,14})/i,
      /(?:NUMER PESEL)[^0-9]{0,40}([0-9]{11})/i,
      /\b([0-9]{11})\b/,
    ], normalizePersonalNumber) ??
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

  const rawPassportAuthority = get("IssuingAuthority");

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
  const verifiedPersonalNumber = normalizePeselAgainstBirthDate(personalNumber, dateOfBirth);

  const passportAuthority =
    cleanIssuingAuthorityValue(rawPassportAuthority) ??
    cleanIssuingAuthorityValue(
      normalizeWhitespace(
        extractPassportLabeledNextLine(rawText, [/(?:AUT\w*DAD|AUTHORITY)/i])?.replace(
          /^\s*\d{1,2}\s+[A-Z]{3}(?:\/[A-Z]{3})?\s+\d{4}\s*/i,
          ""
        )
      )
    ) ??
    cleanIssuingAuthorityValue(
      extractPassportFieldValue(rawText, ["AUTORIDAD", "AUTHORITY"], ["FIRMA DEL TITULAR", "HOLDER'S SIGNATURE", "HOLDERS SIGNATURE"])
    ) ??
    cleanIssuingAuthorityValue(
      extractRegexGroup(normalizedRawText, [
        /(?:AUTORIDAD|AUTHORITY)[^A-Z0-9]{0,20}([A-Z0-9 .-]{3,80})/i,
      ])
    ) ??
    cleanIssuingAuthorityValue(
      extractPassportRegexValue(rawText, [
        /(?:AUTORIDAD|AUTHORITY)[^\S\r\n]*[:/.-]?[^\S\r\n]*([\p{L}. ]{3,})(?=\r?\n(?:FIRMA DEL TITULAR|HOLDER'?S SIGNATURE))/iu,
      ])
    );

  const kartaPobytuType =
    inferredDocumentType === "KARTA_POBYTU"
      ? extractKartaPobytuType(rawText) ??
        normalizeWhitespace(get("Category"))
      : undefined;

  const remarks =
    inferredDocumentType === "KARTA_POBYTU"
      ? cleanKartaRemarksValue(extractLineValueNearLabels(rawText, ["UWAGI", "REMARKS"], 1))
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
    cleanPlaceOfBirthValue(normalizeWhitespace(get("PlaceOfBirth"))) ??
    cleanPassportPlaceOfBirthValue(
      extractPassportLabeledNextLine(rawText, [/(?:LUGAR DE NACIMI\w*|PLACE OF BIRTH)/i])
    ) ??
    cleanPassportPlaceOfBirthValue(
      extractPassportRegexValue(rawText, [
        /(?:LUGAR DE NACIMI\w*|PLACE OF BIRTH)[^\S\r\n]*[:/.-]?[^\S\r\n]*([\p{L} ]{4,})(?=\r?\n(?:FECHA DE EXPEDICION|DATE OF ISSUE|AUTORIDAD|AUTHORITY))/iu,
      ])
    ) ??
    cleanPlaceOfBirthValue(
      extractPassportFieldValue(
        rawText,
        ["LUGAR DE NACIMIENTO", "PLACE OF BIRTH", "PLACE AND COUNTRY OF BIRTH"],
        ["FECHA DE EXPEDICION", "DATE OF ISSUE", "AUTORIDAD", "AUTHORITY", "FIRMA DEL TITULAR", "HOLDER'S SIGNATURE"]
      )
    ) ??
    cleanPlaceOfBirthValue(
      extractLineValueNearLabels(rawText, [
        "PLACE AND COUNTRY OF BIRTH",
        "PLACE OF BIRTH",
        "LUGAR DE NACIMIENTO",
        "MIEJSCE I KRAJ URODZENIA",
      ])
    ) ??
    cleanPlaceOfBirthValue(
      extractRegexGroup(normalizedRawText, [
        /\b([A-Z]{4,}(?:\s+[A-Z]{3,}){0,3})\s+COL\b(?=[\s\S]{0,120}(?:FECHA DE EXPEDICION|DATE OF ISSUE))/i,
      ])
    ) ??
    undefined;

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
    (inferredDocumentType === "PASSPORT" ? mrzData.documentTypeCode : undefined) ??
    cleanLabeledValue(
      extractRegexGroup(normalizedRawText, [
        /(?:TIPO|TYPE)[^A-Z0-9]{0,20}([A-Z])/i,
      ])
    );

  const peselFirstName =
    inferredDocumentType === "PESEL"
      ? normalizeExtractedPersonName(
          extractLineValueNearLabels(rawText, ["IMIE (IMIONA)", "IMIĘ (IMIONA)", "IMIE", "IMIG"], 0)
        )
      : undefined;

  const peselLastName =
    inferredDocumentType === "PESEL"
      ? normalizeExtractedPersonName(extractLineValueNearLabels(rawText, ["NAZWISKO"], 0))
      : undefined;

  const firstName =
    peselFirstName ??
    (inferredDocumentType === "PASSPORT"
      ? trimPassportFirstNameNoise(
          pickBestPassportName(
            passportFrontFirstName,
            get("FirstName"),
            rawNameData.firstName,
            mrzData.firstName,
          ),
        )
      : inferredDocumentType === "KARTA_POBYTU" && documentDisposition !== "BACK"
        ? pickBestPersonName(kartaFrontFirstName, get("FirstName"), mrzData.firstName, rawNameData.firstName)
        : inferredDocumentType === "KARTA_POBYTU"
          ? pickBestPersonName(get("FirstName"), rawNameData.firstName)
          : pickBestPersonName(get("FirstName"), mrzData.firstName, rawNameData.firstName));

  const selectedLastName =
    peselLastName ??
    (inferredDocumentType === "PASSPORT"
      ? trimPassportLastNameNoise(
          pickBestPassportName(
            passportFrontLastName,
            get("LastName"),
            rawNameData.lastName,
            mrzData.lastName,
          ),
          mrzData.firstName,
          passportFrontFirstName,
          get("FirstName"),
          rawNameData.firstName,
          firstName,
        )
      : inferredDocumentType === "KARTA_POBYTU" && documentDisposition !== "BACK"
        ? pickBestPersonName(kartaFrontLastName, get("LastName"), mrzData.lastName, rawNameData.lastName)
        : inferredDocumentType === "KARTA_POBYTU"
          ? pickBestPersonName(get("LastName"), rawNameData.lastName)
          : pickBestPersonName(get("LastName"), mrzData.lastName, rawNameData.lastName));
  const lastName =
    inferredDocumentType === "PASSPORT"
      ? restorePassportLastNameSpacing(selectedLastName, mrzData.lastName)
      : selectedLastName;

  return {
    firstName,
    lastName,
    documentNumber,
    personalNumber: verifiedPersonalNumber,
    dateOfBirth,
    dateOfExpiry,
    dateOfIssue,
    sex:
      normalizeSex(get("Sex")) ??
      mrzData.sex ??
      normalizeSex(
        extractRegexGroup(normalizedRawText, [
          /(?:SEXO|SEX)[\s\S]{0,40}\b([MF])\b/i,
        ])
      ),
    nationality,
    issuingCountry,
    placeOfBirth,
    documentType: inferredDocumentType,
    documentDisposition,
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

export function parseIdentityDocumentText(rawText: string): OcrExtractedData {
  return mapAzureIdDocumentFields({}, rawText);
}

async function renderPdfFirstPageToImageBuffer(fileBuffer: Buffer): Promise<Buffer | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createCanvas } = require("canvas") as typeof import("canvas");

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(fileBuffer),
      disableWorker: true,
      useWorkerFetch: false,
    } as never);
    const pdf = await loadingTask.promise;

    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      await page.render({
        canvasContext: context as never,
        canvas: canvas as never,
        viewport,
      } as never).promise;
      return canvas.toBuffer("image/png");
    } finally {
      await pdf.destroy();
    }
  } catch (error) {
    console.error("[OCR] PDF render failed for local OCR:", error);
    return null;
  }
}

function scoreRecognizedIdentityText(text: string | null | undefined): number {
  if (!text) return 0;

  const normalized = normalizeSearchText(text);
  let score = Math.min(20, Math.floor(normalized.length / 80));
  const signals = [
    "PASSPORT",
    "PASAPORTE",
    "KARTA POBYTU",
    "RESIDENCE PERMIT",
    "DOCUMENT NUMBER",
    "PASSPORT NO",
    "DATE OF BIRTH",
    "DATE OF EXPIRY",
    "NATIONALITY",
    "NUMER PESEL",
    "DATA URODZENIA",
    "DATA WAZNOSCI",
  ];

  for (const signal of signals) {
    if (normalized.includes(signal)) score += 5;
  }

  if (/P<[A-Z0-9<]{20,}/.test(normalized.replace(/\s+/g, ""))) score += 30;
  if (/I[A-Z<]?POL[A-Z0-9<]{15,}/.test(normalized.replace(/\s+/g, ""))) score += 30;
  return score;
}
async function recognizeLocalText(fileBuffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const inputBuffer =
      mimeType === "application/pdf"
        ? (await renderPdfFirstPageToImageBuffer(fileBuffer)) ?? fileBuffer
        : await shrinkImageForAzure(fileBuffer, mimeType);

    const { createWorker, PSM } = await import("tesseract.js");
    const workerOptions: Record<string, string> = {
      cachePath: process.env.TESSERACT_CACHE_PATH?.trim() || "/tmp/tesseract-cache",
    };

    const langPath = process.env.TESSERACT_LANG_PATH?.trim();
    if (langPath) workerOptions.langPath = langPath;

    const worker = await createWorker("eng", 1, workerOptions);

    try {
      const candidates: string[] = [];
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
      });
      const automaticResult = await worker.recognize(inputBuffer);
      const automaticText = automaticResult?.data?.text?.trim();
      if (automaticText) candidates.push(automaticText);

      if (scoreRecognizedIdentityText(automaticText) < 25) {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          preserve_interword_spaces: "1",
        });
        const sparseResult = await worker.recognize(inputBuffer);
        const sparseText = sparseResult?.data?.text?.trim();
        if (sparseText) candidates.push(sparseText);
      }

      return candidates.sort(
        (left, right) => scoreRecognizedIdentityText(right) - scoreRecognizedIdentityText(left),
      )[0] ?? null;
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error("[OCR] Local OCR error:", error);
    return null;
  }
}

export async function analyzeLocalDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OcrExtractedData | null> {
  const rawText = await recognizeLocalText(fileBuffer, mimeType);
  if (!rawText) return null;

  return mapAzureIdDocumentFields({}, rawText);
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
