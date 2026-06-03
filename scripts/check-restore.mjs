import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const composeFile = process.env.COMPOSE_FILE || "docker-compose.prod.yml";
const dbUser = process.env.DB_USER || "folga";
const dbName = process.env.DB_NAME || "folga_hub";
const backupFile = resolveBackupFile();
const dryRun = process.env.CHECK_RESTORE_DRY_RUN === "true";

const composePath = resolve(process.cwd(), composeFile);
if (!existsSync(composePath)) {
  throw new Error(`Compose file not found: ${composeFile}`);
}

if (dryRun) {
  if (!backupFile) {
    console.warn("CHECK_RESTORE_BACKUP_FILE is not set and no backup was discovered. Skipping restore drill.");
    process.exit(0);
  }

  console.log("Restore drill dry run passed. Backup file and compose file are present.");
  process.exit(0);
}

if (!backupFile) {
  console.warn("No backup file found. Skipping restore drill.");
  process.exit(0);
}

const backupPath = resolve(process.cwd(), backupFile);
if (!existsSync(backupPath)) {
  throw new Error(`Backup file not found: ${backupFile}`);
}

const tempDbName = `${dbName}_restore_drill_${Date.now()}`;

try {
  run("Create temporary restore database", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    dbUser,
    "-d",
    "postgres",
    "-c",
    `CREATE DATABASE "${tempDbName}"`,
  ]);

  if (backupPath.endsWith(".gz")) {
    const backupBuffer = readFileSync(backupPath);
    const restoredBuffer = gunzipSync(backupBuffer);
    run("Restore backup into temporary database", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      dbUser,
      "-d",
      tempDbName,
    ], { input: restoredBuffer });
  } else {
    const backupContent = readFileSync(backupPath);
    run("Restore backup into temporary database", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      dbUser,
      "-d",
      tempDbName,
    ], { input: backupContent });
  }

  const rowCountCheck = runCapture("Verify restored database is reachable", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    dbUser,
    "-d",
    tempDbName,
    "-tAc",
    "select 1;",
  ]);

  if (!rowCountCheck.trim().startsWith("1")) {
    throw new Error("Restore drill did not respond as expected.");
  }

  console.log(`Restore drill passed against temporary database ${tempDbName}.`);
} finally {
  try {
    run("Drop temporary restore database", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      dbUser,
      "-d",
      "postgres",
      "-c",
      `DROP DATABASE IF EXISTS "${tempDbName}"`,
    ]);
  } catch {
    // Ignore cleanup errors in a drill helper.
  }
}

function run(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
    ...options,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status}: ${sanitize(result.stderr || result.stdout || "")}`);
  }
}

function runCapture(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
    ...options,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status}: ${sanitize(result.stderr || result.stdout || "")}`);
  }

  return result.stdout || "";
}

function sanitize(value) {
  return value.replace(/\r?\n/g, " ").trim().slice(0, 300);
}

function resolveBackupFile() {
  const explicit = process.env.CHECK_RESTORE_BACKUP_FILE?.trim();
  if (explicit) return explicit;

  for (const candidateDir of ["./backups", "/var/backups/ori-cruit-hub"]) {
    const absDir = resolve(process.cwd(), candidateDir);
    if (!existsSync(absDir)) continue;

    const candidates = readdirSync(absDir)
      .filter((entry) => entry.endsWith(".sql") || entry.endsWith(".sql.gz"))
      .map((entry) => {
        const fullPath = resolve(absDir, entry);
        return { fullPath, mtimeMs: statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (candidates.length > 0) {
      return candidates[0].fullPath;
    }
  }

  return "";
}
