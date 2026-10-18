import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = process.argv[2];

if (!inputPath || process.argv.length !== 3) {
  fail("Usage: npm run check:suppression-attestation -- <path-to-json>");
}

const filePath = resolve(inputPath);
let fileStat;

try {
  fileStat = lstatSync(filePath);
} catch {
  fail("Attestation file cannot be read.");
}

if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
  fail("Attestation input must be a regular file, not a symlink.");
}

if (fileStat.size <= 0 || fileStat.size > 256 * 1024) {
  fail("Attestation file must be between 1 byte and 256 KiB.");
}

let attestation;
try {
  attestation = JSON.parse(readFileSync(filePath, "utf8"));
} catch {
  fail("Attestation file is not valid JSON.");
}

const expectedKeys = [
  "record_type",
  "template_status",
  "restoration_id",
  "backup_cutoff_utc",
  "query_window_end_utc",
  "source_system",
  "source_reference",
  "query_method_or_filter",
  "case_count",
  "query_result",
  "queried_by",
  "verified_by",
  "queried_at_utc",
  "evidence_sha256",
  "evidence_reference",
];

if (!attestation || typeof attestation !== "object" || Array.isArray(attestation)) {
  fail("Attestation must be a JSON object.");
}

const actualKeys = Object.keys(attestation).sort();
const requiredKeys = [...expectedKeys].sort();
if (
  actualKeys.length !== requiredKeys.length ||
  actualKeys.some((key, index) => key !== requiredKeys[index])
) {
  fail("Attestation fields do not match the approved template. Keep case details in the restricted register.");
}

if (attestation.record_type !== "suppression_window_attestation") {
  fail("Unexpected attestation record type.");
}

if (attestation.template_status !== "COMPLETED_ATTESTATION") {
  fail("Template is not marked COMPLETED_ATTESTATION.");
}

const requiredTextFields = [
  "restoration_id",
  "source_system",
  "source_reference",
  "query_method_or_filter",
  "queried_by",
  "verified_by",
  "evidence_reference",
];

for (const key of requiredTextFields) {
  if (typeof attestation[key] !== "string" || attestation[key].trim() === "") {
    fail(`Required field is empty: ${key}.`);
  }
}

const backupCutoff = parseUtcTimestamp("backup_cutoff_utc", attestation.backup_cutoff_utc);
const queryWindowEnd = parseUtcTimestamp("query_window_end_utc", attestation.query_window_end_utc);
const queriedAt = parseUtcTimestamp("queried_at_utc", attestation.queried_at_utc);

if (backupCutoff > queryWindowEnd) {
  fail("query_window_end_utc must be at or after backup_cutoff_utc.");
}

if (queriedAt < queryWindowEnd) {
  fail("queried_at_utc must be at or after query_window_end_utc.");
}

if (!Number.isInteger(attestation.case_count) || attestation.case_count < 0) {
  fail("case_count must be a non-negative integer.");
}

const expectedResult = attestation.case_count === 0 ? "ZERO_CASES" : "CASES_FOUND";
if (attestation.query_result !== expectedResult) {
  fail(`query_result must be ${expectedResult} when case_count is ${attestation.case_count}.`);
}

if (attestation.queried_by.trim().toLocaleLowerCase() === attestation.verified_by.trim().toLocaleLowerCase()) {
  fail("queried_by and verified_by must identify different people.");
}

if (!/^[a-f\d]{64}$/i.test(attestation.evidence_sha256)) {
  fail("evidence_sha256 must contain a 64-character SHA-256 digest.");
}

console.log("Suppression attestation is structurally complete.");
console.log("This check does not verify the source system, evidence digest, or truth of the query.");

function parseUtcTimestamp(key, value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    fail(`${key} must use UTC ISO format YYYY-MM-DDTHH:mm:ss.sssZ.`);
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    fail(`${key} is not a valid UTC timestamp.`);
  }

  return timestamp;
}

function fail(message) {
  console.error(`Suppression attestation rejected: ${message}`);
  process.exit(1);
}
