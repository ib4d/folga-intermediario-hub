import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const permissionSourcePath = resolve(process.cwd(), "src/lib/permissions.ts");
const source = readFileSync(permissionSourcePath, "utf8");
const sourceFile = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const roles = ["SUPERADMIN", "ADMIN", "INTERMEDIARIO", "LEGAL", "LOGISTICA"];
const modules = [
  "dashboard",
  "brokers",
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

function assertSourceIncludes(path, patterns, label) {
  const content = sourceFile(path);
  for (const [pattern, message] of patterns) {
    assert.match(content, pattern, `${label}: ${message}`);
  }
}

function assertActionGuard(path, actionName, guard) {
  const content = sourceFile(path);
  const actionStart = content.indexOf(`export async function ${actionName}(`);
  assert.notEqual(actionStart, -1, `${path}: ${actionName} is missing`);
  const nextAction = content.indexOf("\nexport async function ", actionStart + 1);
  const actionSource = content.slice(actionStart, nextAction === -1 ? content.length : nextAction);
  assert.match(actionSource, new RegExp(`\\b${guard}\\s*\\(`), `${path}: ${actionName} must enforce ${guard}`);
}

assertSourceIncludes("src/app/(app)/layout.tsx", [
  [/await auth\(\)/, "authenticated routes must validate a session"],
  [/await getCurrentTenant\(\)/, "authenticated routes must validate an active tenant"],
], "app layout");
assertSourceIncludes("src/components/Sidebar.tsx", [
  [/canAccessModule\(role, link\.module\)/, "sidebar links must use the canonical module policy"],
], "desktop navigation");
assertSourceIncludes("src/components/BottomNav.tsx", [
  [/canAccessModule\(role, item\.module\)/, "mobile navigation must use the canonical module policy"],
], "mobile navigation");

const protectedPages = [
  ["src/app/(app)/brokers/page.tsx", /canAccessModule\(tenant\.role, "brokers"\)/],
  ["src/app/(app)/broker-dashboard/page.tsx", /canAccessModule\(tenant\.role, "brokers"\)/],
  ["src/app/(app)/broker-invoices/page.tsx", /canAccessModule\(tenant\.role, "brokers"\)/],
  ["src/app/(app)/candidatos/nuevo/page.tsx", /canCreateCandidates\(tenant\.role\)/],
  ["src/app/(app)/documentos/page.tsx", /canAccessModule\(tenant\.role, "documents"\)/],
  ["src/app/(app)/legal/page.tsx", /canMakeLegalDecision\(tenant\.role\)/],
  ["src/app/(app)/logistica/page.tsx", /canManageLogistics\(tenant\.role\)/],
  ["src/app/(app)/leads/page.tsx", /canAccessModule\(tenant\.role, "leads"\)/],
  ["src/app/(app)/revenue/page.tsx", /canAccessModule\(tenant\.role, "revenue"\)/],
  ["src/app/(app)/marketplace/page.tsx", /canAccessModule\(tenant\.role, "marketplace"\)/],
  ["src/app/(app)/billing/page.tsx", /canAccessModule\(tenant\.role, "billing"\)/],
  ["src/app/(app)/ajustes/api-keys/page.tsx", /canAccessModule\(tenant\.role, "apiKeys"\)/],
  ["src/app/(app)/ajustes/branding/page.tsx", /canAccessModule\(tenant\.role, "branding"\)/],
];
for (const [path, guard] of protectedPages) {
  assertSourceIncludes(path, [[guard, `route must enforce ${guard.source}`]], path);
}

const protectedActions = [
  ["src/app/actions/candidates.ts", "createCandidate", "canCreateCandidates"],
  ["src/app/actions/candidates.ts", "updateCandidate", "canCreateCandidates"],
  ["src/app/actions/candidates.ts", "importCandidatesFromExcel", "canImportCandidates"],
  ["src/app/actions/candidates.ts", "generateRegistrationLink", "canGenerateRegistrationLinks"],
  ["src/app/actions/candidates.ts", "deleteCandidate", "canDeleteCandidates"],
  ["src/app/actions/candidates.ts", "deleteCandidatesBulk", "canDeleteCandidates"],
  ["src/app/actions/candidates.ts", "updateCandidateNotes", "canEditCandidateNotes"],
  ["src/app/actions/documents.ts", "uploadDocument", "canUploadCandidateDocuments"],
  ["src/app/actions/documents.ts", "batchUploadDocuments", "uploadDocument"],
  ["src/app/actions/documents.ts", "verifyDocument", "canReviewCandidateDocuments"],
  ["src/app/actions/documents.ts", "reviewDocumentOcr", "canReviewCandidateDocuments"],
  ["src/app/actions/documents.ts", "deleteDocument", "canUploadCandidateDocuments"],
  ["src/app/actions/documents.ts", "smartBatchUpload", "canUploadCandidateDocuments"],
  ["src/app/actions/logistics.ts", "createLogisticsEvent", "assertLogisticsAccess"],
  ["src/app/actions/logistics.ts", "updateLogisticsEvent", "assertLogisticsAccess"],
  ["src/app/actions/logistics.ts", "confirmLogisticsEvent", "assertLogisticsAccess"],
  ["src/app/actions/logistics.ts", "deleteLogisticsEvent", "assertLogisticsAccess"],
  ["src/app/actions/invitations.ts", "inviteUserAction", "canInviteUsers"],
  ["src/app/actions/sales.ts", "createLead", "canAccessModule"],
  ["src/app/actions/sales.ts", "sendLeadOutreach", "canAccessModule"],
  ["src/app/actions/sales.ts", "updateLeadStatus", "canAccessModule"],
  ["src/app/actions/exports.ts", "exportCandidatesXLSX", "canExportCandidates"],
  ["src/app/actions/exports.ts", "exportLegalReviewXLSX", "canExportLegalReview"],
  ["src/app/actions/exports.ts", "exportLogisticsArrivalsXLSX", "canExportLogistics"],
];
for (const [path, actionName, guard] of protectedActions) {
  assertActionGuard(path, actionName, guard);
}
assertActionGuard("src/app/actions/user-permissions.ts", "updateMemberRoleAction", "getManageableMembership");
assertActionGuard("src/app/actions/user-permissions.ts", "updateMemberAccessAction", "getManageableMembership");
assertActionGuard("src/app/actions/settings.ts", "createApiKey", "canAccessModule");
assertActionGuard("src/app/actions/settings.ts", "revokeApiKey", "canAccessModule");
assertActionGuard("src/app/actions/settings.ts", "updateOrganizationBranding", "canAccessModule");
for (const action of [
  "importBrokerLeadsAction",
  "importBrokerInvoicesAction",
  "promoteBrokerLeadAction",
  "updateBrokerAction",
  "updateBrokerLeadAction",
  "generateBrokerInvoiceAction",
  "updateBrokerInvoiceStatusAction",
  "updateBrokerInvoiceAction",
]) {
  assertActionGuard("src/app/actions/brokers.ts", action, "assertBrokerAccess");
}

assertSourceIncludes("src/app/api/documents/review/route.ts", [
  [/requireRoleApi\(\[Role\.SUPERADMIN, Role\.ADMIN, Role\.LEGAL\]\)/, "OCR review API must return authentication/role denials before dispatch"],
], "OCR review API");
assertSourceIncludes("src/app/api/exports/candidates/route.ts", [
  [/canExportCandidates\(tenant\.role\)/, "full export must enforce its server-side role policy"],
  [/canExportLegalReview\(tenant\.role\)/, "legal export must enforce its server-side role policy"],
  [/canExportLogistics\(tenant\.role\)/, "logistics export must enforce its server-side role policy"],
  [/status:\s*403/, "denied export requests must return forbidden, not an internal error"],
], "candidate export API");
assertSourceIncludes("src/app/api/v1/candidates/route.ts", [
  [/authenticateApiKey\(req\)/, "v1 candidate API must require an API key"],
  [/organizationId:\s*apiKey\.organizationId/, "v1 candidate API must remain tenant-scoped"],
], "v1 candidate API");
assertSourceIncludes("src/app/api/v1/documents/route.ts", [
  [/authenticateApiKey\(req\)/, "v1 document API must require an API key"],
  [/organizationId:\s*apiKey\.organizationId/, "v1 document API must remain tenant-scoped"],
], "v1 document API");

console.log("Permission matrix and route/action/API/navigation guard checks passed.");
