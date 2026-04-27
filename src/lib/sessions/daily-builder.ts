import type {
  ExerciseType,
  GeneratedExercise,
  Language,
} from "@/lib/exercises/types";
import { getTopicsByLanguage, type Topic } from "@/lib/exercises/topics";
import { generateExercises } from "@/lib/exercises/generate";

const DAILY_EXERCISE_COUNT = 6;
const TOPICS_PER_SESSION = 3;

// Mix of exercise types for variety in a daily session
const DAILY_TYPE_MIX: ExerciseType[] = [
  "multiple_choice",
  "fill_in_the_blank",
  "true_false",
  "multiple_choice",
  "reorder",
  "fill_in_the_blank",
];

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

export async function buildDailySession(
  language: Language
): Promise<GeneratedExercise[]> {
  const topics = pickTopics(language, TOPICS_PER_SESSION);
  const exercisesPerTopic = Math.ceil(DAILY_EXERCISE_COUNT / topics.length);

  const allExercises: GeneratedExercise[] = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    // Pick exercise types for this topic's batch
    const startIdx = i * exercisesPerTopic;
    const typesForTopic = DAILY_TYPE_MIX.slice(
      startIdx,
      startIdx + exercisesPerTopic
    );

    // Generate one exercise per type (parallel per topic)
    const batches = await Promise.all(
      typesForTopic.map((exerciseType) =>
        generateExercises({
          topicId: topic.id,
          exerciseType,
          count: 1,
        })
      )
    );

    for (const batch of batches) {
      allExercises.push(...batch.exercises);
    }
  }

  // Shuffle to mix topics together
  return shuffleArray(allExercises).slice(0, DAILY_EXERCISE_COUNT);
}

export async function buildFreePracticeSession(
  topicId: string,
  exerciseTypes?: ExerciseType[]
): Promise<GeneratedExercise[]> {
  const types =
    exerciseTypes ??
    shuffleArray<ExerciseType>([
      "multiple_choice",
      "fill_in_the_blank",
      "true_false",
      "reorder",
    ]);

  const count = 5;
  const typesToUse = types.slice(0, count);

  const batches = await Promise.all(
    typesToUse.map((exerciseType) =>
      generateExercises({
        topicId,
        exerciseType,
        count: 1,
      })
    )
  );

  const exercises: GeneratedExercise[] = [];
  for (const batch of batches) {
    exercises.push(...batch.exercises);
  }

  return exercises;
}
