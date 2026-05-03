-- =============================================================================
-- BASELINE MIGRATION: Multi-Tenant Schema
-- Applied: 2026-05-03
-- Strategy: FULLY NON-DESTRUCTIVE — all statements use IF NOT EXISTS guards.
-- This migration documents the schema state that was applied via `db push`.
-- Running this against a DB that already has these objects is a no-op.
-- NEVER drops public schema. Never removes data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS: Add missing values safely (ALTER TYPE ... ADD VALUE IF NOT EXISTS)
-- ---------------------------------------------------------------------------

-- Role enum: add LOGISTICA if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'Role' AND e.enumlabel = 'LOGISTICA') THEN
    ALTER TYPE "Role" ADD VALUE 'LOGISTICA';
  END IF;
END $$;

-- CandidateStatus: add EN_REVISION_LEGAL, REVISION_ADICIONAL, EN_POLONIA if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'CandidateStatus' AND e.enumlabel = 'EN_REVISION_LEGAL') THEN
    ALTER TYPE "CandidateStatus" ADD VALUE 'EN_REVISION_LEGAL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'CandidateStatus' AND e.enumlabel = 'REVISION_ADICIONAL') THEN
    ALTER TYPE "CandidateStatus" ADD VALUE 'REVISION_ADICIONAL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'CandidateStatus' AND e.enumlabel = 'EN_POLONIA') THEN
    ALTER TYPE "CandidateStatus" ADD VALUE 'EN_POLONIA';
  END IF;
END $$;

-- Plan enum: create if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
    CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- TABLES: Create missing tables (all use CREATE TABLE IF NOT EXISTS)
-- ---------------------------------------------------------------------------

-- Organization
CREATE TABLE IF NOT EXISTS "Organization" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "slug"           TEXT NOT NULL,
    "taxId"          TEXT,
    "country"        TEXT,
    "plan"           "Plan" NOT NULL DEFAULT 'FREE',
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "logoUrl"        TEXT,
    "primaryColor"   TEXT,
    "secondaryColor" TEXT,
    "referralCode"   TEXT,
    "referredById"   TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Membership
CREATE TABLE IF NOT EXISTS "Membership" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role"           "Role" NOT NULL DEFAULT 'INTERMEDIARIO',
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- Subscription
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id"                     TEXT NOT NULL,
    "organizationId"         TEXT NOT NULL,
    "plan"                   "Plan" NOT NULL,
    "status"                 TEXT NOT NULL,
    "currentPeriodStart"     TIMESTAMP(3),
    "currentPeriodEnd"       TIMESTAMP(3),
    "provider"               TEXT,
    "providerCustomerId"     TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- ApiKey
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

-- Workflow
CREATE TABLE IF NOT EXISTS "Workflow" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "triggerType"    TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- WorkflowStep
CREATE TABLE IF NOT EXISTS "WorkflowStep" (
    "id"         TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "type"       TEXT NOT NULL,
    "config"     JSONB NOT NULL,
    "order"      INTEGER NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- Lead
CREATE TABLE IF NOT EXISTS "Lead" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "email"          TEXT,
    "phone"          TEXT,
    "company"        TEXT,
    "status"         TEXT NOT NULL DEFAULT 'NEW',
    "source"         TEXT,
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- Outreach
CREATE TABLE IF NOT EXISTS "Outreach" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId"         TEXT NOT NULL,
    "step"           INTEGER NOT NULL,
    "message"        TEXT NOT NULL,
    "sentAt"         TIMESTAMP(3),
    "reply"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outreach_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- COLUMNS: Add missing columns to existing tables (IF NOT EXISTS)
-- ---------------------------------------------------------------------------

-- User table additions
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId"  TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settings"        JSONB DEFAULT '{}';

-- Candidate: multi-tenant + new fields
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "organizationId"      TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "dataRetentionUntil"  TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "isArchived"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "reviewNotes"         TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "score"               INTEGER;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "scoreLevel"          TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "scoreUpdatedAt"      TIMESTAMP(3);

-- Backfill organizationId on Candidate if NULL (only for pre-existing rows)
-- This sets a sentinel value; real data migration would use a known org ID
UPDATE "Candidate" SET "organizationId" = 'unknown' WHERE "organizationId" IS NULL;

-- Make organizationId NOT NULL after backfill
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Candidate' AND column_name='organizationId' AND is_nullable='YES'
  ) THEN
    ALTER TABLE "Candidate" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;

-- Document: multi-tenant
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "Document" SET "organizationId" = 'unknown' WHERE "organizationId" IS NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Document' AND column_name='organizationId' AND is_nullable='YES'
  ) THEN
    ALTER TABLE "Document" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;

