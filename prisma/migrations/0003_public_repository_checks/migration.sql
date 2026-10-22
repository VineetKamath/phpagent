-- Read-only results submitted through /check. Kept separate from Patch so a
-- public inspection can never be presented as an authorized patch attempt.
CREATE TABLE "PublicRepositoryCheck" (
    "repository" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL,
    "scannedFiles" INTEGER NOT NULL,
    "changes" JSONB NOT NULL,
    "reviews" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicRepositoryCheck_pkey" PRIMARY KEY ("repository")
);

CREATE INDEX "PublicRepositoryCheck_checkedAt_idx" ON "PublicRepositoryCheck"("checkedAt");
