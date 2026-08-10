import { getAnthropicClient, AI_MODEL, MAX_TOKENS } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import type {
  Exercise,
  ExerciseType,
  ExerciseBatch,
  GeneratedExercise,
} from "./types";
import { isDrillTopic } from "./types";
import { getTopic, type Topic } from "./topics";
import { SYSTEM_PROMPT, buildGenerationPrompt } from "./prompts";
import { getFallbackExercises } from "./fallbacks";
import { getCached, setCache } from "./cache";
import { hashExerciseContent } from "./content-hash";
import { getRecentExerciseKeys } from "./recent";

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
  id: string;
  payload: string;
}

function excludeWhere(excludePoolIds: string[]) {
  return excludePoolIds.length > 0
    ? { id: { notIn: excludePoolIds } }
    : {};
}

async function queryPool(
  base: Record<string, unknown>,
  take: number,
  excludePoolIds: string[],
): Promise<PoolRow[]> {
  return prisma.exercise.findMany({
    where: { ...base, ...excludeWhere(excludePoolIds) },
    select: { id: true, payload: true },
    take,
  });
}

async function findFromPool(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number,
  difficulty?: number,
  excludePoolIds: string[] = [],
): Promise<{ rows: PoolRow[]; widened: boolean }> {
  const target = difficulty ?? topic.difficulty;
  const overfetch = Math.max(count * 4, count + excludePoolIds.length);
  const base = {
    language: topic.language,
    topic: topic.id,
    exerciseType,
    reviewStatus: "approved",
  };

  async function attempt(ids: string[]): Promise<{
    rows: PoolRow[];
    widened: boolean;
  } | null> {
    const exact = await queryPool({ ...base, difficulty: target }, overfetch, ids);
    if (exact.length >= count) {
      return { rows: exact, widened: false };
    }

    const widened = await queryPool(
      {
        ...base,
        difficulty: {
          in: [target - 1, target, target + 1].filter((d) => d >= 1 && d <= 5),
        },
      },
      overfetch,
      ids,
    );
    if (widened.length >= count) {
      return { rows: widened, widened: true };
    }

    const any = await queryPool(base, overfetch, ids);
    if (any.length >= count) {
      return { rows: any, widened: true };
    }
    return null;
  }

  // Prefer unseen pool rows; if exhausted, fall back to full pool.
  const preferred = await attempt(excludePoolIds);
  if (preferred) return preferred;

  if (excludePoolIds.length > 0) {
    const fallback = await attempt([]);
    if (fallback) return fallback;
  }

  const any = await queryPool(base, overfetch, []);
  return { rows: any, widened: true };
}

function toGenerated(
  exercise: Exercise,
  topic: Topic,
  difficulty: number,
  source: "ai" | "db" | "fallback",
  poolId?: string,
): GeneratedExercise {
  return {
    exercise,
    language: topic.language,
    category: topic.category,
    topic: topic.id,
    difficulty,
    source,
    poolId,
    contentHash: hashExerciseContent(exercise),
  };
}

async function generateFromAI(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number,
  difficulty?: number,
  avoidStems?: string[],
  excludeHashes: string[] = [],
): Promise<ExerciseBatch> {
  const prompt = buildGenerationPrompt(
    topic,
    exerciseType,
    count,
    difficulty,
    avoidStems,
  );

  const response = await getAnthropicClient().messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  const text = textBlock.text;
  if (!text) {
    throw new Error("No text response from AI");
  }

  let exercises = parseExerciseResponse(text, count);
  const excludeSet = new Set(excludeHashes);
  const seenInBatch = new Set<string>();

  exercises = exercises.filter((ex) => {
    const h = hashExerciseContent(ex);
    if (excludeSet.has(h) || seenInBatch.has(h)) return false;
    seenInBatch.add(h);
    return true;
  });

  // One refill attempt if filtering removed too many
  if (exercises.length < count) {
    try {
      const refillPrompt = buildGenerationPrompt(
        topic,
        exerciseType,
        count - exercises.length,
        difficulty,
        [
          ...(avoidStems ?? []),
          ...exercises.map((e) =>
            e.type === "fill_in_the_blank"
              ? e.sentence
              : e.type === "multiple_choice"
                ? e.question
                : e.type === "true_false"
                  ? e.statement
                  : e.type === "reorder"
                    ? e.instruction
                    : e.prompt,
          ),
        ],
      );
      const refill = await getAnthropicClient().messages.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: refillPrompt }],
        temperature: 0.95,
      });
      const refillText = refill.content.find((b) => b.type === "text");
      if (refillText && refillText.type === "text" && refillText.text) {
        const more = parseExerciseResponse(
          refillText.text,
          count - exercises.length,
        );
        for (const ex of more) {
          const h = hashExerciseContent(ex);
          if (excludeSet.has(h) || seenInBatch.has(h)) continue;
          seenInBatch.add(h);
          exercises.push(ex);
          if (exercises.length >= count) break;
        }
      }
    } catch {
      // keep partial set
    }
  }

  const effectiveDifficulty = difficulty ?? topic.difficulty;
  const generated = exercises
    .slice(0, count)
    .map((exercise) =>
      toGenerated(exercise, topic, effectiveDifficulty, "ai"),
    );

  return {
    exercises: generated,
    language: topic.language,
    topic: topic.id,
    generatedAt: new Date().toISOString(),
    source: "ai",
  };
}

