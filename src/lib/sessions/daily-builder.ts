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

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickTopics(language: Language, count: number): Topic[] {
  const topics = getTopicsByLanguage(language);
  return shuffleArray(topics).slice(0, count);
}

async function generateForPlan(
  topic: Topic,
  plan: Record<ExerciseType, number>,
  difficulty?: number
): Promise<GeneratedExercise[]> {
  const calls = (Object.entries(plan) as [ExerciseType, number][])
    .filter(([, count]) => count > 0)
    .map(([exerciseType, count]) =>
      generateExercises({ topicId: topic.id, exerciseType, count, difficulty })
    );

  const batches = await Promise.all(calls);
  return batches.flatMap((b) => b.exercises);
}

export async function buildDailySession(
  language: Language,
  difficulty?: number
): Promise<GeneratedExercise[]> {
  const topics = pickTopics(language, TOPICS_PER_DAILY);

  const perTopic = await Promise.all(
    topics.map((topic, i) =>
      generateForPlan(topic, DAILY_TYPE_PLAN[i], difficulty)
    )
  );

  return shuffleArray(perTopic.flat()).slice(0, DAILY_EXERCISE_COUNT);
}

export async function buildFreePracticeSession(
  topicId: string,
  difficulty?: number
): Promise<GeneratedExercise[]> {
  const topic = getTopic(topicId);
  if (!topic) {
    throw new Error(`Unknown topic: ${topicId}`);
  }

  const exercises = await generateForPlan(topic, FREE_TYPE_PLAN, difficulty);
  return shuffleArray(exercises).slice(0, FREE_EXERCISE_COUNT);
}