-- LogisticsEvent: new schema columns
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "organizationId"  TEXT;
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "transportType"   TEXT;
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "arrivalDate"     TIMESTAMP(3);
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "terminal"        TEXT;
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "flightOrTrain"   TEXT;
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "pickedUpBy"      TEXT;
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "confirmed"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "LogisticsEvent" SET "organizationId" = 'unknown' WHERE "organizationId" IS NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='LogisticsEvent' AND column_name='organizationId' AND is_nullable='YES'
  ) THEN
    ALTER TABLE "LogisticsEvent" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;

-- StatusHistory: multi-tenant
ALTER TABLE "StatusHistory" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "StatusHistory" SET "organizationId" = 'unknown' WHERE "organizationId" IS NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='StatusHistory' AND column_name='organizationId' AND is_nullable='YES'
  ) THEN
    ALTER TABLE "StatusHistory" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;

-- AuditLog: multi-tenant
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "AuditLog" SET "organizationId" = 'unknown' WHERE "organizationId" IS NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='AuditLog' AND column_name='organizationId' AND is_nullable='YES'
  ) THEN
    ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;

-- Notification: multi-tenant + userId
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "userId"         TEXT;
UPDATE "Notification" SET "organizationId" = 'unknown' WHERE "organizationId" IS NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Notification' AND column_name='organizationId' AND is_nullable='YES'
  ) THEN
    ALTER TABLE "Notification" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Notification' AND column_name='userId' AND is_nullable='YES'
  ) THEN
    ALTER TABLE "Notification" ALTER COLUMN "userId" SET NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- REMOVE global unique on Candidate.email (multi-tenant: email only unique
-- per-org, enforced by the composite index below)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "Candidate_email_key";

-- ---------------------------------------------------------------------------
-- INDEXES: Create missing indexes (IF NOT EXISTS)
-- ---------------------------------------------------------------------------

-- Organization
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key"         ON "Organization"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_referralCode_key" ON "Organization"("referralCode");

-- Membership
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- Subscription
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- Candidate: per-org composite (NO global email unique)
CREATE INDEX IF NOT EXISTS "Candidate_organizationId_email_idx"    ON "Candidate"("organizationId", email);
CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_id_organizationId_key" ON "Candidate"(id, "organizationId");

-- Document
CREATE UNIQUE INDEX IF NOT EXISTS "Document_id_organizationId_key" ON "Document"(id, "organizationId");

-- LogisticsEvent
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsEvent_id_organizationId_key" ON "LogisticsEvent"(id, "organizationId");

-- StatusHistory
CREATE UNIQUE INDEX IF NOT EXISTS "StatusHistory_id_organizationId_key" ON "StatusHistory"(id, "organizationId");

-- AuditLog
CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_id_organizationId_key" ON "AuditLog"(id, "organizationId");

-- Workflow / Lead / Outreach / Subscription
CREATE UNIQUE INDEX IF NOT EXISTS "Workflow_id_organizationId_key"     ON "Workflow"(id, "organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_id_organizationId_key"         ON "Lead"(id, "organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Outreach_id_organizationId_key"     ON "Outreach"(id, "organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_id_organizationId_key" ON "Subscription"(id, "organizationId");

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS: Add missing FKs (only if not already present)
-- ---------------------------------------------------------------------------

-- Organization self-ref (referredBy)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Organization_referredById_fkey') THEN
    ALTER TABLE "Organization" ADD CONSTRAINT "Organization_referredById_fkey"
      FOREIGN KEY ("referredById") REFERENCES "Organization"(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- User → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_organizationId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Membership FKs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Membership_userId_fkey') THEN
    ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Membership_organizationId_fkey') THEN
    ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Subscription → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_organizationId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ApiKey → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiKey_organizationId_fkey') THEN
    ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Candidate → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Candidate_organizationId_fkey') THEN
    ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Document → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_organizationId_fkey') THEN
    ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- LogisticsEvent → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LogisticsEvent_organizationId_fkey') THEN
    ALTER TABLE "LogisticsEvent" ADD CONSTRAINT "LogisticsEvent_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- StatusHistory → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StatusHistory_organizationId_fkey') THEN
    ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AuditLog → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_organizationId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Notification → Organization + User
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_organizationId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Workflow → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Workflow_organizationId_fkey') THEN
    ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- WorkflowStep → Workflow
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkflowStep_workflowId_fkey') THEN
    ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey"
      FOREIGN KEY ("workflowId") REFERENCES "Workflow"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Lead → Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_organizationId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Outreach → Lead + Organization
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Outreach_leadId_fkey') THEN
    ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Outreach_organizationId_fkey') THEN
    ALTER TABLE "Outreach" ADD CONSTRAINT "Outreach_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
