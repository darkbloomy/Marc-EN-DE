import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { NextRequest } from "next/server";

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalSessions,
      completedSessions,
      recentSessions,
      accuracyByLanguage,
      accuracyByCategory,
      topicPerformance,
      totalExercises,
      correctExercises,
      dailyActivity,
    ] = await Promise.all([
      // Total session count
      prisma.session.count({ where: { profileId: id } }),

      // Completed session count
      prisma.session.count({
        where: { profileId: id, completedAt: { not: null } },
      }),

      // Recent sessions (last 10)
      prisma.session.findMany({
        where: { profileId: id, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: {
          id: true,
          language: true,
          mode: true,
          completedAt: true,
          totalPoints: true,
          exerciseCount: true,
        },
      }),

      // Accuracy by language
      prisma.exerciseResult.groupBy({
        by: ["language"],
        where: { profileId: id },
        _count: { id: true },
        _sum: { pointsEarned: true },
      }),

      // Accuracy by category
      prisma.exerciseResult.groupBy({
        by: ["category"],
        where: { profileId: id },
        _count: { id: true },
      }),

      // Topic performance
      prisma.exerciseResult.groupBy({
        by: ["topic", "language", "category"],
        where: { profileId: id },
        _count: { id: true },
      }),

      // Total exercises attempted
      prisma.exerciseResult.count({ where: { profileId: id } }),

      // Total correct
      prisma.exerciseResult.count({
        where: { profileId: id, isCorrect: true },
      }),

      // Daily activity (sessions per day, last 30 days)
      prisma.session.findMany({
        where: {
          profileId: id,
          completedAt: { not: null, gte: thirtyDaysAgo },
        },
        select: { completedAt: true, totalPoints: true },
        orderBy: { completedAt: "asc" },
      }),
    ]);

    // Build correct counts per language
    const correctByLanguage = await prisma.exerciseResult.groupBy({
      by: ["language"],
      where: { profileId: id, isCorrect: true },
      _count: { id: true },
    });

    const correctByCategory = await prisma.exerciseResult.groupBy({
      by: ["category"],
      where: { profileId: id, isCorrect: true },
      _count: { id: true },
    });

    const correctByTopic = await prisma.exerciseResult.groupBy({
      by: ["topic"],
      where: { profileId: id, isCorrect: true },
      _count: { id: true },
    });

    // Compute language stats
    const correctLangMap = new Map(
      correctByLanguage.map((c) => [c.language, c._count.id])
    );
    const languageStats = accuracyByLanguage.map((l) => ({
      language: l.language,
      total: l._count.id,
      correct: correctLangMap.get(l.language) ?? 0,
      accuracy:
        l._count.id > 0
          ? Math.round(
              ((correctLangMap.get(l.language) ?? 0) / l._count.id) * 100
            )
          : 0,
      totalPoints: l._sum.pointsEarned ?? 0,
    }));

    // Compute category stats
    const correctCatMap = new Map(
      correctByCategory.map((c) => [c.category, c._count.id])
    );
    const categoryStats = accuracyByCategory.map((c) => ({
      category: c.category,
      total: c._count.id,
      correct: correctCatMap.get(c.category) ?? 0,
      accuracy:
        c._count.id > 0
          ? Math.round(
              ((correctCatMap.get(c.category) ?? 0) / c._count.id) * 100
            )
          : 0,
    }));

    // Compute topic stats
    const correctTopicMap = new Map(
      correctByTopic.map((c) => [c.topic, c._count.id])
    );
    const topicStats = topicPerformance.map((t) => ({
      topic: t.topic,
      language: t.language,
      category: t.category,
      total: t._count.id,
      correct: correctTopicMap.get(t.topic) ?? 0,
      accuracy:
        t._count.id > 0
          ? Math.round(
              ((correctTopicMap.get(t.topic) ?? 0) / t._count.id) * 100
            )
          : 0,
    }));

    // Build activity heatmap (date → session count + points)
    const activityMap = new Map<string, { count: number; points: number }>();
    for (const session of dailyActivity) {
      if (!session.completedAt) continue;
      const dateKey = session.completedAt.toISOString().split("T")[0];
      const existing = activityMap.get(dateKey) ?? { count: 0, points: 0 };
      existing.count++;
      existing.points += session.totalPoints;
      activityMap.set(dateKey, existing);
    }

    const activityHeatmap = Array.from(activityMap.entries()).map(
      ([date, data]) => ({
        date,
        sessions: data.count,
        points: data.points,
      })
    );

    const overallAccuracy =
      totalExercises > 0
        ? Math.round((correctExercises / totalExercises) * 100)
        : 0;

    return successResponse({
      totalSessions,
      completedSessions,
      totalExercises,
      correctExercises,
      overallAccuracy,
      languageStats,
      categoryStats,
      topicStats,
      recentSessions: recentSessions.map((s) => ({
        ...s,
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
      activityHeatmap,
    });
  } catch {
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to fetch progress data"
    );
  }
}
