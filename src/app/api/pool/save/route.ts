import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { getPrimaryModel } from "@/lib/ai";
import { getTopic } from "@/lib/exercises/topics";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import type { Exercise, ExerciseType } from "@/lib/exercises/types";

const EXERCISE_TYPES: ExerciseType[] = [
  "multiple_choice",
  "fill_in_the_blank",
  "true_false",
  "reorder",
  "free_text",
];

const saveSchema = z.object({
  batchId: z.string().min(1).max(100),
  exercises: z
    .array(
      z.object({
        payload: z.record(z.string(), z.unknown()),
        language: z.enum(["de", "en"]),
        topic: z.string().min(1),
        category: z.string().min(1),
        exerciseType: z.string().min(1),
        difficulty: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(50),
});

/**
 * Save AI-built exercises into the pool as drafts. Idempotent per batchId:
 * re-sending the same batch (e.g. double-tap) is a no-op.
 */
export async function POST(request: Request) {
  const data = await validateBody(request, saveSchema);
  if (isErrorResponse(data)) return data;

  try {
    const existing = await prisma.exercise.count({
      where: { batchId: data.batchId },
    });
    if (existing > 0) {
      return successResponse({ saved: false, reason: "already-saved", count: 0 });
    }

    let saved = 0;
    for (const item of data.exercises) {
      const topic = getTopic(item.topic);
      if (!topic) continue;
      if (!EXERCISE_TYPES.includes(item.exerciseType as ExerciseType)) continue;
      if (topic.language !== item.language) continue;
      const payload = item.payload as unknown as Exercise;
      // Basic shape check: the exercise must declare a matching type
      if ((payload as { type?: string }).type !== item.exerciseType) continue;

      await prisma.exercise.create({
        data: {
          language: item.language,
          topic: item.topic,
          category: item.category,
          exerciseType: item.exerciseType,
          difficulty: item.difficulty,
          payload: JSON.stringify(payload),
          reviewStatus: "draft",
          batchId: data.batchId,
          modelVersion: getPrimaryModel(),
        },
      });
      saved += 1;
    }

    if (saved === 0) {
      return errorResponse(ErrorCode.INVALID_INPUT, "No valid exercises to save");
    }
    return successResponse({ saved: true, count: saved }, 201);
  } catch (error) {
    console.error("Pool save error:", error);
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to save to pool");
  }
}
