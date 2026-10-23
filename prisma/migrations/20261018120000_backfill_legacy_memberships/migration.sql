-- Preserve existing single-organization access in the normalized membership
-- model so settings, role management, and invitation guards see legacy users.
-- Accounts with any explicit membership or platform-admin status are left
-- unchanged. Inactive legacy accounts stay inactive after backfill.
INSERT INTO "Membership" (
  "id",
  "userId",
  "organizationId",
  "role",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_' || u."id",
  u."id",
  u."organizationId",
  u."role",
  u."isActive",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" AS u
INNER JOIN "Organization" AS o
  ON o."id" = u."organizationId"
WHERE u."organizationId" IS NOT NULL
  AND u."isPlatformAdmin" = false
  AND NOT EXISTS (
    SELECT 1
    FROM "Membership" AS m
    WHERE m."userId" = u."id"
  )
ON CONFLICT ("userId", "organizationId") DO NOTHING;
