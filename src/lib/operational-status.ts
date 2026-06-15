import { readFileSync } from "node:fs";
import { join } from "node:path";

type RuntimeMetadata = {
  version: string;
  release: string;
  cronConfigured: boolean;
  emailProvider: string;
  smtpConfigured: boolean;
  jobProvider: string;
  externalMonitoringConfigured: boolean;
};

let cachedVersion: string | null = null;

function readPackageVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  const packageJsonPath = join(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: string };
  cachedVersion = packageJson.version || "0.0.0";
  return cachedVersion;
}

export function getRuntimeMetadata(): RuntimeMetadata {
  const emailProvider = process.env.EMAIL_PROVIDER?.trim() || "smtp";
  const jobProvider = process.env.JOB_PROVIDER?.trim() || "inline";
  const release =
    readReleaseMarker() ||
    process.env.APP_RELEASE?.trim() ||
    process.env.SOURCE_COMMIT?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "local";

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.SMTP_FROM?.trim()
  );

  return {
    version: readPackageVersion(),
    release,
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    emailProvider,
    smtpConfigured,
    jobProvider,
    externalMonitoringConfigured: parseBooleanEnv(process.env.EXTERNAL_MONITORING_ACTIVE),
  };
}

function parseBooleanEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function readReleaseMarker() {
  try {
    return readFileSync(join(process.cwd(), ".release"), "utf8").trim();
  } catch {
    return "";
  }
}
