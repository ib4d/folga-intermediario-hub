import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";

const composeFile = process.env.COMPOSE_FILE || "docker-compose.prod.yml";
const dbService = process.env.DB_SERVICE || "db";
const dbUser = process.env.DB_USER || "ori";
const dbName = process.env.DB_NAME || "ori_cruit_hub";
const backupFile = resolveBackupFile();
const documentsBackupFile = process.env.CHECK_RESTORE_DOCUMENTS_FILE?.trim()
  ? resolve(process.env.CHECK_RESTORE_DOCUMENTS_FILE.trim())
  : "";
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
  throw new Error("No backup file found. Restore drill is a required release gate; set CHECK_RESTORE_BACKUP_FILE or place a dump in ./backups or /var/backups/ori-cruit-hub.");
}

const backupPath = resolve(process.cwd(), backupFile);
if (!existsSync(backupPath)) {
  throw new Error(`Backup file not found: ${backupFile}`);
}
if (documentsBackupFile && !existsSync(documentsBackupFile)) {
  throw new Error("Document backup file not found: CHECK_RESTORE_DOCUMENTS_FILE.");
}

const tempDbName = `${dbName}_restore_drill_${Date.now()}`;
let documentRestoreDirectory = "";

try {
  run("Create temporary restore database", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    dbService,
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
      dbService,
      "psql",
      "--single-transaction",
      "-v",
      "ON_ERROR_STOP=1",
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
      dbService,
      "psql",
      "--single-transaction",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      dbUser,
      "-d",
      tempDbName,
    ], { input: backupContent });
  }

  const schemaCheck = runCapture("Verify restored application schema", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    dbService,
    "psql",
    "-U",
    dbUser,
    "-d",
    tempDbName,
    "-tAc",
    `SELECT CASE WHEN to_regclass('public."Candidate"') IS NOT NULL AND to_regclass('public."Document"') IS NOT NULL THEN 1 ELSE 0 END;`,
  ]);

  if (!schemaCheck.trim().startsWith("1")) {
    throw new Error("Restore drill completed, but expected Candidate and Document tables were not found.");
  }

  if (documentsBackupFile) {
    const documentUrlsJson = runCaptureQuiet("Read restored document references", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      dbService,
      "psql",
      "-U",
      dbUser,
      "-d",
      tempDbName,
      "-tAc",
      `SELECT COALESCE(json_agg(url)::text, '[]') FROM public."Document";`,
    ]).trim();
    const documentUrls = JSON.parse(documentUrlsJson);
    if (!Array.isArray(documentUrls) || documentUrls.some((url) => typeof url !== "string")) {
      throw new Error("Restored document references could not be validated.");
    }

    const objectPaths = documentUrls.map(resolveLocalStoredObjectPath);
    const archivedFiles = listSafeStorageArchiveFiles(documentsBackupFile);
    const missingPaths = objectPaths.filter((objectPath) => !archivedFiles.has(objectPath));

    if (missingPaths.length > 0) {
      throw new Error(`Document backup is missing ${missingPaths.length} referenced object path(s).`);
    }

    documentRestoreDirectory = mkdtempSync(join(tmpdir(), "ori-cruit-hub-restore-"));
    if (process.platform !== "win32") chmodSync(documentRestoreDirectory, 0o700);
    extractDocumentArchive(documentsBackupFile, documentRestoreDirectory);
    const restoredObjects = verifyRestoredDocumentObjects(documentRestoreDirectory, objectPaths);

    console.log(
      `Verified restored Document-to-archive objects ${restoredObjects.count}/${objectPaths.length}; ` +
        `${restoredObjects.bytes} bytes fully readable; ` +
        `private POSIX permissions ${restoredObjects.privatePermissions ? "verified" : "not available on this platform"}.`,
    );
  }

  const dataCounts = runCapture("Count restored application records", "docker", [
    "compose",
    "-f",
    composeFile,
    "exec",
    "-T",
    dbService,
    "psql",
    "-U",
    dbUser,
    "-d",
    tempDbName,
    "-tAc",
    `SELECT (SELECT count(*) FROM public."Candidate") || ':' || (SELECT count(*) FROM public."Document");`,
  ]).trim();

  console.log(`Restore drill passed against temporary database ${tempDbName}; restored Candidate:Document counts ${dataCounts}.`);
} finally {
  try {
    run("Drop temporary restore database", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      dbService,
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

  if (documentRestoreDirectory) {
    try {
      rmSync(documentRestoreDirectory, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors in a drill helper.
    }
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

function runCaptureQuiet(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status}: ${sanitize(result.stderr || result.stdout || "")}`);
  }

  return result.stdout || "";
}

function listSafeStorageArchiveFiles(archivePath) {
  const names = runCaptureQuiet("List document backup members", "tar", ["-tzf", archivePath])
    .split(/\r?\n/)
    .filter(Boolean);
  const verbose = runCaptureQuiet("Inspect document backup member types", "tar", ["-tvzf", archivePath])
    .split(/\r?\n/)
    .filter(Boolean);

  if (names.length !== verbose.length) {
    throw new Error("Document backup member listing is inconsistent.");
  }

  const files = new Set();
  const seenFiles = new Set();
  for (let index = 0; index < names.length; index += 1) {
    const type = verbose[index].charAt(0);
    if (type !== "-" && type !== "d") {
      throw new Error("Document backup contains an unsupported file type.");
    }

    const rawName = names[index].replace(/\\/g, "/");
    if (rawName.startsWith("/") || /^[A-Za-z]:/.test(rawName)) {
      throw new Error("Document backup contains an absolute path.");
    }

    const segments = rawName.split("/").filter((segment) => segment && segment !== ".");
    if (segments.some((segment) => segment === "..")) {
      throw new Error("Document backup contains a parent traversal path.");
    }

    if (type === "-") {
      const normalizedName = segments.join("/");
      if (!normalizedName || seenFiles.has(normalizedName)) {
        throw new Error("Document backup contains an empty or duplicate file path.");
      }
      seenFiles.add(normalizedName);
      files.add(normalizedName);
    }
  }

  return files;
}

function extractDocumentArchive(archivePath, destination) {
  const previousUmask = process.platform === "win32" ? undefined : process.umask(0o077);
  try {
    runQuiet("Extract document backup into a private temporary directory", "tar", [
      "-xzf",
      archivePath,
      "-C",
      destination,
    ]);
    if (process.platform !== "win32") chmodSync(destination, 0o700);
  } finally {
    if (previousUmask !== undefined) process.umask(previousUmask);
  }
}

function verifyRestoredDocumentObjects(rootDirectory, objectPaths) {
  const root = resolve(rootDirectory);
  const privatePermissions = process.platform !== "win32";
  let totalBytes = 0;

  for (const objectPath of objectPaths) {
    const segments = objectPath.split("/");
    const filePath = resolve(root, ...segments);
    if (!filePath.startsWith(`${root}${sep}`)) {
      throw new Error("A restored document path escapes the temporary extraction directory.");
    }

    let currentDirectory = root;
    for (const segment of segments.slice(0, -1)) {
      currentDirectory = join(currentDirectory, segment);
      const directoryStat = lstatSync(currentDirectory);
      if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
        throw new Error("A restored document path contains an unsafe directory entry.");
      }
      if (privatePermissions && (directoryStat.mode & 0o077) !== 0) {
        throw new Error("A restored document directory is accessible to group or other users.");
      }
    }

    const fileStat = lstatSync(filePath);
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
      throw new Error("A restored document object is not a regular file.");
    }
    if ((fileStat.mode & 0o400) === 0) {
      throw new Error("A restored document object is not owner-readable.");
    }
    if (privatePermissions && (fileStat.mode & 0o077) !== 0) {
      throw new Error("A restored document object is accessible to group or other users.");
    }

    accessSync(filePath, constants.R_OK);
    const descriptor = openSync(filePath, "r");
    const chunk = Buffer.allocUnsafe(64 * 1024);
    let fileBytes = 0;
    try {
      let bytesRead;
      while ((bytesRead = readFileChunk(descriptor, chunk)) > 0) {
        fileBytes += bytesRead;
      }
    } finally {
      closeSync(descriptor);
    }

    if (fileBytes !== fileStat.size) {
      throw new Error("A restored document object could not be read completely.");
    }
    totalBytes += fileBytes;
  }

  return { count: objectPaths.length, bytes: totalBytes, privatePermissions };
}

function readFileChunk(descriptor, buffer) {
  return readSync(descriptor, buffer, 0, buffer.length, null);
}

function runQuiet(label, command, args) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status}.`);
  }
}

function resolveLocalStoredObjectPath(publicUrl) {
  let url;
  try {
    url = new URL(publicUrl);
  } catch {
    throw new Error("A restored document has an invalid storage URL.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("A restored document has an unsafe storage URL.");
  }

  const marker = "/uploads/";
  const markerIndex = url.pathname.lastIndexOf(marker);
  if (markerIndex < 0) {
    throw new Error("A restored document does not use the local storage path.");
  }

  let objectPath;
  try {
    objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    throw new Error("A restored document has an invalid encoded storage path.");
  }

  const normalized = objectPath.replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("A restored document has an unsafe storage path.");
  }

  return normalized;
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
