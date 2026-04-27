import { getAnthropicClient, AI_MODEL, MAX_TOKENS } from "@/lib/ai";
import type {
  Exercise,
  ExerciseType,
  ExerciseBatch,
  GeneratedExercise,
  Language,
} from "./types";
import { getTopic, type Topic } from "./topics";
import { SYSTEM_PROMPT, buildGenerationPrompt } from "./prompts";
import { getFallbackExercises } from "./fallbacks";
import { getCached, setCache } from "./cache";

function parseExerciseResponse(
  text: string,
  count: number
): Exercise[] {
  // Strip markdown code fences if Claude adds them despite instructions
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

export async function generateExercises(options: {
  topicId: string;
  exerciseType: ExerciseType;
  count?: number;
}): Promise<ExerciseBatch> {
  const { topicId, exerciseType, count = 3 } = options;

  const topic = getTopic(topicId);
  if (!topic) {
    throw new Error(`Unknown topic: ${topicId}`);
  }

  // Check cache first
  const cacheKey = `${topicId}:${exerciseType}:${count}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const batch = await generateFromAI(topic, exerciseType, count);
    setCache(cacheKey, batch);
    return batch;
  } catch (error) {
    console.error("AI generation failed, using fallbacks:", error);
    return getFallbackBatch(topic, exerciseType, count);
  }
}

async function generateFromAI(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number
): Promise<ExerciseBatch> {
  const prompt = buildGenerationPrompt(topic, exerciseType, count);

  const response = await getAnthropicClient().messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  const exercises = parseExerciseResponse(textBlock.text, count);

  const generatedExercises: GeneratedExercise[] = exercises.map(
    (exercise) => ({
      exercise,
      language: topic.language,
      category: topic.category,
      topic: topic.id,
      difficulty: topic.difficulty,
    })
  );

  return {
    exercises: generatedExercises,
    language: topic.language,
    topic: topic.id,
    generatedAt: new Date().toISOString(),
    source: "ai",
  };
}

function getFallbackBatch(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number
): ExerciseBatch {
  const exercises = getFallbackExercises(
    topic.language,
    topic.id,
    exerciseType,
    count
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
