CREATE TABLE "PendingOrganizationSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "workspaceMode" TEXT NOT NULL DEFAULT 'standard',
    "language" TEXT NOT NULL DEFAULT 'es',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingOrganizationSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingOrganizationSignup_email_key" ON "PendingOrganizationSignup"("email");
CREATE UNIQUE INDEX "PendingOrganizationSignup_tokenHash_key" ON "PendingOrganizationSignup"("tokenHash");
CREATE INDEX "PendingOrganizationSignup_expiresAt_idx" ON "PendingOrganizationSignup"("expiresAt");
