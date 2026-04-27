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
import { updateStreak } from "@/lib/gamification/streaks";
import {
  checkAndAwardAchievements,
  awardTimeBasedAchievements,
} from "@/lib/gamification/achievements";

const completeSessionSchema = z.object({
  totalPoints: z.number().int().min(0),
  exerciseCount: z.number().int().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await validateBody(request, completeSessionSchema);
    if (isErrorResponse(data)) return data;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return errorResponse(ErrorCode.NOT_FOUND, "Session not found");
    }
    if (session.completedAt) {
      return errorResponse(ErrorCode.CONFLICT, "Session already completed");
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        completedAt: new Date(),
        totalPoints: data.totalPoints,
        exerciseCount: data.exerciseCount,
      },
    });

    // Update streak and check achievements (fire-and-forget style, don't block response)
    const streakInfo = await updateStreak(session.profileId, session.language);
    const newAchievements = await checkAndAwardAchievements(session.profileId);
    const timeAchievements = await awardTimeBasedAchievements(
      session.profileId,
      new Date().getHours()
    );

    return successResponse({
      ...updated,
      streak: streakInfo,
      newAchievements: [...newAchievements, ...timeAchievements],
    });
  } catch {
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to complete session"
    );
  }
}
