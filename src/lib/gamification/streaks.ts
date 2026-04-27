import { prisma } from "@/lib/prisma";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
}

export async function updateStreak(
  profileId: string,
  language: string
): Promise<StreakInfo> {
  const today = todayISO();
  const yesterday = yesterdayISO();

  const existing = await prisma.streak.findUnique({
    where: { profileId_language: { profileId, language } },
  });

  if (!existing) {
    // First time practicing this language
    const streak = await prisma.streak.create({
      data: {
        profileId,
        language,
        currentStreak: 1,
        longestStreak: 1,
        lastPracticeDate: today,
      },
    });
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastPracticeDate: streak.lastPracticeDate,
    };
  }

  // Already practiced today — no change
  if (existing.lastPracticeDate === today) {
    return {
      currentStreak: existing.currentStreak,
      longestStreak: existing.longestStreak,
      lastPracticeDate: existing.lastPracticeDate,
    };
  }

  let newCurrent: number;
  if (existing.lastPracticeDate === yesterday) {
    // Consecutive day — extend streak
    newCurrent = existing.currentStreak + 1;
  } else {
    // Streak broken — restart at 1
    newCurrent = 1;
  }

  const newLongest = Math.max(existing.longestStreak, newCurrent);

  const updated = await prisma.streak.update({
    where: { profileId_language: { profileId, language } },
    data: {
      currentStreak: newCurrent,
      longestStreak: newLongest,
      lastPracticeDate: today,
    },
  });

  return {
    currentStreak: updated.currentStreak,
    longestStreak: updated.longestStreak,
    lastPracticeDate: updated.lastPracticeDate,
  };
}

export async function getStreaks(profileId: string): Promise<StreakInfo[]> {
  const streaks = await prisma.streak.findMany({
    where: { profileId },
  });
  return streaks.map((s) => ({
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    lastPracticeDate: s.lastPracticeDate,
  }));
}

export function getBestStreak(streaks: StreakInfo[]): number {
  if (streaks.length === 0) return 0;
  return Math.max(...streaks.map((s) => s.currentStreak));
}
