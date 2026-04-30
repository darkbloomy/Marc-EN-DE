import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { getAIClient, AI_MODEL, MAX_TOKENS } from "../src/lib/ai";
import { ALL_TOPICS, getTopic, type Topic } from "../src/lib/exercises/topics";
import {
  EXERCISE_TYPES,
  type Exercise,
  type ExerciseType,
  type Language,
} from "../src/lib/exercises/types";
import { SYSTEM_PROMPT, buildGenerationPrompt } from "../src/lib/exercises/prompts";
import { parseExerciseResponse } from "../src/lib/exercises/generate";

interface CliOptions {
  language?: Language;
  topic?: string;
  type?: ExerciseType;
  difficulty?: number;
  model: string;
  append: boolean;
  throttleMs: number;
  defaultCount: number;
  variantCount: number; // count for free_text / reading-related buckets
}

interface ExerciseRow {
  id: string;
  language: Language;
  topic: string;
  category: string;
  exerciseType: ExerciseType;
  difficulty: number;
  payload: string; // JSON string of Exercise
  reviewStatus: string;
  batchId: string;
  modelVersion: string;
  createdAt: string;
}

const OUTPUT_DIR = join(__dirname, "exercise-data");
const VARIETY_TYPES: ExerciseType[] = ["free_text"];
const VARIETY_CATEGORIES = ["reading", "writing"] as const;

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    model: AI_MODEL,
    append: false,
    throttleMs: 13000,
    defaultCount: 5,
    variantCount: 15,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--language":
        if (next !== "de" && next !== "en") {
          throw new Error("--language must be 'de' or 'en'");
        }
        opts.language = next;
        i++;
        break;
      case "--topic":
        opts.topic = next;
        i++;
        break;
      case "--type":
        if (!EXERCISE_TYPES.includes(next as ExerciseType)) {
          throw new Error(`--type must be one of: ${EXERCISE_TYPES.join(", ")}`);
        }
        opts.type = next as ExerciseType;
        i++;
        break;
      case "--difficulty": {
        const d = Number(next);
        if (!Number.isInteger(d) || d < 1 || d > 5) {
          throw new Error("--difficulty must be an integer 1-5");
        }
        opts.difficulty = d;
        i++;
        break;
      }
      case "--model":
        opts.model = next;
        i++;
        break;
      case "--append":
        opts.append = true;
        break;
      case "--throttle-ms": {
        const t = Number(next);
        if (!Number.isFinite(t) || t < 0) {
          throw new Error("--throttle-ms must be a non-negative number");
        }
        opts.throttleMs = t;
        i++;
        break;
      }
      case "--count": {
        const c = Number(next);
        if (!Number.isInteger(c) || c < 1) {
          throw new Error("--count must be a positive integer");
        }
        opts.defaultCount = c;
        i++;
        break;
      }
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown flag: ${arg}`);
        }
    }
  }
  return opts;
}

function difficultyLevels(base: number): number[] {
  const lo = Math.max(1, base - 1);
  const hi = Math.min(5, base + 1);
  const levels: number[] = [];
  for (let d = lo; d <= hi; d++) levels.push(d);
  return levels;
}

function countFor(opts: CliOptions, topic: Topic, type: ExerciseType): number {
  if (
    VARIETY_TYPES.includes(type) ||
    VARIETY_CATEGORIES.includes(topic.category as (typeof VARIETY_CATEGORIES)[number])
  ) {
    return opts.variantCount;
  }
  return opts.defaultCount;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateBucket(
  topic: Topic,
  type: ExerciseType,
  difficulty: number,
  count: number,
  modelName: string,
  batchId: string,
): Promise<ExerciseRow[]> {
  const prompt = buildGenerationPrompt(topic, type, count, difficulty);
  const model = getAIClient().getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: MAX_TOKENS,
      responseMimeType: "application/json",
      temperature: 0.9,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error("No text response from AI");

  const exercises: Exercise[] = parseExerciseResponse(text, count);
  const now = new Date().toISOString();

  return exercises.map((exercise) => ({
    id: `${topic.id}_${type}_d${difficulty}_${randomUUID().slice(0, 8)}`,
    language: topic.language,
    topic: topic.id,
    category: topic.category,
    exerciseType: type,
    difficulty,
    payload: JSON.stringify(exercise),
    reviewStatus: "approved",
    batchId,
    modelVersion: modelName,
    createdAt: now,
  }));
}

async function loadExisting(language: Language): Promise<ExerciseRow[]> {
  const path = join(OUTPUT_DIR, `${language}.json`);
  if (!existsSync(path)) return [];
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as ExerciseRow[];
}

async function writeOutput(language: Language, rows: ExerciseRow[]): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const path = join(OUTPUT_DIR, `${language}.json`);
  await writeFile(path, JSON.stringify(rows, null, 2) + "\n", "utf8");
}

function selectTopics(opts: CliOptions): Topic[] {
  if (opts.topic) {
    const t = getTopic(opts.topic);
    if (!t) throw new Error(`Unknown topic: ${opts.topic}`);
    if (opts.language && t.language !== opts.language) {
      throw new Error(
        `Topic '${opts.topic}' belongs to language '${t.language}', conflicts with --language=${opts.language}`,
      );
    }
    return [t];
  }
  if (opts.language) {
    return ALL_TOPICS.filter((t) => t.language === opts.language);
  }
  return ALL_TOPICS;
}

function selectTypes(opts: CliOptions): ExerciseType[] {
  return opts.type ? [opts.type] : EXERCISE_TYPES;
}

function selectDifficulties(opts: CliOptions, topic: Topic): number[] {
  if (opts.difficulty !== undefined) return [opts.difficulty];
  return difficultyLevels(topic.difficulty);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const topics = selectTopics(opts);
  const types = selectTypes(opts);
  const batchId = randomUUID();

  const totalBuckets = topics.reduce(
    (sum, topic) => sum + types.length * selectDifficulties(opts, topic).length,
    0,
  );

  console.log(
    `[seed-exercises] batchId=${batchId} model=${opts.model} buckets=${totalBuckets} throttle=${opts.throttleMs}ms`,
  );

  const byLanguage = new Map<Language, ExerciseRow[]>();
  if (opts.append) {
    for (const lang of ["de", "en"] as Language[]) {
      byLanguage.set(lang, await loadExisting(lang));
    }
  } else {
    for (const lang of ["de", "en"] as Language[]) {
      byLanguage.set(lang, []);
    }
  }

  let bucketIdx = 0;
  for (const topic of topics) {
    for (const type of types) {
      for (const difficulty of selectDifficulties(opts, topic)) {
        bucketIdx++;
        const count = countFor(opts, topic, type);
        const label = `[${bucketIdx}/${totalBuckets}] ${topic.id} ${type} d${difficulty} count=${count}`;
        try {
          const rows = await generateBucket(
            topic,
            type,
            difficulty,
            count,
            opts.model,
            batchId,
          );
          const list = byLanguage.get(topic.language)!;
          list.push(...rows);
          console.log(`${label} ✓`);
        } catch (err) {
          console.error(`${label} ✗`, err);
        }
        if (bucketIdx < totalBuckets && opts.throttleMs > 0) {
          await sleep(opts.throttleMs);
        }
      }
    }
  }

  for (const [lang, rows] of byLanguage) {
    if (rows.length === 0 && !opts.append) continue;
    await writeOutput(lang, rows);
    console.log(`[seed-exercises] wrote ${rows.length} rows to exercise-data/${lang}.json`);
  }
}

main().catch((err) => {
  console.error("[seed-exercises] failed:", err);
  process.exit(1);
});
