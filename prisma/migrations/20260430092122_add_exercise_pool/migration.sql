-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "language" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "exerciseType" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
    "batchId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Exercise_language_topic_exerciseType_difficulty_reviewStatus_idx" ON "Exercise"("language", "topic", "exerciseType", "difficulty", "reviewStatus");

-- CreateIndex
CREATE INDEX "Exercise_batchId_idx" ON "Exercise"("batchId");
