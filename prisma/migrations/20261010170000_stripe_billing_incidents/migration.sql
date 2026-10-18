CREATE TYPE "StripeBillingIncidentStatus" AS ENUM ('OPEN', 'RECOVERED');

CREATE TABLE "StripeBillingIncident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "status" "StripeBillingIncidentStatus" NOT NULL,
    "lastEventId" TEXT NOT NULL,
    "lastEventType" TEXT NOT NULL,
    "lastEventCreatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeBillingIncident_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StripeBillingIncident_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StripeBillingIncident_invoiceId_key"
  ON "StripeBillingIncident"("invoiceId");

CREATE INDEX "StripeBillingIncident_organizationId_status_lastEventCreatedAt_idx"
  ON "StripeBillingIncident"("organizationId", "status", "lastEventCreatedAt");
