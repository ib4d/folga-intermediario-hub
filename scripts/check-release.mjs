import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

try {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = Number(process.env.MONITORING_TIMEOUT_MS || "15000");
  const expectedRelease = resolveExpectedRelease();
  const health = await fetchJson(new URL("/api/health", baseUrl), {
    expectedStatus: 200,
    timeoutMs,
  });

  const runtimeRelease = String(health.release || "").trim();
  const mismatches = [];

  if (health.status !== "ok") {
    mismatches.push(`Health status is ${health.status} instead of ok.`);
  }

  if (health.db !== "connected") {
    mismatches.push(`Database status is ${health.db} instead of connected.`);
  }

  if (!runtimeRelease) {
    mismatches.push("Runtime release is empty.");
  } else if (!expectedRelease) {
    mismatches.push("Expected release could not be resolved from EXPECTED_RELEASE, APP_RELEASE, or git HEAD.");
  } else if (runtimeRelease !== expectedRelease) {
    mismatches.push(`Runtime release ${runtimeRelease} does not match expected release ${expectedRelease}.`);
  }

  console.log("Release check summary");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Expected release: ${expectedRelease || "unknown"}`);
  console.log(`Runtime release: ${runtimeRelease || "unknown"}`);
  console.log(`Health status: ${health.status}`);
  console.log(`Database: ${health.db}`);
  console.log(`Cron configured: ${String(Boolean(health.cronConfigured))}`);
  console.log(`SMTP configured: ${String(Boolean(health.smtpConfigured))}`);

  if (mismatches.length > 0) {
    console.error("\nRelease mismatches:");
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exit(1);
  }

  console.log("\nRelease check passed.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown release check error.";
  console.error(`Release check failed: ${message}`);
  process.exit(1);
}

function resolveExpectedRelease() {
  const explicit = process.env.EXPECTED_RELEASE?.trim();
  if (explicit) return explicit;

  const envRelease = process.env.APP_RELEASE?.trim();
  if (envRelease) return envRelease;

  const releaseFile = tryReadReleaseFile();
  if (releaseFile) return releaseFile;

  return tryReadGitHead();
}

function readGitHead() {
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function tryReadGitHead() {
  try {
    return readGitHead();
  } catch {
    return "";
  }
}

function tryReadReleaseFile() {
  try {
    return readFileSync(join(process.cwd(), ".release"), "utf8").trim();
  } catch {
    return "";
  }
}

function resolveBaseUrl() {
  const explicit = process.env.MONITORING_BASE_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) return stripTrailingSlash(authUrl);

  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) return stripTrailingSlash(nextAuthUrl);

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
