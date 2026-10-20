import { z } from "zod/v4";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import {
  buildCustomSession,
  buildDailySession,
  buildDrillsSession,
  buildFreePracticeSession,
  distributeDrillMix,
} from "@/lib/sessions/daily-builder";
import { getTopic } from "@/lib/exercises/topics";
import {
  emptyDrillCounts,
  sumDrillCounts,
  type DrillCounts,
} from "@/lib/sessions/drill-categories";
import { getAdaptiveDifficulty } from "@/lib/gamification/adaptive-difficulty";

const countField = z.number().int().min(0).max(50).optional();

const planItemSchema = z.object({
  topicId: z.string().min(1),
  count: z.number().int().min(1).max(50),
});

const buildSchema = z
  .object({
    profileId: z.string().min(1),
    language: z.enum(["de", "en"]),
    mode: z.enum(["daily", "free", "drills", "custom"]),
    topicId: z.string().optional(),
    /** Custom mode: AI-proposed list of (topic, count) slices. */
    plan: z.array(planItemSchema).min(1).max(3).optional(),
    /** Custom mode: explicit difficulty override from the AI plan (1-5). */
    difficulty: z.number().int().min(1).max(5).optional(),
    /** Custom mode: exercise types the student allowed (omitted = all). */
    exerciseTypes: z
      .array(
        z.enum([
          "multiple_choice",
          "fill_in_the_blank",
          "true_false",
          "reorder",
          "free_text",
        ]),
      )
      .min(1)
      .optional(),
    /** Custom mode: share of multiple-choice questions (0-100). */
    multipleChoicePercent: z.number().min(0).max(100).optional(),
    /** When set, ignore per-category counts and spread this total across all drill aspects. */
    mixTotal: z.number().int().min(1).max(50).optional(),
    /** Grammar drills: 0 = all fill-in, 100 = all multiple choice. */
    choicePercent: z.number().min(0).max(100).optional(),
    // Legacy aliases still accepted
    nounCount: countField,
    verbCount: countField,
    // Drill category counts
    pluralCount: countField,
    adjectiveCount: countField,
    prepositionCount: countField,
    relativeCount: countField,
    adverbialCount: countField,
    complementCount: countField,
    infinitiveCount: countField,
    extraCount: countField,
    /** Legacy alias for adverbialCount */
    subclauseCount: countField,
  })
  .refine((data) => data.mode !== "free" || !!data.topicId, {
    message: "topicId is required for free practice",
    path: ["topicId"],
  })
  .refine(
    (data) => {
      if (data.mode !== "custom") return true;
      if (!data.plan || data.plan.length === 0) return false;
      const total = data.plan.reduce((sum, item) => sum + item.count, 0);
      return total <= 50;
    },
    {
      message: "custom mode requires a plan of 1-3 topics with at most 50 exercises",
      path: ["plan"],
    },
  )
  .refine(
    (data) => {
      if (data.mode !== "drills") return true;
      if ((data.mixTotal ?? 0) > 0) return true;
      return sumDrillCounts(countsFromBody(data)) > 0;
    },
    {
      message:
        "drills mode requires mixTotal or at least one category count > 0",
      path: ["nounCount"],
    },
  );

function countsFromBody(data: {
  nounCount?: number;
  pluralCount?: number;
  verbCount?: number;
  adjectiveCount?: number;
  prepositionCount?: number;
  relativeCount?: number;
  adverbialCount?: number;
  complementCount?: number;
  infinitiveCount?: number;
  extraCount?: number;
  subclauseCount?: number;
}): DrillCounts {
  const counts = emptyDrillCounts();
  counts.nouns = data.nounCount ?? data.pluralCount ?? 0;
  counts.verbs = data.verbCount ?? 0;
  counts.adjectives = data.adjectiveCount ?? 0;
  counts.prepositions = data.prepositionCount ?? 0;
  counts.relative = data.relativeCount ?? 0;
  counts.adverbial = data.adverbialCount ?? data.subclauseCount ?? 0;
  counts.complement = data.complementCount ?? 0;
  counts.infinitive = data.infinitiveCount ?? 0;
  counts.extras = data.extraCount ?? 0;
  return counts;
}

function resolveDrillCounts(data: z.infer<typeof buildSchema>): DrillCounts {
  if ((data.mixTotal ?? 0) > 0) {
    return distributeDrillMix(data.mixTotal!);
  }
  return countsFromBody(data);
}

export async function POST(request: Request) {
  try {
    const data = await validateBody(request, buildSchema);
    if (isErrorResponse(data)) return data;

    if (data.mode === "custom") {
      const unknown = (data.plan ?? []).find((item) => !getTopic(item.topicId));
      if (unknown) {
        return errorResponse(
          ErrorCode.INVALID_INPUT,
          `Unknown topic in plan: ${unknown.topicId}`,
        );
      }
    }

    const adaptiveDifficulty = await getAdaptiveDifficulty(
      data.profileId,
      data.language,
    );
    const difficulty =
      data.mode === "custom" && data.difficulty
        ? data.difficulty
        : adaptiveDifficulty;

    const exercises =
      data.mode === "daily"
        ? await buildDailySession(data.language, difficulty, data.profileId)
        : data.mode === "free"
          ? await buildFreePracticeSession(
              data.topicId!,
              difficulty,
              data.profileId,
            )
          : data.mode === "custom"
            ? await buildCustomSession({
                plan: data.plan!,
                difficulty,
                profileId: data.profileId,
                exerciseTypes: data.exerciseTypes,
                multipleChoicePercent: data.multipleChoicePercent,
              })
            : await buildDrillsSession({
              language: data.language,
              counts: resolveDrillCounts(data),
              difficulty,
              profileId: data.profileId,
              choicePercent: data.choicePercent,
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
