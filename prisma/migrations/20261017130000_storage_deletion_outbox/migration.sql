CREATE TABLE "StorageDeletionJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "objectPaths" JSONB NOT NULL,
    "storageConfigFingerprint" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StorageDeletionJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorageDeletionJob_due_idx"
    ON "StorageDeletionJob"("nextAttemptAt", "lockedAt");

CREATE INDEX "StorageDeletionJob_org_created_idx"
    ON "StorageDeletionJob"("organizationId", "createdAt");
