-- =====================================================================
-- FOLGA HUB - P4 Multi-Tenant Migration
-- Run this AFTER ensuring the current DB schema matches P0-P3 baseline.
-- =====================================================================

-- 1. Create Plan enum
DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add EN_POLONIA to CandidateStatus enum
ALTER TYPE "CandidateStatus" ADD VALUE IF NOT EXISTS 'EN_POLONIA';

-- 3. Create Organization table
CREATE TABLE IF NOT EXISTS "Organization" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "slug"          TEXT NOT NULL,
  "taxId"         TEXT,
  "country"       TEXT,
  "plan"          "Plan" NOT NULL DEFAULT 'FREE',
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "logoUrl"       TEXT,
  "primaryColor"  TEXT,
  "secondaryColor" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");

-- 4. Create Membership table
CREATE TABLE IF NOT EXISTS "Membership" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role"           "Role" NOT NULL DEFAULT 'INTERMEDIARIO',
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Membership_userId_organizationId_key" UNIQUE ("userId", "organizationId")
);

-- 5. Create Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"                      TEXT NOT NULL,
  "organizationId"          TEXT NOT NULL,
  "plan"                    "Plan" NOT NULL,
  "status"                  TEXT NOT NULL,
  "currentPeriodStart"      TIMESTAMP(3),
  "currentPeriodEnd"        TIMESTAMP(3),
  "provider"                TEXT,
  "providerCustomerId"      TEXT,
  "providerSubscriptionId"  TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- 6. Create ApiKey table
CREATE TABLE IF NOT EXISTS "ApiKey" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "keyHash"        TEXT NOT NULL,
  "lastUsedAt"     TIMESTAMP(3),
  "revokedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- 7. Add organizationId and isPlatformAdmin to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- 8. Add organizationId to Candidate
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 9. Add organizationId to Document
ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 10. Add organizationId to StatusHistory
ALTER TABLE "StatusHistory"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 11. Add organizationId to AuditLog
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 12. Add organizationId to LogisticsEvent
ALTER TABLE "LogisticsEvent"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 13. Add organizationId to Notification
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- =====================================================================
-- DATA MIGRATION: Create a default org for existing data
-- =====================================================================

-- Create default organization for pre-existing data
INSERT INTO "Organization" ("id", "name", "slug", "plan", "isActive", "updatedAt")
VALUES (
  'org_default_migration',
  'Folga Sp. z o.o.',
  'folga-default',
  'ENTERPRISE',
  true,
  CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Backfill organizationId on all existing records
UPDATE "User"         SET "organizationId" = 'org_default_migration' WHERE "organizationId" IS NULL;
UPDATE "Candidate"    SET "organizationId" = 'org_default_migration' WHERE "organizationId" IS NULL;
UPDATE "Document"     SET "organizationId" = 'org_default_migration' WHERE "organizationId" IS NULL;
UPDATE "StatusHistory" SET "organizationId" = 'org_default_migration' WHERE "organizationId" IS NULL;
UPDATE "AuditLog"     SET "organizationId" = 'org_default_migration' WHERE "organizationId" IS NULL;
UPDATE "LogisticsEvent" SET "organizationId" = 'org_default_migration' WHERE "organizationId" IS NULL;
UPDATE "Notification" SET "organizationId" = 'org_default_migration' WHERE "organizationId" IS NULL;

-- Create memberships for all existing users
INSERT INTO "Membership" ("id", "userId", "organizationId", "role", "isActive", "updatedAt")
SELECT
  'mbr_' || "id",
  "id",
  'org_default_migration',
  "role",
  "isActive",
  CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT DO NOTHING;

-- =====================================================================
-- CONSTRAINTS: Add NOT NULL and FK after backfill
-- =====================================================================

ALTER TABLE "Candidate"     ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Document"      ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "StatusHistory" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AuditLog"      ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "LogisticsEvent" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Notification"  ALTER COLUMN "organizationId" SET NOT NULL;

-- Add Foreign Keys
ALTER TABLE "User"          ADD CONSTRAINT "User_organizationId_fkey"          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
ALTER TABLE "Membership"    ADD CONSTRAINT "Membership_userId_fkey"             FOREIGN KEY ("userId")         REFERENCES "User"("id")         ON DELETE CASCADE;
ALTER TABLE "Membership"    ADD CONSTRAINT "Membership_organizationId_fkey"     FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Candidate"     ADD CONSTRAINT "Candidate_organizationId_fkey"      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Document"      ADD CONSTRAINT "Document_organizationId_fkey"       FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_organizationId_fkey"  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "AuditLog"      ADD CONSTRAINT "AuditLog_organizationId_fkey"       FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "LogisticsEvent" ADD CONSTRAINT "LogisticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Notification"  ADD CONSTRAINT "Notification_organizationId_fkey"   FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Subscription"  ADD CONSTRAINT "Subscription_organizationId_fkey"   FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "ApiKey"        ADD CONSTRAINT "ApiKey_organizationId_fkey"          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
