import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = Number(process.env.MONITORING_TIMEOUT_MS || "15000");
  const warnings = [];

  const health = await fetchJson(new URL("/api/health", baseUrl), {
    expectedStatus: 200,
    timeoutMs,
  });
  const providerAccess = await fetchJson(new URL("/api/providers/status", baseUrl), {
    expectedStatus: 403,
    timeoutMs,
  });
  const runtime = readRuntimeSignals();

  if (health.status !== "ok") {
    throw new Error(`Health endpoint reported non-ok status: ${health.status}`);
  }

  await verifyDatabaseConnection();

  if (!providerAccess?.error) {
    throw new Error("Provider status endpoint did not return its expected access-denied response.");
  }

  if (!runtime.cronConfigured) {
    warnings.push("CRON_SECRET is not wired into the live runtime.");
  }

  if (!runtime.smtpConfigured) {
    warnings.push("SMTP is not fully configured in the live runtime.");
  }

  if (!runtime.externalMonitoringConfigured) {
    warnings.push("External uptime monitoring is not marked as active in the live runtime.");
  }

  enforceStrictSignals(runtime, warnings);

  console.log("Monitoring check passed.");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Release: ${process.env.APP_RELEASE || "private"}`);
  console.log(`Version: ${runtime.version || "private"}`);
  console.log("Database: connected (internal query)");
  console.log(`Storage provider configured: ${runtime.storageProvider}`);
  console.log(`OCR provider configured: ${runtime.ocrProvider}`);
  console.log(`Email provider: ${runtime.emailProvider}`);
  console.log(`Jobs provider: ${runtime.jobProvider}`);
  console.log(`Cron configured: ${runtime.cronConfigured}`);
  console.log(`SMTP configured: ${runtime.smtpConfigured}`);
  console.log(`External monitoring configured: ${runtime.externalMonitoringConfigured}`);
  console.log("Provider endpoint: protected (HTTP 403 without platform-admin session)");

  if (warnings.length > 0) {
    console.warn("\nMonitoring warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown monitoring error.";
  console.error(`Monitoring check failed: ${message}`);
  console.error(
    "Tip: start the app first or set MONITORING_BASE_URL to a reachable deployment URL.",
  );
  process.exit(1);
}

function resolveBaseUrl() {
  const explicit = process.env.MONITORING_BASE_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) {
    return stripTrailingSlash(authUrl);
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    return stripTrailingSlash(nextAuthUrl);
  }

  return "http://127.0.0.1:3000";
}

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readRuntimeSignals() {
  const emailProvider = process.env.EMAIL_PROVIDER?.trim() || "smtp";
  const storageProvider = (process.env.STORAGE_PROVIDER || "supabase").trim();
  const ocrProvider = (process.env.OCR_PROVIDER || "tesseract").trim().toLowerCase();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripeSecretMode = getStripeSecretMode(stripeSecretKey);
  const stripePublishableMode = getStripePublishableMode(stripePublishableKey);
  const stripeExpectedMode = process.env.STRIPE_EXPECTED_MODE?.trim().toLowerCase();
  const stripeModeIsExplicitAndConsistent =
    (stripeExpectedMode === "test" || stripeExpectedMode === "live") &&
    stripeExpectedMode === stripeSecretMode &&
    stripeSecretMode === stripePublishableMode;
  const paymentLinks = [
    process.env.STRIPE_PAYMENT_LINK_STARTER,
    process.env.STRIPE_PAYMENT_LINK_PRO,
    process.env.STRIPE_PAYMENT_LINK_BUSINESS,
    process.env.STRIPE_PAYMENT_LINK_ENTERPRISE,
  ];

  return {
    version: readPackageVersion(),
    storageProvider,
    ocrProvider,
    emailProvider,
    jobProvider: process.env.JOB_PROVIDER?.trim() || "inline",
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    smtpConfigured: Boolean(
      process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_USER?.trim() &&
        process.env.SMTP_PASS?.trim() &&
        process.env.SMTP_FROM?.trim()
    ),
    externalMonitoringConfigured: parseBooleanEnv(process.env.EXTERNAL_MONITORING_ACTIVE),
    stripeConfigured: Boolean(
      stripeModeIsExplicitAndConsistent &&
        stripeWebhookSecret?.startsWith("whsec_")
    ),
    stripePortalConfigured: Boolean(
      stripeModeIsExplicitAndConsistent &&
        process.env.STRIPE_CUSTOMER_PORTAL_ENABLED?.trim().toLowerCase() === "true"
    ),
    stripePaymentLinksConfigured: paymentLinks.every(isHttpsUrl),
  };
}

function getStripeSecretMode(value) {
  if (/^(?:sk|rk)_test_/.test(value ?? "")) return "test";
  if (/^(?:sk|rk)_live_/.test(value ?? "")) return "live";
  return null;
}

function getStripePublishableMode(value) {
  if (/^pk_test_/.test(value ?? "")) return "test";
  if (/^pk_live_/.test(value ?? "")) return "live";
  return null;
}

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    return typeof packageJson.version === "string" ? packageJson.version : "0.0.0";
  } catch {
    return "private";
  }
}

function parseBooleanEnv(value) {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase());
}

function isHttpsUrl(value) {
  if (!value?.trim()) return false;
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

async function verifyDatabaseConnection() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } finally {
    await prisma.$disconnect();
  }
}

function enforceStrictSignals(runtime, warnings) {
  const strictSignals = new Set(
    (process.env.MONITORING_STRICT_SIGNALS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  const strictRuntime = process.env.MONITORING_STRICT_RUNTIME === "true";
  if (strictRuntime) {
    strictSignals.add("cron");
    strictSignals.add("smtp");
    strictSignals.add("external-monitoring");
  }

  const signalFailures = [];

  if (strictSignals.has("cron")) {
    if (!runtime.cronConfigured) {
      signalFailures.push("CRON_SECRET is not wired into the live runtime.");
    }
  }

  if (strictSignals.has("smtp")) {
    if (!runtime.smtpConfigured) {
      signalFailures.push("SMTP is not fully configured in the live runtime.");
    }
  }

  if (strictSignals.has("external-monitoring")) {
    if (!runtime.externalMonitoringConfigured) {
      signalFailures.push("External uptime monitoring is not marked as active in the live runtime.");
    }
  }

  if (strictSignals.has("stripe-core")) {
    if (!runtime.stripeConfigured) {
      signalFailures.push("Stripe core configuration is not active in the live runtime.");
    }
  }

  if (strictSignals.has("stripe-portal")) {
    if (!runtime.stripePortalConfigured) {
      signalFailures.push("Stripe customer portal is not active in the live runtime.");
    }
  }

  if (strictSignals.has("stripe-payment-links")) {
    if (!runtime.stripePaymentLinksConfigured) {
      signalFailures.push("Stripe payment links are not active in the live runtime.");
    }
  }

  if (signalFailures.length > 0) {
    throw new Error(signalFailures.join(" "));
  }

  if (strictSignals.size > 0 && warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`Strict mode kept warning: ${warning}`);
    }
  }
}

async function fetchJson(url, { expectedStatus, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status !== expectedStatus) {
      throw new Error(`${url.pathname} returned ${response.status} instead of ${expectedStatus}.`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${url.pathname} timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
