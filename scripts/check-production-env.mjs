import { existsSync, readFileSync } from "node:fs";

const providerManifest = JSON.parse(
  readFileSync(new URL("../src/lib/providers/provider-manifest.json", import.meta.url), "utf8")
);

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = normalized.indexOf("=");
    if (separator <= 0) continue;

    const key = normalized.slice(0, separator).trim();
    const value = unquote(normalized.slice(separator + 1));
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.production");
loadEnvFile(".env");

const storageProvider = (process.env.STORAGE_PROVIDER || "supabase").trim();
const errors = [];
const warnings = [];

const required = [
  "DB_PASSWORD",
  "AUTH_URL",
  "AUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "CRON_SECRET",
];

if (storageProvider === "supabase") {
  required.push(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STORAGE_BUCKET",
  );
} else if (storageProvider === "local") {
  warnings.push("STORAGE_PROVIDER=local is active. Documents will persist on the VPS local volume instead of Supabase Storage.");
}

const placeholderPatterns = [
  /^change-this/i,
  /^replace-/i,
  /^your-/i,
  /^use-a-/i,
  /example/i,
];

const ocrProvider = (process.env.OCR_PROVIDER || "tesseract").trim();
if (ocrProvider === "azure") {
  required.push("AZURE_DI_ENDPOINT", "AZURE_DI_KEY");
} else if (ocrProvider === "tesseract") {
  warnings.push("OCR_PROVIDER=tesseract is active. Documents will use local OCR on the VPS and no Azure credentials are required.");
} else if (ocrProvider === "manual") {
  warnings.push("OCR_PROVIDER=manual is active. Documents will upload, but OCR extraction will require manual review.");
}

for (const key of required) {
  const value = process.env[key]?.trim();

  if (!value) {
    errors.push(`${key} is required.`);
    continue;
  }

  if (placeholderPatterns.some((pattern) => pattern.test(value))) {
    errors.push(`${key} still looks like a placeholder.`);
  }
}

const authUrl = process.env.AUTH_URL?.trim();
if (authUrl && !authUrl.startsWith("https://") && !authUrl.includes("localhost")) {
  errors.push("AUTH_URL must use https:// outside localhost.");
}

const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
if (nextAuthUrl && !nextAuthUrl.startsWith("https://") && !nextAuthUrl.includes("localhost")) {
  errors.push("NEXTAUTH_URL must use https:// outside localhost.");
}

if (nextAuthUrl && authUrl && nextAuthUrl !== authUrl) {
  warnings.push("NEXTAUTH_URL differs from AUTH_URL. Keep them aligned unless this is intentional.");
}

if (storageProvider === "supabase" && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
  warnings.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is set without NEXT_PUBLIC_SUPABASE_ANON_KEY. Verify the client upload flow uses the intended public credential.");
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (serviceRoleKey && placeholderPatterns.some((pattern) => pattern.test(serviceRoleKey))) {
  errors.push("SUPABASE_SERVICE_ROLE_KEY still looks like a placeholder.");
}

if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  errors.push("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser.");
}

const authSecret = process.env.AUTH_SECRET?.trim();
if (authSecret && authSecret.length < 32) {
  errors.push("AUTH_SECRET must be at least 32 characters.");
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim();
if (nextAuthSecret && nextAuthSecret.length < 32) {
  errors.push("NEXTAUTH_SECRET must be at least 32 characters.");
}

if (authSecret && nextAuthSecret && authSecret !== nextAuthSecret) {
  warnings.push("NEXTAUTH_SECRET differs from AUTH_SECRET. Keep them aligned unless this is intentional.");
}

const cronSecret = process.env.CRON_SECRET?.trim();
if (cronSecret && cronSecret.length < 32) {
  errors.push("CRON_SECRET must be at least 32 characters.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
if (storageProvider === "supabase" && supabaseUrl && !supabaseUrl.startsWith("https://")) {
  errors.push("NEXT_PUBLIC_SUPABASE_URL must use https://.");
}

const azureEndpoint = process.env.AZURE_DI_ENDPOINT?.trim();
if (azureEndpoint && !azureEndpoint.startsWith("https://")) {
  errors.push("AZURE_DI_ENDPOINT must use https://.");
}

const smtpPort = Number(process.env.SMTP_PORT || "587");
if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
  errors.push("SMTP_PORT must be a valid TCP port.");
}

if (process.env.SMTP_SECURE && !["true", "false"].includes(process.env.SMTP_SECURE)) {
  errors.push("SMTP_SECURE must be either true or false.");
}

if (process.env.SMTP_ALLOW_INSECURE && !["true", "false"].includes(process.env.SMTP_ALLOW_INSECURE)) {
  errors.push("SMTP_ALLOW_INSECURE must be either true or false.");
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED === "true") {
  warnings.push("ALLOW_DEMO_SEED=true is enabled in production. Disable it after the first bootstrap.");
}

const stripeKeys = [
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
].filter((key) => Boolean(process.env[key]?.trim()));

if (stripeKeys.length > 0 && stripeKeys.length < 3) {
  warnings.push("Stripe is partially configured. Set publishable key, secret key, and webhook secret before enabling billing.");
}

const providerAllowlist = {
  STORAGE_PROVIDER: Object.keys(providerManifest.storage),
  OCR_PROVIDER: Object.keys(providerManifest.ocr),
  EMAIL_PROVIDER: ["smtp"],
  JOB_PROVIDER: ["inline"],
};

for (const [key, allowed] of Object.entries(providerAllowlist)) {
  const value = process.env[key]?.trim();
  if (value && !allowed.includes(value)) {
    errors.push(`${key}=${value} is not supported in this release. Allowed: ${allowed.join(", ")}.`);
  }
}

if (warnings.length > 0) {
  console.warn("Production environment warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("Production environment check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production environment check passed.");
