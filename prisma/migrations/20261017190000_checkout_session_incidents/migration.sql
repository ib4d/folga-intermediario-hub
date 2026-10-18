ALTER TABLE "StripeBillingIncident"
  ALTER COLUMN "invoiceId" DROP NOT NULL;

ALTER TABLE "StripeBillingIncident"
  ADD COLUMN "checkoutSessionId" TEXT;

CREATE UNIQUE INDEX "StripeBillingIncident_checkoutSessionId_key"
  ON "StripeBillingIncident"("checkoutSessionId");
