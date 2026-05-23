-- Legacy production databases may still have the old AuditLog.entity column
-- marked NOT NULL. Prisma writes entityType, not entity, so keeping the old
-- constraint can make critical actions succeed but fail during audit logging.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
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
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AuditLog'
      AND column_name = 'entity'
  ) THEN
    UPDATE "AuditLog"
    SET "entity" = COALESCE(NULLIF("entity", ''), "entityType", 'Unknown')
    WHERE "entity" IS NULL
       OR "entity" = '';
  END IF;
END $$;
