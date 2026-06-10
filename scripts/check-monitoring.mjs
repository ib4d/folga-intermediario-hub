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

  if (health.db !== "connected") {
    throw new Error(`Database status is not connected: ${health.db}`);
  }

  if (!health.cronConfigured) {
    warnings.push("CRON_SECRET is not wired into the live runtime.");
  }

  if (!health.smtpConfigured) {
    warnings.push("SMTP is not fully configured in the live runtime.");
  }

  if (!providers?.current?.storage?.statusLabel) {
    throw new Error("Provider status payload is missing current storage information.");
  }

  if (!providers?.current?.ocr?.statusLabel) {
    throw new Error("Provider status payload is missing current OCR information.");
  }

  console.log("Monitoring check passed.");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Release: ${health.release || "unknown"}`);
  console.log(`Version: ${health.version || "unknown"}`);
  console.log(`Database: ${health.db}`);
  console.log(`Storage: ${providers.current.storage.statusLabel}`);
  console.log(`OCR: ${providers.current.ocr.statusLabel}`);
  console.log(`Email: ${health.email}`);
  console.log(`Jobs: ${health.jobs}`);
  console.log(`Cron configured: ${String(Boolean(health.cronConfigured))}`);
  console.log(`SMTP configured: ${String(Boolean(health.smtpConfigured))}`);

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
