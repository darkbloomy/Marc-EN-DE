import type {
  ExerciseType,
  GeneratedExercise,
  Language,
} from "@/lib/exercises/types";
import { isDrillTopic } from "@/lib/exercises/types";
import { getTopic, getTopicsByLanguage, type Topic } from "@/lib/exercises/topics";
import { generateExercises } from "@/lib/exercises/generate";
import { answersOf, applyRandomDrillFormat } from "@/lib/exercises/drill-format";
import {
  DRILL_CATEGORY_KEYS,
  emptyDrillCounts,
  type DrillCategoryKey,
  type DrillCounts,
} from "@/lib/sessions/drill-categories";

export {
  DRILL_CATEGORY_KEYS,
  emptyDrillCounts,
  sumDrillCounts,
  type DrillCategoryKey,
  type DrillCounts,
} from "@/lib/sessions/drill-categories";

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

function drillTopicMap(language: Language): Record<DrillCategoryKey, string> {
  if (language === "de") {
    return {
      nouns: "de_drill_nouns",
      verbs: "de_drill_verbs",
      adjectives: "de_drill_adjectives",
      prepositions: "de_drill_prepositions",
      relative: "de_drill_relative",
      adverbial: "de_drill_adverbial",
      complement: "de_drill_complement",
      infinitive: "de_drill_infinitive",
      extras: "de_drill_extras",
    };
  }
  return {
    nouns: "en_drill_plurals",
    verbs: "en_drill_verbs",
    adjectives: "en_drill_adjectives",
    prepositions: "en_drill_prepositions",
    relative: "en_drill_relative",
    adverbial: "en_drill_adverbial",
    complement: "en_drill_complement",
    infinitive: "en_drill_infinitive",
    extras: "en_drill_extras",
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
  const counts = emptyDrillCounts();
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
  /** 0 = all fill-in, 100 = all multiple choice. Default 50. */
  choicePercent?: number;
}): Promise<GeneratedExercise[]> {
  const topics = drillTopicMap(opts.language);
  const calls: Promise<Awaited<ReturnType<typeof generateExercises>>>[] = [];

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
  const exercises = shuffleArray(batches.flatMap((b) => b.exercises));

  const bankByTopic: Record<string, string[]> = {};
  for (const batch of batches) {
    const extra =
      batch.distractorBank && batch.distractorBank.length > 0
        ? batch.distractorBank
        : batch.exercises.flatMap((e) => answersOf(e.exercise));
    bankByTopic[batch.topic] = [
      ...(bankByTopic[batch.topic] ?? []),
      ...extra,
    ];
  }

  return applyRandomDrillFormat(
    exercises,
    (item) => bankByTopic[item.topic] ?? [],
    Math.random,
    opts.choicePercent ?? 50,
  );
}

/**
 * One requested topic slice of a custom (AI-proposed) session.
 */
export interface CustomPlanItem {
  topicId: string;
  count: number;
}

/**
 * Build a session from an arbitrary plan of (topic, count) pairs proposed by
 * the AI tutor. Regular topics get a mixed-type distribution scaled to the
 * requested count; drill topics follow the pool-first fill-in drill path
 * (with random multiple-choice formatting).
 */
export async function buildCustomSession(opts: {
  plan: CustomPlanItem[];
  difficulty?: number;
  profileId?: string;
}): Promise<GeneratedExercise[]> {
  const batches: GeneratedExercise[][] = [];
  const bankByTopic: Record<string, string[]> = {};

  for (const item of opts.plan) {
    const { topicId, count } = item;
    if (count <= 0) continue;
    const topic = getTopic(topicId);
    if (!topic) throw new Error(`Unknown topic: ${topicId}`);

    if (isDrillTopic(topic.id)) {
      const batch = await generateExercises({
        topicId,
        exerciseType: "fill_in_the_blank",
        count,
        difficulty: opts.difficulty,
        profileId: opts.profileId,
        preferPool: true,
      });
      batches.push(batch.exercises);
      const extra =
        batch.distractorBank && batch.distractorBank.length > 0
          ? batch.distractorBank
          : batch.exercises.flatMap((e) => answersOf(e.exercise));
      bankByTopic[topic.id] = extra;
      continue;
    }

    const plan = scaleTypePlan(count);
    const generated = await generateForPlan(
      topic,
      plan,
      opts.difficulty,
      opts.profileId,
    );
    batches.push(generated);
  }

  const all = batches.flat();
  return applyRandomDrillFormat(
    all,
    (item) => bankByTopic[item.topic] ?? [],
    Math.random,
    50,
  );
}

/**
 * Distribute `count` across the five exercise types in the same proportions
 * as free practice (3 MC / 2 fill / 2 T-F / 2 reorder / 1 free), rounding
 * so the parts always sum to `count`.
 */
export function scaleTypePlan(count: number): Record<ExerciseType, number> {
  const weights: Record<ExerciseType, number> = {
    multiple_choice: 3,
    fill_in_the_blank: 2,
    true_false: 2,
    reorder: 2,
    free_text: 1,
  };
  const totalWeight = (Object.values(weights) as number[]).reduce(
    (a, b) => a + b,
    0,
  );

  const plan = {} as Record<ExerciseType, number>;
  let assigned = 0;
  const entries = (Object.entries(weights) as [ExerciseType, number][]);
  const fractional = entries.map(([type, w]) => {
    const exact = (w / totalWeight) * count;
    const base = Math.floor(exact);
    plan[type] = base;
    assigned += base;
    return { type, remainder: exact - base };
  });

  // Hand out the leftover seats to the largest fractional remainders.
  const byRemainder = [...fractional].sort((a, b) => b.remainder - a.remainder);
  let i = 0;
  while (assigned < count) {
    plan[byRemainder[i % byRemainder.length].type] += 1;
    assigned += 1;
    i += 1;
  }
  return plan;
}
