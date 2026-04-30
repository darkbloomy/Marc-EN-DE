/**
 * Compact-input wrapper for adding exercises to prisma/exercise-data/{de,en}.json.
 *
 * Reads a compact JSON array on stdin where each element is:
 *   { topic, exerciseType, difficulty, payload (object — NOT stringified) }
 *
 * Wraps each into a full ExerciseRow, auto-derives language/category/id, and
 * appends to the right language file. Idempotent loader runs handle dedupe.
 *
 * Usage:
 *   cat compact.json | tsx prisma/append-exercises.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ALL_TOPICS } from "../src/lib/exercises/topics";

const BATCH_ID = "claude-opus-bootstrap-2026-04-30";
const MODEL_VERSION = "claude-opus-4-7-direct";
const CREATED_AT = "2026-04-30T00:00:00.000Z";
const TYPE_CODE: Record<string, string> = {
  multiple_choice: "mc",
  fill_in_the_blank: "fb",
  true_false: "tf",
  reorder: "ro",
  free_text: "ft",
};
const DATA_DIR = join(__dirname, "exercise-data");

interface CompactRow {
  topic: string;
  exerciseType: string;
  difficulty: number;
  payload: object;
}
interface ExerciseRow {
  id: string;
  language: string;
  topic: string;
  category: string;
  exerciseType: string;
  difficulty: number;
  payload: string;
  reviewStatus: string;
  batchId: string;
  modelVersion: string;
  createdAt: string;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function loadFile(path: string): Promise<ExerciseRow[]> {
  if (!existsSync(path)) return [];
  return JSON.parse(await readFile(path, "utf8")) as ExerciseRow[];
}

async function main() {
  const raw = await readStdin();
  const compact = JSON.parse(raw) as CompactRow[];
  if (!Array.isArray(compact)) throw new Error("input must be a JSON array");

  // Build per-language buckets, count seq within (topic, type, difficulty)
  const counters = new Map<string, number>();
  const byLang = new Map<string, ExerciseRow[]>([
    ["de", []],
    ["en", []],
  ]);

  for (const row of compact) {
    const topic = ALL_TOPICS.find((t) => t.id === row.topic);
    if (!topic) throw new Error(`Unknown topic: ${row.topic}`);
    const code = TYPE_CODE[row.exerciseType];
    if (!code) throw new Error(`Unknown exerciseType: ${row.exerciseType}`);

    const key = `${row.topic}_${code}_d${row.difficulty}`;
    const seq = (counters.get(key) ?? 0) + 1;
    counters.set(key, seq);
    const id = `${row.topic.replace(/^(de_|en_)/, "")}_${code}_d${row.difficulty}_${String(seq).padStart(3, "0")}`;
    const fullId = `${topic.language}_${id}`;

    byLang.get(topic.language)!.push({
      id: fullId,
      language: topic.language,
      topic: row.topic,
      category: topic.category,
      exerciseType: row.exerciseType,
      difficulty: row.difficulty,
      payload: JSON.stringify(row.payload),
      reviewStatus: "approved",
      batchId: BATCH_ID,
      modelVersion: MODEL_VERSION,
      createdAt: CREATED_AT,
    });
  }

  await mkdir(DATA_DIR, { recursive: true });
  for (const [lang, newRows] of byLang) {
    if (newRows.length === 0) continue;
    const path = join(DATA_DIR, `${lang}.json`);
    const existing = await loadFile(path);
    // Dedupe by id (re-runnable if same compact input is fed twice)
    const merged = [...existing.filter((r) => !newRows.find((n) => n.id === r.id)), ...newRows];
    await writeFile(path, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`[append] ${lang}: +${newRows.length} (now ${merged.length} total)`);
  }
}

main().catch((err) => {
  console.error("[append] failed:", err);
  process.exit(1);
});
