-- AlterTable
ALTER TABLE "ExerciseResult" ADD COLUMN "exerciseId" TEXT;
ALTER TABLE "ExerciseResult" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "ExerciseResult_profileId_createdAt_idx" ON "ExerciseResult"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ExerciseResult_profileId_contentHash_idx" ON "ExerciseResult"("profileId", "contentHash");
