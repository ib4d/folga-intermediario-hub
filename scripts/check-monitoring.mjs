try {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = Number(process.env.MONITORING_TIMEOUT_MS || "15000");
  const warnings = [];

  const health = await fetchJson(new URL("/api/health", baseUrl), {
    expectedStatus: 200,
    timeoutMs,
  });
  const providers = await fetchJson(new URL("/api/providers/status", baseUrl), {
    expectedStatus: 200,
    timeoutMs,
  });

  if (health.status !== "ok") {
    throw new Error(`Health endpoint reported non-ok status: ${health.status}`);
  }

  await verifyDatabaseConnection();

  if (health.cronConfigured === false) {
    warnings.push("CRON_SECRET is not wired into the live runtime.");
  }

  if (health.smtpConfigured === false) {
    warnings.push("SMTP is not fully configured in the live runtime.");
  }

  if (health.externalMonitoringConfigured === false) {
    warnings.push("External uptime monitoring is not marked as active in the live runtime.");
  }

  enforceStrictSignals(health, warnings);

  if (!providers?.current?.storage?.statusLabel) {
    throw new Error("Provider status payload is missing current storage information.");
  }

  if (!providers?.current?.ocr?.statusLabel) {
    throw new Error("Provider status payload is missing current OCR information.");
  }

  console.log("Monitoring check passed.");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Release: ${health.release || process.env.APP_RELEASE || "private"}`);
  console.log(`Version: ${health.version || "private"}`);
  console.log("Database: connected (internal query)");
  console.log(`Storage: ${providers.current.storage.statusLabel}`);
  console.log(`OCR: ${providers.current.ocr.statusLabel}`);
  console.log(`Email: ${health.email || "private"}`);
  console.log(`Jobs: ${health.jobs || "private"}`);
  console.log(`Cron configured: ${formatPrivateSignal(health.cronConfigured)}`);
  console.log(`SMTP configured: ${formatPrivateSignal(health.smtpConfigured)}`);
  console.log(`External monitoring configured: ${formatPrivateSignal(health.externalMonitoringConfigured)}`);

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

function formatPrivateSignal(value) {
  return typeof value === "boolean" ? String(value) : "private";
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

function enforceStrictSignals(health, warnings) {
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
    if (typeof health.cronConfigured !== "boolean") {
      signalFailures.push("Cron configuration is private on this health endpoint.");
    } else if (!health.cronConfigured) {
      signalFailures.push("CRON_SECRET is not wired into the live runtime.");
    }
  }

  if (strictSignals.has("smtp")) {
    if (typeof health.smtpConfigured !== "boolean") {
      signalFailures.push("SMTP configuration is private on this health endpoint.");
    } else if (!health.smtpConfigured) {
      signalFailures.push("SMTP is not fully configured in the live runtime.");
    }
  }

  if (strictSignals.has("external-monitoring")) {
    if (typeof health.externalMonitoringConfigured !== "boolean") {
      signalFailures.push("External monitoring configuration is private on this health endpoint.");
    } else if (!health.externalMonitoringConfigured) {
      signalFailures.push("External uptime monitoring is not marked as active in the live runtime.");
    }
  }

  if (strictSignals.has("stripe-core")) {
    if (typeof health.stripeConfigured !== "boolean") {
      signalFailures.push("Stripe configuration is private on this health endpoint.");
    } else if (!health.stripeConfigured) {
      signalFailures.push("Stripe core configuration is not active in the live runtime.");
    }
  }

  if (strictSignals.has("stripe-portal")) {
    if (typeof health.stripePortalConfigured !== "boolean") {
      signalFailures.push("Stripe portal configuration is private on this health endpoint.");
    } else if (!health.stripePortalConfigured) {
      signalFailures.push("Stripe customer portal is not active in the live runtime.");
    }
  }

  if (strictSignals.has("stripe-payment-links")) {
    if (typeof health.stripePaymentLinksConfigured !== "boolean") {
      signalFailures.push("Stripe payment-link configuration is private on this health endpoint.");
    } else if (!health.stripePaymentLinksConfigured) {
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
