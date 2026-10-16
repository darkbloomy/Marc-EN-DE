export const DRILL_CATEGORY_KEYS = [
  "nouns",
  "verbs",
  "adjectives",
  "prepositions",
  "relative",
  "adverbial",
  "complement",
  "infinitive",
  "extras",
] as const;

export type DrillCategoryKey = (typeof DRILL_CATEGORY_KEYS)[number];

export type DrillCounts = Record<DrillCategoryKey, number>;

export function emptyDrillCounts(): DrillCounts {
  return {
    nouns: 0,
    verbs: 0,
    adjectives: 0,
    prepositions: 0,
    relative: 0,
    adverbial: 0,
    complement: 0,
    infinitive: 0,
    extras: 0,
  };
}

export function sumDrillCounts(counts: DrillCounts): number {
  return DRILL_CATEGORY_KEYS.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}
