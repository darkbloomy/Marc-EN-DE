-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExerciseResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "exerciseType" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseResult_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExerciseResult" ("category", "correctAnswer", "createdAt", "exerciseType", "id", "isCorrect", "language", "pointsEarned", "profileId", "question", "sessionId", "timeSpentSec", "topic", "userAnswer") SELECT "category", "correctAnswer", "createdAt", "exerciseType", "id", "isCorrect", "language", "pointsEarned", "profileId", "question", "sessionId", "timeSpentSec", "topic", "userAnswer" FROM "ExerciseResult";
DROP TABLE "ExerciseResult";
ALTER TABLE "new_ExerciseResult" RENAME TO "ExerciseResult";
CREATE INDEX "ExerciseResult_profileId_language_topic_idx" ON "ExerciseResult"("profileId", "language", "topic");
CREATE INDEX "ExerciseResult_sessionId_idx" ON "ExerciseResult"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
