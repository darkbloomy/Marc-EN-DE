/**
 * Level system: each level requires progressively more points.
 * Level 1 starts at 0, level 2 at 100, level 3 at 250, etc.
 * Formula: threshold(n) = 50 * n * (n - 1) for n >= 1
 * This gives: 0, 100, 300, 600, 1000, 1500, 2100, 2800, ...
 */

const MAX_LEVEL = 50;

function levelThreshold(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * (level - 1);
}

export interface LevelInfo {
  level: number;
  totalPoints: number;
  pointsForCurrentLevel: number;
  pointsForNextLevel: number;
  progressInLevel: number; // 0-1 fraction
}

export function calculateLevel(totalPoints: number): LevelInfo {
  let level = 1;
  while (level < MAX_LEVEL && totalPoints >= levelThreshold(level + 1)) {
    level++;
  }

  const currentThreshold = levelThreshold(level);
  const nextThreshold = levelThreshold(level + 1);
  const pointsInLevel = totalPoints - currentThreshold;
  const pointsNeeded = nextThreshold - currentThreshold;

  return {
    level,
    totalPoints,
    pointsForCurrentLevel: currentThreshold,
    pointsForNextLevel: nextThreshold,
    progressInLevel: level >= MAX_LEVEL ? 1 : pointsInLevel / pointsNeeded,
  };
}

export function getLevelTitle(level: number): { de: string; en: string } {
  if (level >= 40) return { de: "Meister", en: "Master" };
  if (level >= 30) return { de: "Experte", en: "Expert" };
  if (level >= 20) return { de: "Fortgeschritten", en: "Advanced" };
  if (level >= 10) return { de: "Lerner", en: "Learner" };
  if (level >= 5) return { de: "Entdecker", en: "Explorer" };
  return { de: "Anfänger", en: "Beginner" };
}
