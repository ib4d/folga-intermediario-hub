CREATE TYPE "StripeBillingReviewStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'CLOSED');

ALTER TABLE "StripeBillingReview"
  ADD COLUMN "reviewStatus" "StripeBillingReviewStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewNote" TEXT;
