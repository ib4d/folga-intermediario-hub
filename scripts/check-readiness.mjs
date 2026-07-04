import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function runStep(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  const isWindows = process.platform === "win32";
  const shellCommand = [command, ...args].map((value) => quoteArg(value, isWindows)).join(" ");
  const result = spawnSync(
    isWindows ? process.env.ComSpec || "cmd.exe" : "/bin/sh",
    isWindows ? ["/d", "/s", "/c", shellCommand] : ["-lc", shellCommand],
    {
      stdio: "inherit",
      env: process.env,
      ...options,
    },
  );

  if (result.status !== 0) {
    process.exit(typeof result.status === "number" ? result.status : 1);
  }
}

function quoteArg(value, isWindows) {
  if (!value) return '""';
  if (isWindows) {
    if (/[\s"&|<>^]/.test(value)) {
      return `"${value.replaceAll('"', '\\"')}"`;
    }
    return value;
  }

  if (/[\s'"'"'\\$`!]/.test(value)) {
    return `'${value.replaceAll("'", `'"'"'"'"'"'"'"'"'`)}'`;
  }
  return value;
}

function runNpmStep(label, args) {
  runStep(label, "npm", args);
}

function runPrismaValidate() {
  const localPrisma = resolve(
    process.cwd(),
    process.platform === "win32" ? "node_modules/.bin/prisma.cmd" : "node_modules/.bin/prisma",
  );

  if (!existsSync(localPrisma)) {
    throw new Error("Prisma binary is not available locally. Run npm install first.");
  }

  runStep("Prisma validate", localPrisma, ["validate"]);
}

function shouldRunBuild() {
  return process.env.CHECK_READINESS_SKIP_BUILD !== "true";
}

function shouldRunLint() {
  return process.env.CHECK_READINESS_SKIP_LINT !== "true";
}

function shouldRunTypes() {
  return process.env.CHECK_READINESS_SKIP_TYPES !== "true";
}

function shouldRunOcr() {
  return process.env.CHECK_READINESS_SKIP_OCR !== "true";
}

function shouldRunPermissions() {
  return process.env.CHECK_READINESS_SKIP_PERMISSIONS !== "true";
}

try {
  runNpmStep("Production environment check", ["run", "check:prod-env"]);

  if (shouldRunLint()) {
    runNpmStep("Lint", ["run", "lint"]);
  } else {
    console.warn("CHECK_READINESS_SKIP_LINT=true. Skipping lint.");
  }

  if (shouldRunTypes()) {
    runStep("TypeScript", "npx", ["tsc", "--noEmit", "--incremental", "false"]);
  } else {
    console.warn("CHECK_READINESS_SKIP_TYPES=true. Skipping TypeScript check.");
  }

  runPrismaValidate();

  if (shouldRunOcr()) {
    runNpmStep("OCR regressions", ["run", "check:ocr"]);
  } else {
    console.warn("CHECK_READINESS_SKIP_OCR=true. Skipping OCR regressions.");
  }

  if (shouldRunPermissions()) {
    runNpmStep("Permission policy source check", ["run", "check:permissions"]);
  } else {
    console.warn("CHECK_READINESS_SKIP_PERMISSIONS=true. Skipping permission check.");
  }

  if (shouldRunBuild()) {
    runNpmStep("Production build", ["run", "build"]);
  } else {
    console.warn("CHECK_READINESS_SKIP_BUILD=true. Skipping production build.");
  }

  console.log("\nReadiness check passed.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown readiness check error.";
  console.error(`Readiness check failed: ${message}`);
  process.exit(1);
}
