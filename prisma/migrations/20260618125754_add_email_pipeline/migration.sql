-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "complianceReason" TEXT,
ADD COLUMN     "emailBody" TEXT,
ADD COLUMN     "emailStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "emailSubject" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ConsentLedger" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "relevanceReason" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressionList" (
    "id" TEXT NOT NULL,
    "emailOrDomain" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressionList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionList_emailOrDomain_key" ON "SuppressionList"("emailOrDomain");
