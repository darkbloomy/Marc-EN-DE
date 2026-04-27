import { z } from "zod/v4";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { generateExercises } from "@/lib/exercises/generate";
import { getTopic } from "@/lib/exercises";
import type { ExerciseType } from "@/lib/exercises/types";

const VALID_EXERCISE_TYPES = [
  "multiple_choice",
  "fill_in_the_blank",
  "true_false",
  "reorder",
  "free_text",
] as const;

const generateSchema = z.object({
  topicId: z.string().min(1, "topicId is required"),
  exerciseType: z.enum(VALID_EXERCISE_TYPES),
  count: z.number().int().min(1).max(10).optional().default(3),
});

export async function POST(request: Request) {
  try {
    const data = await validateBody(request, generateSchema);
    if (isErrorResponse(data)) return data;

    const topic = getTopic(data.topicId);
    if (!topic) {
      return errorResponse(
        ErrorCode.NOT_FOUND,
        `Topic not found: ${data.topicId}`
      );
    }

    const batch = await generateExercises({
      topicId: data.topicId,
      exerciseType: data.exerciseType,
      count: data.count,
    });

    return successResponse(batch);
  } catch (error) {
    console.error("Exercise generation error:", error);
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to generate exercises"
    );
  }
}
