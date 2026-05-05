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
} from "@/lib/sessions/daily-builder";
import { getAdaptiveDifficulty } from "@/lib/gamification/adaptive-difficulty";

const buildSchema = z
  .object({
    profileId: z.string().min(1),
    language: z.enum(["de", "en"]),
    mode: z.enum(["daily", "free", "drills"]),
    topicId: z.string().optional(),
    nounCount: z.number().int().min(0).max(30).optional(),
    verbCount: z.number().int().min(0).max(30).optional(),
  })
  .refine((data) => data.mode !== "free" || !!data.topicId, {
    message: "topicId is required for free practice",
    path: ["topicId"],
  })
  .refine(
    (data) =>
      data.mode !== "drills" ||
      (data.nounCount ?? 0) + (data.verbCount ?? 0) > 0,
    {
      message: "drills mode requires at least one of nounCount/verbCount > 0",
      path: ["nounCount"],
    }
  )
  .refine((data) => data.mode !== "drills" || data.language === "de", {
    message: "drills mode is German only",
    path: ["language"],
  });

export async function POST(request: Request) {
  try {
    const data = await validateBody(request, buildSchema);
    if (isErrorResponse(data)) return data;

    const difficulty = await getAdaptiveDifficulty(
      data.profileId,
      data.language
    );

    const exercises =
      data.mode === "daily"
        ? await buildDailySession(data.language, difficulty)
        : data.mode === "free"
          ? await buildFreePracticeSession(data.topicId!, difficulty)
          : await buildDrillsSession({
              nounCount: data.nounCount ?? 0,
              verbCount: data.verbCount ?? 0,
              difficulty,
            });

    return successResponse({ exercises, difficulty });
  } catch (error) {
    console.error("Session build error:", error);
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to build session"
    );
  }
}
