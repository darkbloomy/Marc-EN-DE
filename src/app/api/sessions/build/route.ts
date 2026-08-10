import { z } from "zod/v4";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import {
  buildDailySession,
  buildDrillsSession,
  buildFreePracticeSession,
  distributeDrillMix,
  type DrillCounts,
} from "@/lib/sessions/daily-builder";
import { getAdaptiveDifficulty } from "@/lib/gamification/adaptive-difficulty";

const countField = z.number().int().min(0).max(50).optional();

const buildSchema = z
  .object({
    profileId: z.string().min(1),
    language: z.enum(["de", "en"]),
    mode: z.enum(["daily", "free", "drills"]),
    topicId: z.string().optional(),
    /** When set, ignore per-category counts and spread this total across all drill aspects. */
    mixTotal: z.number().int().min(1).max(50).optional(),
    // Legacy aliases still accepted
    nounCount: countField,
    verbCount: countField,
    // Drill category counts
    pluralCount: countField,
    adjectiveCount: countField,
    subclauseCount: countField,
    prepositionCount: countField,
  })
  .refine((data) => data.mode !== "free" || !!data.topicId, {
    message: "topicId is required for free practice",
    path: ["topicId"],
  })
  .refine(
    (data) => {
      if (data.mode !== "drills") return true;
      if ((data.mixTotal ?? 0) > 0) return true;
      const nouns = data.nounCount ?? data.pluralCount ?? 0;
      const verbs = data.verbCount ?? 0;
      const adjectives = data.adjectiveCount ?? 0;
      const subclauses = data.subclauseCount ?? 0;
      const prepositions = data.prepositionCount ?? 0;
      return nouns + verbs + adjectives + subclauses + prepositions > 0;
    },
    {
      message:
        "drills mode requires mixTotal or at least one category count > 0",
      path: ["nounCount"],
    },
  );

function resolveDrillCounts(data: z.infer<typeof buildSchema>): DrillCounts {
  if ((data.mixTotal ?? 0) > 0) {
    return distributeDrillMix(data.mixTotal!);
  }
  return {
    nouns: data.nounCount ?? data.pluralCount ?? 0,
    verbs: data.verbCount ?? 0,
    adjectives: data.adjectiveCount ?? 0,
    subclauses: data.subclauseCount ?? 0,
    prepositions: data.prepositionCount ?? 0,
  };
}

export async function POST(request: Request) {
  try {
    const data = await validateBody(request, buildSchema);
    if (isErrorResponse(data)) return data;

    const difficulty = await getAdaptiveDifficulty(
      data.profileId,
      data.language,
    );

    const exercises =
      data.mode === "daily"
        ? await buildDailySession(data.language, difficulty, data.profileId)
        : data.mode === "free"
          ? await buildFreePracticeSession(
              data.topicId!,
              difficulty,
              data.profileId,
            )
          : await buildDrillsSession({
              language: data.language,
              counts: resolveDrillCounts(data),
              difficulty,
              profileId: data.profileId,
            });

    return successResponse({ exercises, difficulty });
  } catch (error) {
    console.error("Session build error:", error);
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to build session",
    );
  }
}
