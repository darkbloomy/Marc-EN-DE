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
  buildFreePracticeSession,
} from "@/lib/sessions/daily-builder";
import { getAdaptiveDifficulty } from "@/lib/gamification/adaptive-difficulty";

const buildSchema = z
  .object({
    profileId: z.string().min(1),
    language: z.enum(["de", "en"]),
    mode: z.enum(["daily", "free"]),
    topicId: z.string().optional(),
  })
  .refine((data) => data.mode !== "free" || !!data.topicId, {
    message: "topicId is required for free practice",
    path: ["topicId"],
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
        : await buildFreePracticeSession(data.topicId!, difficulty);

    return successResponse({ exercises, difficulty });
  } catch (error) {
    console.error("Session build error:", error);
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to build session"
    );
  }
}
