-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'INTERMEDIARIO', 'LEGAL');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('RECOPILANDO_DOCS', 'EN_REVISION', 'DOCUMENTACION_PENDIENTE', 'APROBADO', 'RECHAZADO', 'CONTRATADO', 'RETIRADO');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('EN_ORIGEN', 'EN_TRANSITO', 'EN_POLONIA');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'KARTA_POBYTU', 'PESEL', 'DECYZJA_WOJEWODY', 'CV', 'OTHER');

-- CreateEnum
CREATE TYPE "RecruitmentSource" AS ENUM ('WHATSAPP', 'EMAIL', 'REFERRAL', 'GOOGLE_ADS', 'WEBSITE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'INTERMEDIARIO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "birthPlace" TEXT,
    "birthCountry" TEXT,
    "citizenship" TEXT,
    "nationality" TEXT,
    "heightCm" INTEGER,
    "country" TEXT NOT NULL DEFAULT 'COL',
    "locationStatus" "LocationStatus" NOT NULL DEFAULT 'EN_ORIGEN',
    "polishAddress" TEXT,
    "polishCity" TEXT,
    "passportNumber" TEXT,
    "passportIssueDate" TIMESTAMP(3),
    "passportExpiry" TIMESTAMP(3),
    "passportBiometric" BOOLEAN,
    "kartaPobytuNumber" TEXT,
    "kartaPobytuIssueDate" TIMESTAMP(3),
    "kartaPobytuExpiry" TIMESTAMP(3),
    "kartaPobytuType" TEXT,
    "peselNumber" TEXT,
    "voivodatoNumber" TEXT,
    "voivodatoIssueDate" TIMESTAMP(3),
    "voivodatoExpiry" TIMESTAMP(3),
    "voivodatoStatus" TEXT,
    "recruitmentSource" "RecruitmentSource",
    "recruiterId" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "accommodation" TEXT,
    "accommodationNotes" TEXT,
    "arrivalNotes" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'RECOPILANDO_DOCS',
    "rejectionReason" TEXT,
    "notes" TEXT,
    "paid400pln" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" TIMESTAMP(3),
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentDate" TIMESTAMP(3),
    "intermediaryId" TEXT NOT NULL,
    "selfRegistered" BOOLEAN NOT NULL DEFAULT false,
    "registrationToken" TEXT,
    "ocrProcessed" BOOLEAN NOT NULL DEFAULT false,
    "ocrSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "number" TEXT,
    "issuerCountry" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "extractedData" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "ocrStatus" TEXT,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fromStatus" "CandidateStatus" NOT NULL,
    "toStatus" "CandidateStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsEvent" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_registrationToken_key" ON "Candidate"("registrationToken");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsEvent" ADD CONSTRAINT "LogisticsEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
