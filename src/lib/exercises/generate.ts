import { prisma } from "@/lib/prisma";
import type {
  Exercise,
  ExerciseType,
  ExerciseBatch,
  GeneratedExercise,
} from "./types";
import { getTopic, type Topic } from "./topics";
import { getFallbackExercises } from "./fallbacks";

function parseExerciseResponse(text: string, count: number): Exercise[] {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  if (count === 1) {
    return [parsed as Exercise];
  }
  if (!Array.isArray(parsed)) {
    return [parsed as Exercise];
  }
  return parsed as Exercise[];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface PoolRow {
  payload: string;
}

async function findFromPool(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number,
  difficulty?: number,
): Promise<{ rows: PoolRow[]; widened: boolean }> {
  const target = difficulty ?? topic.difficulty;
  const overfetch = count * 4;
  const base = {
    language: topic.language,
    topic: topic.id,
    exerciseType,
    reviewStatus: "approved",
  };

  // 1. Exact difficulty match
  const exact = await prisma.exercise.findMany({
    where: { ...base, difficulty: target },
    take: overfetch,
  });
  if (exact.length >= count) {
    return { rows: exact, widened: false };
  }

  // 2. Widen to ±1 difficulty
  const widened = await prisma.exercise.findMany({
    where: {
      ...base,
      difficulty: { in: [target - 1, target, target + 1].filter((d) => d >= 1 && d <= 5) },
    },
    take: overfetch,
  });
  if (widened.length >= count) {
    return { rows: widened, widened: true };
  }

  // 3. Drop difficulty filter entirely
  const any = await prisma.exercise.findMany({
    where: base,
    take: overfetch,
  });
  return { rows: any, widened: true };
}

export async function generateExercises(options: {
  topicId: string;
  exerciseType: ExerciseType;
  count?: number;
  difficulty?: number;
}): Promise<ExerciseBatch> {
  const { topicId, exerciseType, count = 3, difficulty } = options;

  const topic = getTopic(topicId);
  if (!topic) {
    throw new Error(`Unknown topic: ${topicId}`);
  }

  try {
    const { rows, widened } = await findFromPool(
      topic,
      exerciseType,
      count,
      difficulty,
    );
    if (rows.length === 0) {
      console.warn(
        `Exercise pool empty for ${topic.id}/${exerciseType}, using hardcoded fallback`,
      );
      return getFallbackBatch(topic, exerciseType, count);
    }
    if (widened) {
      console.info(
        `Exercise pool widened difficulty for ${topic.id}/${exerciseType} (target d${difficulty ?? topic.difficulty})`,
      );
    }

    const picked = shuffle(rows).slice(0, count);
    const exercises: Exercise[] = picked.map((row) => JSON.parse(row.payload) as Exercise);

    const generated: GeneratedExercise[] = exercises.map((exercise) => ({
      exercise,
      language: topic.language,
      category: topic.category,
      topic: topic.id,
      difficulty: difficulty ?? topic.difficulty,
    }));

    return {
      exercises: generated,
      language: topic.language,
      topic: topic.id,
      generatedAt: new Date().toISOString(),
      source: "db",
    };
  } catch (error) {
    console.error("Exercise pool query failed, using hardcoded fallback:", error);
    return getFallbackBatch(topic, exerciseType, count);
  }
}

function getFallbackBatch(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number,
): ExerciseBatch {
  const exercises = getFallbackExercises(
    topic.language,
    topic.id,
    exerciseType,
    count,
  );

  return {
    exercises: exercises.map((exercise) => ({
      exercise,
      language: topic.language,
      category: topic.category,
      topic: topic.id,
      difficulty: topic.difficulty,
    })),
    language: topic.language,
    topic: topic.id,
    generatedAt: new Date().toISOString(),
    source: "fallback",
  };
}

export { parseExerciseResponse };
