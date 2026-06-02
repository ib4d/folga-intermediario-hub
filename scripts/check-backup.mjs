import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const composeFile = process.env.COMPOSE_FILE || "docker-compose.prod.yml";
const dbUser = process.env.DB_USER || "folga";
const dbName = process.env.DB_NAME || "folga_hub";
const dryRun = process.env.CHECK_BACKUP_DRY_RUN === "true";
const requireCompose = process.env.CHECK_BACKUP_REQUIRE_COMPOSE === "true";
const composePath = resolve(process.cwd(), composeFile);

if (!existsSync(composePath)) {
  const message = `Compose file not found: ${composeFile}.`;
  if (requireCompose) {
    throw new Error(message);
  }

  console.warn(`${message} Skipping backup drill because this check must run from the host repository root.`);
  process.exit(0);
}

if (dryRun) {
  console.log("Backup drill dry run passed. Compose file is present and configuration was loaded.");
  process.exit(0);
}

const workDir = mkdtempSync(join(tmpdir(), "ori-cruit-backup-check-"));
const backupFile = join(workDir, `oricruithub-${dbName}-${Date.now()}.sql.gz`);

try {
  const result = spawnSync(
    "docker",
    ["compose", "-f", composeFile, "exec", "-T", "db", "pg_dump", "-U", dbUser, "-d", dbName],
    {
      cwd: process.cwd(),
      encoding: "buffer",
      maxBuffer: 1024 * 1024 * 128,
      env: process.env,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = sanitize(result.stderr?.toString("utf8") || "");
    throw new Error(`pg_dump failed with code ${result.status}: ${stderr || "unknown error"}`);
  }

  const compressed = gzipSync(result.stdout);
  writeFileSync(backupFile, compressed);

  const stats = existsSync(backupFile) ? compressed.byteLength : 0;
  if (stats <= 0) {
    throw new Error("Backup drill produced an empty compressed file.");
  }

  console.log(`Backup drill passed. Temporary file created at ${backupFile}`);
} finally {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors in a verification helper.
  }
}

function sanitize(value) {
  return value.replace(/\r?\n/g, " ").trim().slice(0, 300);
}
