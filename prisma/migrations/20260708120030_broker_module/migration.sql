-- CreateEnum
CREATE TYPE "BrokerType" AS ENUM ('PROVIDER', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BrokerStatus" AS ENUM ('NEW', 'TESTING', 'ACTIVE', 'LOW_PERFORMANCE', 'PAUSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BrokerLeadType" AS ENUM ('PROVIDER', 'CANDIDATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BrokerContactChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "BrokerInvoiceStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'PAID', 'DISPUTED');

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalOrBillingName" TEXT,
    "country" TEXT,
    "city" TEXT,
    "primaryEmail" TEXT,
    "primaryPhone" TEXT,
    "declaredSupplyText" TEXT,
    "declaredWeeklyVolume" INTEGER,
    "brokerType" "BrokerType" NOT NULL DEFAULT 'UNKNOWN',
    "status" "BrokerStatus" NOT NULL DEFAULT 'NEW',
    "qualityRating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brokerId" TEXT,
    "sourceCountrySheet" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "sourceRowHash" TEXT NOT NULL,
    "leadDate" TIMESTAMP(3),
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "declaredSupplyText" TEXT,
    "rawStatus" TEXT,
    "normalizedStatus" TEXT,
    "flowStatus" TEXT,
    "flowSentDate" TIMESTAMP(3),
    "emailStatus" TEXT,
    "deliveryError" TEXT,
    "leadType" "BrokerLeadType" NOT NULL DEFAULT 'UNKNOWN',
    "lastReplyDate" TIMESTAMP(3),
    "assignedOwnerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerContactAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brokerLeadId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "channel" "BrokerContactChannel" NOT NULL DEFAULT 'OTHER',
    "contactDate" TIMESTAMP(3),
    "result" TEXT,
    "summary" TEXT,
    "nextStep" TEXT,
    "nextStepDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerContactAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerReferral" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "workerFullName" TEXT NOT NULL,
    "workerStatusRaw" TEXT,
    "cycleLengthDays" INTEGER,
    "hoursWorked" DECIMAL(10,2),
    "minimumHoursThreshold" INTEGER,
    "minimumHoursMet" BOOLEAN,
    "ratePerPersonPln" DECIMAL(10,2),
    "baseAmount" DECIMAL(10,2),
    "vatRate" DECIMAL(5,4),
    "finalAmount" DECIMAL(10,2),
    "notes" TEXT,
    "referencePeriodStart" TIMESTAMP(3),
    "referencePeriodEnd" TIMESTAMP(3),
    "sourceInvoiceSheet" TEXT,
    "sourceFileName" TEXT,
    "sourceRowHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "sourceInvoiceSheet" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "referencePeriodStart" TIMESTAMP(3),
    "referencePeriodEnd" TIMESTAMP(3),
    "invoiceType" TEXT,
    "ratePerPersonPln" DECIMAL(10,2),
    "minimumHoursThreshold" INTEGER,
    "candidateCountEligible" INTEGER NOT NULL DEFAULT 0,
    "baseTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,4),
    "vatAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "status" "BrokerInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "summaryBaseTotal" DECIMAL(12,2),
    "summaryVatAmount" DECIMAL(12,2),
    "summaryFinalAmount" DECIMAL(12,2),
    "summaryCandidateCount" INTEGER,
    "summaryMismatchWarning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerInvoiceLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brokerInvoiceId" TEXT NOT NULL,
    "workerReferralId" TEXT,
    "workerFullName" TEXT NOT NULL,
    "workerStatusRaw" TEXT,
    "cycleLengthDays" INTEGER,
    "hoursWorked" DECIMAL(10,2),
    "minimumHoursThreshold" INTEGER,
    "eligible" BOOLEAN,
    "rateApplied" DECIMAL(10,2),
    "baseAmount" DECIMAL(10,2),
    "vatRate" DECIMAL(5,4),
    "finalAmount" DECIMAL(10,2),
    "notes" TEXT,
    "sourceRowHash" TEXT NOT NULL,

    CONSTRAINT "BrokerInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Broker_organizationId_displayName_idx" ON "Broker"("organizationId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Broker_organizationId_displayName_key" ON "Broker"("organizationId", "displayName");

-- CreateIndex
CREATE INDEX "BrokerLead_organizationId_sourceCountrySheet_idx" ON "BrokerLead"("organizationId", "sourceCountrySheet");

-- CreateIndex
CREATE INDEX "BrokerLead_organizationId_leadType_idx" ON "BrokerLead"("organizationId", "leadType");

-- CreateIndex
CREATE INDEX "BrokerLead_organizationId_rawStatus_idx" ON "BrokerLead"("organizationId", "rawStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerLead_organizationId_sourceCountrySheet_sourceRowHash_key" ON "BrokerLead"("organizationId", "sourceCountrySheet", "sourceRowHash");

-- CreateIndex
CREATE INDEX "BrokerContactAttempt_organizationId_brokerLeadId_idx" ON "BrokerContactAttempt"("organizationId", "brokerLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerContactAttempt_brokerLeadId_attemptNo_key" ON "BrokerContactAttempt"("brokerLeadId", "attemptNo");

-- CreateIndex
CREATE INDEX "WorkerReferral_organizationId_brokerId_idx" ON "WorkerReferral"("organizationId", "brokerId");

-- CreateIndex
CREATE INDEX "WorkerReferral_organizationId_sourceInvoiceSheet_idx" ON "WorkerReferral"("organizationId", "sourceInvoiceSheet");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerReferral_organizationId_brokerId_workerFullName_sourc_key" ON "WorkerReferral"("organizationId", "brokerId", "workerFullName", "sourceInvoiceSheet", "referencePeriodStart", "referencePeriodEnd");

-- CreateIndex
CREATE INDEX "BrokerInvoice_organizationId_brokerId_idx" ON "BrokerInvoice"("organizationId", "brokerId");

-- CreateIndex
CREATE INDEX "BrokerInvoice_organizationId_status_idx" ON "BrokerInvoice"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerInvoice_organizationId_sourceInvoiceSheet_referencePe_key" ON "BrokerInvoice"("organizationId", "sourceInvoiceSheet", "referencePeriodStart", "referencePeriodEnd");

-- CreateIndex
CREATE INDEX "BrokerInvoiceLine_organizationId_brokerInvoiceId_idx" ON "BrokerInvoiceLine"("organizationId", "brokerInvoiceId");

-- CreateIndex
CREATE INDEX "BrokerInvoiceLine_brokerInvoiceId_workerFullName_idx" ON "BrokerInvoiceLine"("brokerInvoiceId", "workerFullName");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerInvoiceLine_brokerInvoiceId_sourceRowHash_key" ON "BrokerInvoiceLine"("brokerInvoiceId", "sourceRowHash");

-- AddForeignKey
ALTER TABLE "Broker" ADD CONSTRAINT "Broker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerLead" ADD CONSTRAINT "BrokerLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerLead" ADD CONSTRAINT "BrokerLead_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerLead" ADD CONSTRAINT "BrokerLead_assignedOwnerId_fkey" FOREIGN KEY ("assignedOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerContactAttempt" ADD CONSTRAINT "BrokerContactAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerContactAttempt" ADD CONSTRAINT "BrokerContactAttempt_brokerLeadId_fkey" FOREIGN KEY ("brokerLeadId") REFERENCES "BrokerLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerReferral" ADD CONSTRAINT "WorkerReferral_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerReferral" ADD CONSTRAINT "WorkerReferral_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerInvoice" ADD CONSTRAINT "BrokerInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerInvoice" ADD CONSTRAINT "BrokerInvoice_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerInvoiceLine" ADD CONSTRAINT "BrokerInvoiceLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerInvoiceLine" ADD CONSTRAINT "BrokerInvoiceLine_brokerInvoiceId_fkey" FOREIGN KEY ("brokerInvoiceId") REFERENCES "BrokerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerInvoiceLine" ADD CONSTRAINT "BrokerInvoiceLine_workerReferralId_fkey" FOREIGN KEY ("workerReferralId") REFERENCES "WorkerReferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