export async function generateExercises(options: {
  topicId: string;
  exerciseType: ExerciseType;
  count?: number;
  difficulty?: number;
  profileId?: string;
  preferPool?: boolean;
  excludePoolIds?: string[];
  excludeHashes?: string[];
  avoidStems?: string[];
}): Promise<ExerciseBatch> {
  const {
    topicId,
    exerciseType,
    count = 3,
    difficulty,
    profileId,
    preferPool: preferPoolOpt,
  } = options;

  const topic = getTopic(topicId);
  if (!topic) {
    throw new Error(`Unknown topic: ${topicId}`);
  }

  const preferPool = preferPoolOpt ?? isDrillTopic(topicId);

  let excludePoolIds = options.excludePoolIds ?? [];
  let excludeHashes = options.excludeHashes ?? [];
  let avoidStems = options.avoidStems ?? [];

  if (profileId && excludePoolIds.length === 0 && excludeHashes.length === 0) {
    try {
      const recent = await getRecentExerciseKeys(profileId, {
        language: topic.language,
      });
      excludePoolIds = recent.poolIds;
      excludeHashes = recent.contentHashes;
      avoidStems = recent.avoidStems;
    } catch (err) {
      console.warn(
        "Failed to load recent exercise keys:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const exclusionFingerprint = [
    ...excludePoolIds.slice(0, 20),
    ...excludeHashes.slice(0, 20),
  ]
    .sort()
    .join(",")
    .slice(0, 48);

  // Skip cache for pool-prefer (drills) so Practice Again gets a fresh shuffle
  const useCache = !preferPool;
  const cacheKey = `${topicId}:${exerciseType}:${count}:${difficulty ?? topic.difficulty}:${profileId ?? "anon"}:${exclusionFingerprint}`;

  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
  }

  if (preferPool) {
    const poolBatch = await getPoolOrFallbackBatch(
      topic,
      exerciseType,
      count,
      difficulty,
      excludePoolIds,
      excludeHashes,
      /* allowFallback */ false,
    );
    if (poolBatch && poolBatch.exercises.length >= count) {
      return poolBatch;
    }
    // Not enough curated rows — try AI, then hardcoded
    try {
      const aiBatch = await generateFromAI(
        topic,
        exerciseType,
        count,
        difficulty,
        avoidStems,
        excludeHashes,
      );
      if (aiBatch.exercises.length > 0) return aiBatch;
    } catch (aiError) {
      console.warn(
        `AI generation failed for drill ${topic.id}/${exerciseType}:`,
        aiError instanceof Error ? aiError.message : aiError,
      );
    }
    if (poolBatch && poolBatch.exercises.length > 0) return poolBatch;
    return getFallbackBatch(topic, exerciseType, count);
  }

  // Primary path: real-time AI generation
  try {
    const batch = await generateFromAI(
      topic,
      exerciseType,
      count,
      difficulty,
      avoidStems,
      excludeHashes,
    );
    if (useCache) setCache(cacheKey, batch);
    return batch;
  } catch (aiError) {
    console.warn(
      `AI generation failed for ${topic.id}/${exerciseType} (falling back to pool):`,
      aiError instanceof Error ? aiError.message : aiError,
    );
    const batch = await getPoolOrFallbackBatch(
      topic,
      exerciseType,
      count,
      difficulty,
      excludePoolIds,
      excludeHashes,
      true,
    );
    if (useCache && batch) setCache(cacheKey, batch);
    return batch ?? getFallbackBatch(topic, exerciseType, count);
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
    exercises: exercises.map((exercise) =>
      toGenerated(exercise, topic, topic.difficulty, "fallback"),
    ),
    language: topic.language,
    topic: topic.id,
    generatedAt: new Date().toISOString(),
    source: "fallback",
  };
}

async function getPoolOrFallbackBatch(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number,
  difficulty: number | undefined,
  excludePoolIds: string[],
  excludeHashes: string[],
  allowFallback: boolean,
): Promise<ExerciseBatch | null> {
  try {
    const { rows, widened } = await findFromPool(
      topic,
      exerciseType,
      count,
      difficulty,
      excludePoolIds,
    );
    if (rows.length === 0) {
      console.warn(
        `Exercise pool empty for ${topic.id}/${exerciseType}${allowFallback ? ", using hardcoded fallback" : ""}`,
      );
      return allowFallback
        ? getFallbackBatch(topic, exerciseType, count)
        : null;
    }
    if (widened) {
      console.info(
        `Exercise pool widened difficulty for ${topic.id}/${exerciseType} (target d${difficulty ?? topic.difficulty})`,
      );
    }

    const excludeHashSet = new Set(excludeHashes);
    const shuffled = shuffle(rows);
    const picked: PoolRow[] = [];
    const deferred: PoolRow[] = [];

    for (const row of shuffled) {
      try {
        const exercise = JSON.parse(row.payload) as Exercise;
        const h = hashExerciseContent(exercise);
        if (excludeHashSet.has(h) && picked.length + deferred.length < rows.length) {
          deferred.push(row);
          continue;
        }
        picked.push(row);
        if (picked.length >= count) break;
      } catch {
        continue;
      }
    }
    // Fill from deferred (recently seen) only if needed
    for (const row of deferred) {
      if (picked.length >= count) break;
      picked.push(row);
    }

    if (picked.length === 0) {
      return allowFallback
        ? getFallbackBatch(topic, exerciseType, count)
        : null;
    }

    const effectiveDifficulty = difficulty ?? topic.difficulty;
    const generated: GeneratedExercise[] = picked.slice(0, count).map((row) => {
      const exercise = JSON.parse(row.payload) as Exercise;
      return toGenerated(exercise, topic, effectiveDifficulty, "db", row.id);
    });

    return {
      exercises: generated,
      language: topic.language,
      topic: topic.id,
      generatedAt: new Date().toISOString(),
      source: "db",
    };
  } catch (error) {
    console.error("Exercise pool query failed, using hardcoded fallback:", error);
    return allowFallback
      ? getFallbackBatch(topic, exerciseType, count)
      : null;
  }
}

export { parseExerciseResponse };
