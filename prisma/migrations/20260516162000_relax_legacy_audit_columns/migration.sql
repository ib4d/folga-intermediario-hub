-- =============================================================================
-- Production schema drift guard: legacy columns no longer written by Prisma
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AuditLog'
      AND column_name = 'entity'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "AuditLog" ALTER COLUMN "entity" DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'StatusHistory'
      AND column_name = 'changedBy'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "StatusHistory" ALTER COLUMN "changedBy" DROP NOT NULL;
  END IF;
END $$;
