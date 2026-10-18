CREATE TABLE "RequestRateLimitBucket" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestRateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RequestRateLimitBucket_resetAt_idx"
ON "RequestRateLimitBucket"("resetAt");
