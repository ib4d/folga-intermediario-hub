import { Role } from "@prisma/client";

export type OrganizationMembershipSnapshot = {
  organizationId: string;
  role: Role;
  isActive: boolean;
};

export type OrganizationAccessSnapshot = {
  organizationId: string | null;
  role: Role;
};

/**
 * Resolves an account's organization context without choosing an arbitrary
 * membership. User.role remains a compatibility fallback only when the account
 * has no memberships at all.
 */
export function resolveOrganizationAccess(input: {
  organizationId: string | null;
  role: Role;
  memberships: OrganizationMembershipSnapshot[];
}): OrganizationAccessSnapshot | null {
  if (input.organizationId) {
    const selectedMembership = input.memberships.find(
      (membership) => membership.organizationId === input.organizationId
    );

    if (selectedMembership) {
      if (!selectedMembership.isActive) return null;
      return { organizationId: input.organizationId, role: selectedMembership.role };
    }

    if (input.memberships.length > 0) return null;
    return { organizationId: input.organizationId, role: input.role };
  }

  const activeMemberships = input.memberships.filter((membership) => membership.isActive);
  if (activeMemberships.length === 1) {
    return {
      organizationId: activeMemberships[0].organizationId,
      role: activeMemberships[0].role,
    };
  }

  if (input.memberships.length > 0) return null;
  return { organizationId: null, role: input.role };
}
