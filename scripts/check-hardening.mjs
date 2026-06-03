import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

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
    const code = typeof result.status === "number" ? result.status : 1;
    process.exit(code);
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

function runNpmStep(label, args, options = {}) {
  runStep(label, "npm", args, options);
}

runNpmStep("Production environment check", ["run", "check:prod-env"]);
runNpmStep("Permission policy source check", ["run", "check:permissions"]);
runPrismaValidate();

const smtpRecipient = process.env.SMTP_TEST_RECIPIENT?.trim();
if (smtpRecipient) {
  runNpmStep("SMTP test", ["run", "check:smtp", "--", smtpRecipient]);
} else {
  console.warn("\nSMTP_TEST_RECIPIENT is not set. Skipping SMTP test.");
}

if (process.env.CHECK_HARDENING_SKIP_SMOKE === "true") {
  console.warn("CHECK_HARDENING_SKIP_SMOKE=true. Skipping production smoke check.");
} else {
  runNpmStep("Production smoke check", ["run", "check:smoke"]);
}

if (process.env.CHECK_HARDENING_RUN_BACKUP === "true") {
  runNpmStep("Backup drill", ["run", "check:backup"]);
} else {
  console.warn("CHECK_HARDENING_RUN_BACKUP=true is not set. Skipping backup drill.");
}

if (process.env.CHECK_HARDENING_RUN_RESTORE === "true") {
  runNpmStep("Restore drill", ["run", "check:restore"]);
} else {
  console.warn("CHECK_HARDENING_RUN_RESTORE=true is not set. Skipping restore drill.");
}

console.log("\nProduction hardening check passed.");

function runPrismaValidate() {
  const localPrisma = resolve(
    process.cwd(),
    process.platform === "win32" ? "node_modules/.bin/prisma.cmd" : "node_modules/.bin/prisma",
  );

  if (existsSync(localPrisma)) {
    runStep("Prisma validate", localPrisma, ["validate"]);
    return;
  }

  const composeFile = process.env.COMPOSE_FILE || "docker-compose.prod.yml";
  const composePath = resolve(process.cwd(), composeFile);
  if (!existsSync(composePath)) {
    throw new Error(
      `Prisma validate could not find a local binary and compose file is missing: ${composeFile}.`,
    );
  }

  runStep("Prisma validate (container)", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    "web",
    "npx",
    "prisma",
    "validate",
  ]);
}
