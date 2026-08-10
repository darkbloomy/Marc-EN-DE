import type {
  ExerciseType,
  GeneratedExercise,
  Language,
} from "@/lib/exercises/types";
import { getTopic, getTopicsByLanguage, type Topic } from "@/lib/exercises/topics";
import { generateExercises } from "@/lib/exercises/generate";

const DAILY_EXERCISE_COUNT = 15;
const TOPICS_PER_DAILY = 3;
const FREE_EXERCISE_COUNT = 10;

// Per-topic distribution for a daily session of 15 (3 topics × 5 each)
// Across the whole session: 4 MC, 4 fill, 3 T/F, 3 reorder, 1 free_text = 15
const DAILY_TYPE_PLAN: Record<ExerciseType, number>[] = [
  { multiple_choice: 2, fill_in_the_blank: 1, true_false: 1, reorder: 1, free_text: 0 },
  { multiple_choice: 1, fill_in_the_blank: 2, true_false: 1, reorder: 1, free_text: 0 },
  { multiple_choice: 1, fill_in_the_blank: 1, true_false: 1, reorder: 1, free_text: 1 },
];

// Free practice on a single topic: 10 exercises across all 5 types
const FREE_TYPE_PLAN: Record<ExerciseType, number> = {
  multiple_choice: 3,
  fill_in_the_blank: 2,
  true_false: 2,
  reorder: 2,
  free_text: 1,
};

export const DRILL_CATEGORY_KEYS = [
  "nouns",
  "verbs",
  "adjectives",
  "subclauses",
  "prepositions",
] as const;

export type DrillCategoryKey = (typeof DRILL_CATEGORY_KEYS)[number];

export interface DrillCounts {
  /** DE: nouns (Artikel+Plural); EN: plurals */
  nouns: number;
  verbs: number;
  adjectives: number;
  subclauses: number;
  prepositions: number;
}

function drillTopicMap(language: Language): Record<DrillCategoryKey, string> {
  if (language === "de") {
    return {
      nouns: "de_drill_nouns",
      verbs: "de_drill_verbs",
      adjectives: "de_drill_adjectives",
      subclauses: "de_drill_subclauses",
      prepositions: "de_drill_prepositions",
    };
  }
  return {
    nouns: "en_drill_plurals",
    verbs: "en_drill_verbs",
    adjectives: "en_drill_adjectives",
    subclauses: "en_drill_subclauses",
    prepositions: "en_drill_prepositions",
  };
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Spread `total` across all drill categories as evenly as possible,
 * with the remainder assigned to a random subset so mixes stay balanced
 * but not identical every time.
 */
export function distributeDrillMix(total: number): DrillCounts {
  const counts: DrillCounts = {
    nouns: 0,
    verbs: 0,
    adjectives: 0,
    subclauses: 0,
    prepositions: 0,
  };
  if (total <= 0) return counts;

  const cats = [...DRILL_CATEGORY_KEYS];
  const base = Math.floor(total / cats.length);
  let rem = total % cats.length;
  for (const c of cats) counts[c] = base;
  for (const c of shuffleArray(cats)) {
    if (rem <= 0) break;
    counts[c] += 1;
    rem -= 1;
  }
  return counts;
}

function pickTopics(language: Language, count: number): Topic[] {
  const topics = getTopicsByLanguage(language);
  return shuffleArray(topics).slice(0, count);
}

async function generateForPlan(
  topic: Topic,
  plan: Record<ExerciseType, number>,
  difficulty?: number,
  profileId?: string,
): Promise<GeneratedExercise[]> {
  const calls = (Object.entries(plan) as [ExerciseType, number][])
    .filter(([, count]) => count > 0)
    .map(([exerciseType, count]) =>
      generateExercises({
        topicId: topic.id,
        exerciseType,
        count,
        difficulty,
        profileId,
      }),
    );

  const batches = await Promise.all(calls);
  return batches.flatMap((b) => b.exercises);
}

export async function buildDailySession(
  language: Language,
  difficulty?: number,
  profileId?: string,
): Promise<GeneratedExercise[]> {
  const topics = pickTopics(language, TOPICS_PER_DAILY);

  const perTopic = await Promise.all(
    topics.map((topic, i) =>
      generateForPlan(topic, DAILY_TYPE_PLAN[i], difficulty, profileId),
    ),
  );

  return shuffleArray(perTopic.flat()).slice(0, DAILY_EXERCISE_COUNT);
}

export async function buildFreePracticeSession(
  topicId: string,
  difficulty?: number,
  profileId?: string,
): Promise<GeneratedExercise[]> {
  const topic = getTopic(topicId);
  if (!topic) {
    throw new Error(`Unknown topic: ${topicId}`);
  }

  const exercises = await generateForPlan(
    topic,
    FREE_TYPE_PLAN,
    difficulty,
    profileId,
  );
  return shuffleArray(exercises).slice(0, FREE_EXERCISE_COUNT);
}

export async function buildDrillsSession(opts: {
  language: Language;
  counts: DrillCounts;
  difficulty?: number;
  profileId?: string;
}): Promise<GeneratedExercise[]> {
  const topics = drillTopicMap(opts.language);
  const calls: Promise<{ exercises: GeneratedExercise[] }>[] = [];

  for (const key of DRILL_CATEGORY_KEYS) {
    const count = opts.counts[key] ?? 0;
    if (count <= 0) continue;
    calls.push(
      generateExercises({
        topicId: topics[key],
        exerciseType: "fill_in_the_blank",
        count,
        difficulty: opts.difficulty,
        profileId: opts.profileId,
        preferPool: true,
      }),
    );
  }

  if (calls.length === 0) return [];

  const batches = await Promise.all(calls);
  return shuffleArray(batches.flatMap((b) => b.exercises));
}
