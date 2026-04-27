import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { NextRequest } from "next/server";
import { calculateLevel, getLevelTitle } from "@/lib/gamification/levels";
import { getStreaks, getBestStreak } from "@/lib/gamification/streaks";
import { getProfileAchievements } from "@/lib/gamification/achievements";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return errorResponse(ErrorCode.NOT_FOUND, "Profile not found");
    }

    const [totalPointsResult, streaks, achievements] = await Promise.all([
      prisma.exerciseResult.aggregate({
        where: { profileId: id },
        _sum: { pointsEarned: true },
      }),
      getStreaks(id),
      getProfileAchievements(id),
    ]);

    const totalPoints = totalPointsResult._sum.pointsEarned ?? 0;
    const levelInfo = calculateLevel(totalPoints);
    const levelTitle = getLevelTitle(levelInfo.level);
    const bestStreak = getBestStreak(streaks);

    return successResponse({
      level: levelInfo.level,
      totalPoints,
      pointsForNextLevel: levelInfo.pointsForNextLevel,
      progressInLevel: levelInfo.progressInLevel,
      levelTitle,
      bestStreak,
      streaks,
      achievements: achievements.map((pa) => ({
        key: pa.achievement.key,
        nameEN: pa.achievement.nameEN,
        nameDE: pa.achievement.nameDE,
        descriptionEN: pa.achievement.descriptionEN,
        descriptionDE: pa.achievement.descriptionDE,
        iconId: pa.achievement.iconId,
        category: pa.achievement.category,
        earnedAt: pa.earnedAt.toISOString(),
      })),
    });
  } catch {
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to fetch gamification data"
    );
  }
}
