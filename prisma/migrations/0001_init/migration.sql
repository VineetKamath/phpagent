-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DataMode" AS ENUM ('REAL', 'DEMO');

-- CreateTable
CREATE TABLE "CVE" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT,
    "cvss" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "modifiedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CVE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "modifiedAt" TIMESTAMP(3),
    "rawHash" TEXT NOT NULL,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "installationId" INTEGER,
    "dataMode" "DataMode" NOT NULL DEFAULT 'REAL',

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryAuthorization" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "policy" JSONB,
    "active" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RepositoryAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryMatch" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "current" TEXT NOT NULL,
    "target" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositoryMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patch" (
    "id" TEXT NOT NULL,
    "dataMode" "DataMode" NOT NULL,
    "cveId" TEXT NOT NULL,
    "cveIds" TEXT[],
    "repositoryId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "fromVersion" TEXT NOT NULL,
    "toVersion" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "stage" TEXT NOT NULL,
    "branch" TEXT,
    "prNumber" INTEGER,
    "prUrl" TEXT,
    "commitSha" TEXT,
    "ciPassed" INTEGER,
    "ciTotal" INTEGER,
    "ciUrl" TEXT,
    "disclosedAt" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3),
    "matchedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "testsPassedAt" TIMESTAMP(3),
    "prOpenedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatchAttempt" (
    "id" TEXT NOT NULL,
    "patchId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatchAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "passed" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "url" TEXT,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "patchId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "mergeSha" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "dataMode" "DataMode" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "cveId" TEXT,
    "repositoryId" TEXT,
    "patchId" TEXT,
    "metadata" JSONB NOT NULL,
    "verificationUrl" TEXT,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryTransaction" (
    "signature" TEXT NOT NULL,
    "dataMode" "DataMode" NOT NULL,
    "direction" TEXT NOT NULL,
    "lamports" BIGINT NOT NULL,
    "category" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryTransaction_pkey" PRIMARY KEY ("signature")
);

-- CreateTable
CREATE TABLE "ComputeExpense" (
    "id" TEXT NOT NULL,
    "dataMode" "DataMode" NOT NULL,
    "category" TEXT NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "evidenceUrl" TEXT,
    "txSignature" TEXT,

    CONSTRAINT "ComputeExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemHealth" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "detail" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "commitSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dataHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceRecord_provider_providerRecordId_rawHash_key" ON "SourceRecord"("provider", "providerRecordId", "rawHash");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryAuthorization_repositoryId_source_key" ON "RepositoryAuthorization"("repositoryId", "source");

-- CreateIndex
CREATE INDEX "Patch_repositoryId_branch_idx" ON "Patch"("repositoryId", "branch");

-- CreateIndex
CREATE INDEX "Patch_dataMode_detectedAt_idx" ON "Patch"("dataMode", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_patchId_key" ON "PullRequest"("patchId");

-- CreateIndex
CREATE INDEX "AgentEvent_dataMode_timestamp_idx" ON "AgentEvent"("dataMode", "timestamp");

-- CreateIndex
CREATE INDEX "SystemHealth_service_checkedAt_idx" ON "SystemHealth"("service", "checkedAt");

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "CVE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryAuthorization" ADD CONSTRAINT "RepositoryAuthorization_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryMatch" ADD CONSTRAINT "RepositoryMatch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryMatch" ADD CONSTRAINT "RepositoryMatch_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "CVE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "CVE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchAttempt" ADD CONSTRAINT "PatchAttempt_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PatchAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

