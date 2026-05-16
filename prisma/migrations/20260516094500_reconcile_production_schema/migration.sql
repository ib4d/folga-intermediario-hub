-- =============================================================================
-- RECONCILIATION MIGRATION: Production schema drift fixes
-- Applied: 2026-05-16
-- Strategy: NON-DESTRUCTIVE. Adds/backfills columns expected by current app code.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS: add missing values used by the current Prisma schema
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'CandidateStatus' AND e.enumlabel = 'EN_PROCESO_PERMISO') THEN
    ALTER TYPE "CandidateStatus" ADD VALUE 'EN_PROCESO_PERMISO';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'DocumentType' AND e.enumlabel = 'VISA') THEN
    ALTER TYPE "DocumentType" ADD VALUE 'VISA';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'DocumentType' AND e.enumlabel = 'ENTRY_STAMP') THEN
    ALTER TYPE "DocumentType" ADD VALUE 'ENTRY_STAMP';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'DocumentType' AND e.enumlabel = 'EXIT_STAMP') THEN
    ALTER TYPE "DocumentType" ADD VALUE 'EXIT_STAMP';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
                 WHERE t.typname = 'DocumentType' AND e.enumlabel = 'PAYMENT_RECEIPT') THEN
    ALTER TYPE "DocumentType" ADD VALUE 'PAYMENT_RECEIPT';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- LOGISTICSEVENT: current app expects description, not just legacy notes
-- ---------------------------------------------------------------------------

ALTER TABLE "LogisticsEvent" ADD COLUMN IF NOT EXISTS "description" TEXT;

UPDATE "LogisticsEvent"
SET "description" = COALESCE("description", "notes")
WHERE "description" IS NULL
  AND "notes" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- NOTIFICATION: current app expects title + nullable candidateId support
-- ---------------------------------------------------------------------------

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "title" TEXT;

UPDATE "Notification"
SET "title" = COALESCE(NULLIF("title", ''), NULLIF("type", ''), 'Notificacion')
WHERE "title" IS NULL
   OR "title" = '';

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Notification'
      AND column_name = 'title'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "Notification" ALTER COLUMN "title" SET NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Notification'
      AND column_name = 'candidateId'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "Notification" ALTER COLUMN "candidateId" DROP NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- AUDITLOG: current app expects entityType, legacy schema used entity
-- ---------------------------------------------------------------------------

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entityType" TEXT;

UPDATE "AuditLog"
SET "entityType" = COALESCE(NULLIF("entityType", ''), NULLIF("entity", ''), 'Unknown')
WHERE "entityType" IS NULL
   OR "entityType" = '';

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AuditLog'
      AND column_name = 'entityType'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "AuditLog" ALTER COLUMN "entityType" SET NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STATUSHISTORY: current app expects changedById, legacy schema used changedBy
-- ---------------------------------------------------------------------------

ALTER TABLE "StatusHistory" ADD COLUMN IF NOT EXISTS "changedById" TEXT;

UPDATE "StatusHistory"
SET "changedById" = COALESCE(NULLIF("changedById", ''), NULLIF("changedBy", ''), 'system')
WHERE "changedById" IS NULL
   OR "changedById" = '';

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'StatusHistory'
      AND column_name = 'changedById'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "StatusHistory" ALTER COLUMN "changedById" SET NOT NULL;
  END IF;
END $$;
