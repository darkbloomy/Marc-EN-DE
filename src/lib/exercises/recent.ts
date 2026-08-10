import { prisma } from "@/lib/prisma";

export interface RecentExerciseKeys {
  poolIds: string[];
  contentHashes: string[];
  /** Short stems derived from recent questions for AI "avoid" hints (max ~15). */
  avoidStems: string[];
}

/**
 * Load recently seen exercise identities for a profile (default: last 7 days).
 * Used to exclude repeats from pool/AI generation.
 */
export async function getRecentExerciseKeys(
  profileId: string,
  opts?: { language?: string; days?: number; limit?: number },
): Promise<RecentExerciseKeys> {
  const days = opts?.days ?? 7;
  const limit = opts?.limit ?? 200;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.exerciseResult.findMany({
    where: {
      profileId,
      createdAt: { gte: since },
      ...(opts?.language ? { language: opts.language } : {}),
    },
    select: {
      exerciseId: true,
      contentHash: true,
      question: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const poolIds = [
    ...new Set(
      rows
        .map((r) => r.exerciseId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const contentHashes = [
    ...new Set(
      rows
        .map((r) => r.contentHash)
        .filter((h): h is string => typeof h === "string" && h.length > 0),
    ),
  ];
  const avoidStems = rows
    .map((r) => r.question)
    .filter(
      (q) =>
        typeof q === "string" &&
        q.length > 0 &&
        !["multiple_choice", "fill_in_the_blank", "true_false", "reorder", "free_text"].includes(
          q,
        ),
    )
    .slice(0, 15);

  return { poolIds, contentHashes, avoidStems };
}
