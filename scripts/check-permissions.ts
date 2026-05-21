import { Role } from "@prisma/client";
import assert from "node:assert/strict";

import {
  canAccessModule,
  canAccessCandidateByOwnership,
  canAssignRole,
  canCreateCandidates,
  canDeleteCandidates,
  canExportCandidates,
  canExportLegalReview,
  canExportLogistics,
  canImportCandidates,
  canInviteUsers,
  canMakeLegalDecision,
  canManageLogistics,
  canManageMemberRole,
  canRequestLegalReview,
  canReviewCandidateDocuments,
  canUploadCandidateDocuments,
  canViewMemberRole,
  getAccessibleModules,
  getRolePermissionSummary,
  getInvitableRoles,
  type AppModule,
} from "../src/lib/permissions";

const allRoles = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.INTERMEDIARIO,
  Role.LEGAL,
  Role.LOGISTICA,
] as const;

const modules: AppModule[] = [
  "dashboard",
  "candidates",
  "documents",
  "logistics",
  "legal",
  "settings",
  "billing",
  "apiKeys",
  "branding",
];

const expectedModuleAccess: Record<Role, AppModule[]> = {
  [Role.SUPERADMIN]: modules,
  [Role.ADMIN]: modules,
  [Role.INTERMEDIARIO]: ["dashboard", "candidates", "documents", "settings"],
  [Role.LEGAL]: ["dashboard", "candidates", "documents", "legal", "settings"],
  [Role.LOGISTICA]: ["dashboard", "candidates", "logistics", "settings"],
};

for (const role of allRoles) {
  assert.deepEqual(getAccessibleModules(role), expectedModuleAccess[role], `${role} accessible module list mismatch`);
  assert.equal(getRolePermissionSummary(role).role, role, `${role} permission summary mismatch`);

  for (const appModule of modules) {
    assert.equal(
      canAccessModule(role, appModule),
      expectedModuleAccess[role].includes(appModule),
      `${role} module access mismatch for ${appModule}`
    );
  }
}

assert.deepEqual(getInvitableRoles(Role.SUPERADMIN), [
  Role.INTERMEDIARIO,
  Role.LEGAL,
  Role.LOGISTICA,
  Role.ADMIN,
]);
assert.deepEqual(getInvitableRoles(Role.ADMIN), [Role.INTERMEDIARIO, Role.LEGAL, Role.LOGISTICA]);
assert.deepEqual(getInvitableRoles(Role.LEGAL), []);
assert.deepEqual(getInvitableRoles(Role.LOGISTICA), []);
assert.deepEqual(getInvitableRoles(Role.INTERMEDIARIO), []);

assert.equal(canAssignRole(Role.SUPERADMIN, Role.SUPERADMIN), true);
assert.equal(canAssignRole(Role.ADMIN, Role.SUPERADMIN), false);
assert.equal(canAssignRole(Role.ADMIN, Role.ADMIN), false);
assert.equal(canAssignRole(Role.ADMIN, Role.LEGAL), true);
assert.equal(canAssignRole(Role.LEGAL, Role.INTERMEDIARIO), false);

for (const targetRole of allRoles) {
  assert.equal(canViewMemberRole(Role.SUPERADMIN, targetRole), true);
  assert.equal(canManageMemberRole(Role.SUPERADMIN, targetRole), true);
}

assert.equal(canManageMemberRole(Role.SUPERADMIN, Role.SUPERADMIN, true), false);
assert.equal(canViewMemberRole(Role.ADMIN, Role.SUPERADMIN), false);
assert.equal(canManageMemberRole(Role.ADMIN, Role.SUPERADMIN), false);
assert.equal(canViewMemberRole(Role.ADMIN, Role.ADMIN), false);
assert.equal(canManageMemberRole(Role.ADMIN, Role.ADMIN), false);
assert.equal(canViewMemberRole(Role.ADMIN, Role.LEGAL), true);
assert.equal(canManageMemberRole(Role.ADMIN, Role.LEGAL), true);
assert.equal(canViewMemberRole(Role.LEGAL, Role.LEGAL), true);
assert.equal(canManageMemberRole(Role.LEGAL, Role.LEGAL), false);
assert.equal(canViewMemberRole(Role.LOGISTICA, Role.LOGISTICA), true);
assert.equal(canViewMemberRole(Role.INTERMEDIARIO, Role.INTERMEDIARIO), true);

assert.equal(canCreateCandidates(Role.INTERMEDIARIO), true);
assert.equal(canCreateCandidates(Role.LEGAL), false);
assert.equal(canImportCandidates(Role.ADMIN), true);
assert.equal(canImportCandidates(Role.LOGISTICA), false);
assert.equal(canUploadCandidateDocuments(Role.INTERMEDIARIO), true);
assert.equal(canUploadCandidateDocuments(Role.LEGAL), false);
assert.equal(canReviewCandidateDocuments(Role.LEGAL), true);
assert.equal(canReviewCandidateDocuments(Role.LOGISTICA), false);
assert.equal(canRequestLegalReview(Role.LOGISTICA), true);
assert.equal(canRequestLegalReview(Role.LEGAL), false);
assert.equal(canMakeLegalDecision(Role.LEGAL), true);
assert.equal(canMakeLegalDecision(Role.INTERMEDIARIO), false);
assert.equal(canManageLogistics(Role.LOGISTICA), true);
assert.equal(canManageLogistics(Role.LEGAL), false);
assert.equal(canInviteUsers(Role.ADMIN), true);
assert.equal(canInviteUsers(Role.LEGAL), false);
assert.equal(canDeleteCandidates(Role.INTERMEDIARIO), true);
assert.equal(canDeleteCandidates(Role.LOGISTICA), false);
assert.equal(canAccessCandidateByOwnership(Role.SUPERADMIN, "owner-a", "user-b"), true);
assert.equal(canAccessCandidateByOwnership(Role.ADMIN, "owner-a", "user-b"), true);
assert.equal(canAccessCandidateByOwnership(Role.LEGAL, "owner-a", "user-b"), true);
assert.equal(canAccessCandidateByOwnership(Role.LOGISTICA, "owner-a", "user-b"), true);
assert.equal(canAccessCandidateByOwnership(Role.INTERMEDIARIO, "owner-a", "owner-a"), true);
assert.equal(canAccessCandidateByOwnership(Role.INTERMEDIARIO, "owner-a", "user-b"), false);
assert.equal(canExportCandidates(Role.SUPERADMIN), true);
assert.equal(canExportCandidates(Role.ADMIN), true);
assert.equal(canExportCandidates(Role.LEGAL), false);
assert.equal(canExportLegalReview(Role.LEGAL), true);
assert.equal(canExportLegalReview(Role.LOGISTICA), false);
assert.equal(canExportLogistics(Role.LOGISTICA), true);
assert.equal(canExportLogistics(Role.INTERMEDIARIO), false);

console.log("Permission matrix check passed.");
