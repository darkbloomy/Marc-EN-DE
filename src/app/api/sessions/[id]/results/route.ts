import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { NextRequest } from "next/server";

const exerciseResultSchema = z.object({
  language: z.string().min(1),
  category: z.string().min(1),
  topic: z.string().min(1),
  exerciseType: z.string().min(1),
  question: z.string().min(1),
  userAnswer: z.string(),
  correctAnswer: z.string().min(1),
  isCorrect: z.boolean(),
  pointsEarned: z.number().int().min(0),
  timeSpentSec: z.number().int().min(0).optional().default(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await validateBody(request, exerciseResultSchema);
    if (isErrorResponse(data)) return data;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return errorResponse(ErrorCode.NOT_FOUND, "Session not found");
    }

    const result = await prisma.exerciseResult.create({
      data: {
        sessionId: id,
        profileId: session.profileId,
        ...data,
      },
    });

    return successResponse(result, 201);
  } catch {
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to save exercise result"
    );
  }
}
