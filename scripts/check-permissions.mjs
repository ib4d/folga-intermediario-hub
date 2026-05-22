import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const permissionSourcePath = resolve(process.cwd(), "src/lib/permissions.ts");
const source = readFileSync(permissionSourcePath, "utf8");

const roles = ["SUPERADMIN", "ADMIN", "INTERMEDIARIO", "LEGAL", "LOGISTICA"];
const modules = [
  "dashboard",
  "candidates",
  "documents",
  "logistics",
  "legal",
  "settings",
  "billing",
  "apiKeys",
  "branding",
  "leads",
  "revenue",
  "marketplace",
];

const expectedModuleAccess = {
  SUPERADMIN: modules,
  ADMIN: modules,
  INTERMEDIARIO: ["dashboard", "candidates", "documents", "settings"],
  LEGAL: ["dashboard", "candidates", "documents", "legal", "settings"],
  LOGISTICA: ["dashboard", "candidates", "logistics", "settings"],
};

const expectedInvitableRoles = {
  ADMIN_MANAGED_ROLES: ["INTERMEDIARIO", "LEGAL", "LOGISTICA"],
  SUPERADMIN_INVITABLE_ROLES: ["INTERMEDIARIO", "LEGAL", "LOGISTICA", "ADMIN"],
};

function extractRoleArray(name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([^\\]]*)\\]`, "m"));
  assert.ok(match, `${name} was not found`);
  return [...match[1].matchAll(/Role\.([A-Z_]+)/g)].map((item) => item[1]);
}

function extractModuleAccessBlock() {
  const match = source.match(
    /const\s+MODULE_ACCESS[\s\S]*?=\s*\{([\s\S]*?)\};\s*export\s+const\s+ROLE_PERMISSION_SUMMARIES/
  );
  assert.ok(match, "MODULE_ACCESS block was not found");
  return match[1];
}

function extractModuleList(block, role) {
  const match = block.match(new RegExp(`\\[Role\\.${role}\\]:\\s*\\[([\\s\\S]*?)\\]`, "m"));
  assert.ok(match, `${role} module access was not found`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

for (const [name, expected] of Object.entries(expectedInvitableRoles)) {
  assert.deepEqual(extractRoleArray(name), expected, `${name} mismatch`);
}

const moduleAccessBlock = extractModuleAccessBlock();
for (const role of roles) {
  assert.deepEqual(
    extractModuleList(moduleAccessBlock, role),
    expectedModuleAccess[role],
    `${role} accessible module list mismatch`
  );
}

const requiredFunctions = [
  "canViewMemberRole",
  "canManageMemberRole",
  "getInvitableRoles",
  "canAssignRole",
  "canAccessModule",
  "getAccessibleModules",
  "canCreateCandidates",
  "canImportCandidates",
  "canUploadCandidateDocuments",
  "canReviewCandidateDocuments",
  "canRequestLegalReview",
  "canMakeLegalDecision",
  "canManageLogistics",
  "canInviteUsers",
  "canDeleteCandidates",
  "canAccessCandidateByOwnership",
  "canExportCandidates",
  "canExportLegalReview",
  "canExportLogistics",
  "canViewCandidateContact",
  "canViewCandidatePayment",
  "canViewCandidateLogistics",
  "canViewCandidateAudit",
  "canEditCandidateNotes",
];

for (const functionName of requiredFunctions) {
  assert.match(source, new RegExp(`export\\s+function\\s+${functionName}\\s*\\(`), `${functionName} is missing`);
}

console.log("Permission policy source check passed.");
