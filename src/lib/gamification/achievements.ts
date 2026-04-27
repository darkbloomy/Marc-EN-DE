import { prisma } from "@/lib/prisma";
import { calculateLevel } from "./levels";

interface AwardedAchievement {
  key: string;
  nameEN: string;
  nameDE: string;
  iconId: string;
}

export async function checkAndAwardAchievements(
  profileId: string
): Promise<AwardedAchievement[]> {
  const newlyAwarded: AwardedAchievement[] = [];

  // Fetch all achievements and which ones this profile already has
  const [allAchievements, existingAwards] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.profileAchievement.findMany({
      where: { profileId },
      select: { achievementId: true },
    }),
  ]);

  const earnedIds = new Set(existingAwards.map((a) => a.achievementId));
  const unearnedAchievements = allAchievements.filter(
    (a) => !earnedIds.has(a.id)
  );

  if (unearnedAchievements.length === 0) return [];

  // Gather profile stats needed for checking
  const [
    completedSessionCount,
    streaks,
    categoryCorrectCounts,
    totalPoints,
    distinctLanguages,
  ] = await Promise.all([
    prisma.session.count({
      where: { profileId, completedAt: { not: null } },
    }),
    prisma.streak.findMany({ where: { profileId } }),
    prisma.exerciseResult.groupBy({
      by: ["category"],
      where: { profileId, isCorrect: true },
      _count: { id: true },
    }),
    prisma.exerciseResult.aggregate({
      where: { profileId },
      _sum: { pointsEarned: true },
    }),
    prisma.session.findMany({
      where: { profileId, completedAt: { not: null } },
      select: { language: true },
      distinct: ["language"],
    }),
  ]);

  const bestCurrentStreak = streaks.length > 0
    ? Math.max(...streaks.map((s) => s.currentStreak))
    : 0;
  const bestLongestStreak = streaks.length > 0
    ? Math.max(...streaks.map((s) => s.longestStreak))
    : 0;
  const maxStreak = Math.max(bestCurrentStreak, bestLongestStreak);

  const categoryMap = new Map<string, number>();
  for (const c of categoryCorrectCounts) {
    categoryMap.set(c.category, c._count.id);
  }

  const points = totalPoints._sum.pointsEarned ?? 0;
  const levelInfo = calculateLevel(points);
  const langCount = distinctLanguages.length;

  // Check each unearned achievement
  for (const achievement of unearnedAchievements) {
    let earned = false;

    switch (achievement.category) {
      case "streak":
        earned = maxStreak >= achievement.threshold;
        break;

      case "milestone":
        switch (achievement.key) {
          case "first_session":
          case "ten_sessions":
          case "hundred_sessions":
            earned = completedSessionCount >= achievement.threshold;
            break;
          case "perfect_5":
            earned = await checkPerfectRun(profileId, achievement.threshold);
            break;
          case "both_languages":
            earned = langCount >= 2;
            break;
          case "level_5":
            earned = levelInfo.level >= achievement.threshold;
            break;
        }
        break;

      case "mastery": {
        const categoryKey = achievement.key.replace(/_star|_ace|_pro|_hero/, "");
        const count = categoryMap.get(categoryKey) ?? 0;
        earned = count >= achievement.threshold;
        break;
      }

      case "special":
        // Time-based achievements are checked at session completion time
        // They get awarded by the caller passing the current hour
        break;
    }

    if (earned) {
      await prisma.profileAchievement.create({
        data: { profileId, achievementId: achievement.id },
      });
      newlyAwarded.push({
        key: achievement.key,
        nameEN: achievement.nameEN,
        nameDE: achievement.nameDE,
        iconId: achievement.iconId,
      });
    }
  }

  return newlyAwarded;
}

export async function awardTimeBasedAchievements(
  profileId: string,
  hour: number
): Promise<AwardedAchievement[]> {
  const newlyAwarded: AwardedAchievement[] = [];

  const candidates: { key: string; condition: boolean }[] = [
    { key: "early_bird", condition: hour < 8 },
    { key: "night_owl", condition: hour >= 20 },
    {
      key: "weekend_warrior",
      condition: [0, 6].includes(new Date().getDay()),
    },
  ];

  for (const { key, condition } of candidates) {
    if (!condition) continue;

    const achievement = await prisma.achievement.findUnique({
      where: { key },
    });
    if (!achievement) continue;

    const existing = await prisma.profileAchievement.findUnique({
      where: {
        profileId_achievementId: {
          profileId,
          achievementId: achievement.id,
        },
      },
    });
    if (existing) continue;

    await prisma.profileAchievement.create({
      data: { profileId, achievementId: achievement.id },
    });
    newlyAwarded.push({
      key: achievement.key,
      nameEN: achievement.nameEN,
      nameDE: achievement.nameDE,
      iconId: achievement.iconId,
    });
  }

  return newlyAwarded;
}

async function checkPerfectRun(
  profileId: string,
  threshold: number
): Promise<boolean> {
  // Check if the last N results are all correct
  const recent = await prisma.exerciseResult.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: threshold,
    select: { isCorrect: true },
  });

  return recent.length >= threshold && recent.every((r) => r.isCorrect);
}

export async function getProfileAchievements(profileId: string) {
  return prisma.profileAchievement.findMany({
    where: { profileId },
    include: { achievement: true },
    orderBy: { earnedAt: "desc" },
  });
}
