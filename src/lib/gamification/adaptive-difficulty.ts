import { prisma } from "@/lib/prisma";
import type { Language } from "@/lib/exercises/types";

const RECENT_RESULT_WINDOW = 30;
const MIN_RESULTS_FOR_ADAPTATION = 10;
const DEFAULT_DIFFICULTY = 3;

export async function getAdaptiveDifficulty(
  profileId: string,
  language: Language
): Promise<number> {
  const recent = await prisma.exerciseResult.findMany({
    where: {
      profileId,
      language,
      // free_text is self-graded (always isCorrect=true), so it would inflate accuracy
      exerciseType: { not: "free_text" },
    },
    orderBy: { createdAt: "desc" },
    take: RECENT_RESULT_WINDOW,
    select: { isCorrect: true },
  });

  if (recent.length < MIN_RESULTS_FOR_ADAPTATION) {
    return DEFAULT_DIFFICULTY;
  }

  const correct = recent.filter((r) => r.isCorrect).length;
  const accuracy = correct / recent.length;

  if (accuracy >= 0.9) return 5;
  if (accuracy >= 0.75) return 4;
  if (accuracy >= 0.55) return 3;
  if (accuracy >= 0.4) return 2;
  return 1;
}
