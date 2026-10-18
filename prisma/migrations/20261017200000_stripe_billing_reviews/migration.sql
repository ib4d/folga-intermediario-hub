CREATE TYPE "StripeBillingReviewKind" AS ENUM ('REFUND', 'DISPUTE', 'EARLY_FRAUD_WARNING');

CREATE TABLE "StripeBillingReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "StripeBillingReviewKind" NOT NULL,
    "providerObjectId" TEXT NOT NULL,
    "providerChargeId" TEXT,
    "resourceStatus" TEXT,
    "actionable" BOOLEAN,
    "actionDueAt" TIMESTAMP(3),
    "lastEventId" TEXT NOT NULL,
    "lastEventType" TEXT NOT NULL,
    "lastEventCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeBillingReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StripeBillingReview_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StripeBillingReview_providerObjectId_key"
  ON "StripeBillingReview"("providerObjectId");

CREATE INDEX "StripeBillingReview_organizationId_actionDueAt_lastEventCreatedAt_idx"
  ON "StripeBillingReview"("organizationId", "actionDueAt", "lastEventCreatedAt");
