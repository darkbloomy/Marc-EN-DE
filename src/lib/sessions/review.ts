import type {
  Exercise,
  ExerciseType,
  GeneratedExercise,
  Language,
  TopicCategory,
} from "@/lib/exercises/types";

const EXERCISE_TYPES = new Set<ExerciseType>([
  "multiple_choice",
  "fill_in_the_blank",
  "true_false",
  "reorder",
  "free_text",
]);

const CATEGORIES = new Set<TopicCategory>([
  "grammar",
  "spelling",
  "reading",
  "writing",
  "vocabulary",
]);

export interface StoredReviewResult {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
  question: string;
  correctAnswer: string;
  exercisePayload?: string | null;
  language: string;
  category: string;
  topic: string;
  source?: string | null;
}

export interface ReviewItem {
  result: {
    isCorrect: boolean;
    userAnswer: string;
    pointsEarned: number;
  };
  exercise: GeneratedExercise;
}

/** Rebuild a review card from a saved ExerciseResult. Falls back to the stored stem when the payload is missing or invalid. */
export function toReviewItem(row: StoredReviewResult): ReviewItem {
  const language: Language = row.language === "en" ? "en" : "de";
  const category: TopicCategory = CATEGORIES.has(row.category as TopicCategory)
    ? (row.category as TopicCategory)
    : "grammar";
  const parsed = parseExercise(row.exercisePayload);
  const source = parseSource(row.source);

  const exercise: GeneratedExercise = parsed
    ? {
        exercise: parsed,
        language,
        category,
        topic: row.topic,
        difficulty: 1,
        source,
      }
    : {
        exercise: {
          type: "free_text",
          prompt: row.question || "Question",
          sampleAnswer: row.correctAnswer,
          keyPoints: [],
          explanation: "",
        },
        language,
        category,
        topic: row.topic || "review",
        difficulty: 1,
        source,
      };

  return {
    result: {
      isCorrect: row.isCorrect,
      userAnswer: row.userAnswer,
      pointsEarned: row.pointsEarned,
    },
    exercise,
  };
}

function parseExercise(payload: string | null | undefined): Exercise | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Exercise;
    if (!parsed || typeof parsed !== "object" || !EXERCISE_TYPES.has(parsed.type)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseSource(
  source: string | null | undefined,
): "ai" | "db" | "fallback" | undefined {
  if (source === "ai" || source === "db" || source === "fallback") return source;
  return undefined;
}
