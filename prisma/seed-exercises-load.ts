import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const adapter = new PrismaLibSql({
  url,
  ...(authToken ? { authToken } : {}),
});
const prisma = new PrismaClient({ adapter });

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

const DATA_DIR = join(__dirname, "exercise-data");
const LANGUAGES = ["de", "en"] as const;

async function loadFile(language: string): Promise<ExerciseRow[]> {
  const path = join(DATA_DIR, `${language}.json`);
  if (!existsSync(path)) {
    console.log(`[seed-load:exercises] no file at ${path}, skipping`);
    return [];
  }
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as ExerciseRow[];
}

async function load(): Promise<void> {
  const all: ExerciseRow[] = [];
  for (const lang of LANGUAGES) {
    const rows = await loadFile(lang);
    all.push(...rows);
  }

  if (all.length === 0) {
    console.log("[seed-load:exercises] nothing to load");
    return;
  }

  console.log(`[seed-load:exercises] upserting ${all.length} exercises...`);
  for (const row of all) {
    await prisma.exercise.upsert({
      where: { id: row.id },
      update: {
        language: row.language,
        topic: row.topic,
        category: row.category,
        exerciseType: row.exerciseType,
        difficulty: row.difficulty,
        payload: row.payload,
        reviewStatus: row.reviewStatus,
        batchId: row.batchId,
        modelVersion: row.modelVersion,
      },
      create: {
        id: row.id,
        language: row.language,
        topic: row.topic,
        category: row.category,
        exerciseType: row.exerciseType,
        difficulty: row.difficulty,
        payload: row.payload,
        reviewStatus: row.reviewStatus,
        batchId: row.batchId,
        modelVersion: row.modelVersion,
        createdAt: new Date(row.createdAt),
      },
    });
  }

  // Per-(language, type) counts
  const grouped = await prisma.exercise.groupBy({
    by: ["language", "exerciseType"],
    _count: { _all: true },
  });
  console.log("[seed-load:exercises] DB counts after load:");
  for (const g of grouped.sort((a, b) =>
    `${a.language}/${a.exerciseType}`.localeCompare(`${b.language}/${b.exerciseType}`),
  )) {
    console.log(`  ${g.language} / ${g.exerciseType}: ${g._count._all}`);
  }
  const total = await prisma.exercise.count();
  console.log(`[seed-load:exercises] total: ${total}`);
}

load()
  .catch((err) => {
    console.error("[seed-load:exercises] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
