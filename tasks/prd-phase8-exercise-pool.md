# PRD Phase 8: Pre-Generated Exercise Pool

## Context

Production keeps logging `AI generation failed, using fallbacks: ... 429 Too Many Requests` from Gemini's free tier (5 req/min). [src/lib/sessions/daily-builder.ts](../src/lib/sessions/daily-builder.ts) fans out 6+ parallel AI calls per session (3 topics × 2-3 types each), so a single practice session can blow the per-minute quota in one shot. The user gets generic fallback exercises silently.

Since this is a single-child curriculum app (German + English, 5. Klasse) where the topics are stable and traffic is tiny, real-time AI generation is the wrong shape. The fix is to pre-generate a curated pool of exercises once (with whatever quality model we want, locally) and serve them from the database at runtime. This eliminates the 429 failure mode entirely, removes runtime AI latency, removes the need for `GEMINI_API_KEY` in production, and lets us review every exercise before it ships.

Approach: schema with `Exercise` table including `reviewStatus` and `batchId`; seed script generates JSON committed to repo; seed runner loads JSON to DB; `generate.ts` swaps to a DB query. Manual refresh only — no cron yet.

---

## Architecture

```
prisma/seed-exercises.ts         (NEW — script: AI → JSON files, run locally)
prisma/exercise-data/*.json      (NEW — committed pool, one file per language)
prisma/seed-exercises-load.ts    (NEW — loads JSON into DB, runs at deploy)
prisma/schema.prisma             (MODIFIED — add Exercise model)
src/lib/exercises/generate.ts    (MODIFIED — query DB instead of calling AI)
src/lib/exercises/fallbacks.ts   (KEPT — last-resort safety net if DB is empty)
src/lib/ai.ts                    (KEPT — used only by seed script)
package.json                     (MODIFIED — add seed:exercises + seed:load:exercises scripts)
```

Key invariant: `generateExercises({ topicId, exerciseType, count, difficulty })` keeps its exact signature. [src/lib/sessions/daily-builder.ts](../src/lib/sessions/daily-builder.ts) doesn't change.

---

## Steps

### 1. Schema migration

Add to [prisma/schema.prisma](../prisma/schema.prisma):

```prisma
model Exercise {
  id           String   @id @default(cuid())
  language     String   // "de" | "en"
  topic        String   // matches Topic.id from src/lib/exercises/topics.ts
  category     String   // grammar | spelling | reading | writing | vocabulary
  exerciseType String   // multiple_choice | fill_in_the_blank | true_false | reorder | free_text
  difficulty   Int      // 1-5
  payload      String   // JSON string of the Exercise object (matches src/lib/exercises/types.ts shapes)
  reviewStatus String   @default("approved") // "approved" | "draft" | "rejected"
  batchId      String   // groups exercises generated together — supports rollback
  modelVersion String   // e.g. "gemini-2.5-pro-2026-04" — for provenance
  createdAt    DateTime @default(now())

  @@index([language, topic, exerciseType, difficulty, reviewStatus])
  @@index([batchId])
}
```

Run `npx prisma migrate dev --name add_exercise_pool` to create the migration.

### 2. Seed script — AI → JSON (run locally)

Create `prisma/seed-exercises.ts`:
- Reuse `getAIClient()` from [src/lib/ai.ts](../src/lib/ai.ts), `buildGenerationPrompt`/`SYSTEM_PROMPT` from [src/lib/exercises/prompts.ts](../src/lib/exercises/prompts.ts), and `parseExerciseResponse` from [src/lib/exercises/generate.ts](../src/lib/exercises/generate.ts) — do **not** rewrite generation logic
- Iterate buckets: `topics × EXERCISE_TYPES × difficultyLevels`
  - For each topic with base difficulty `D`, generate at difficulties `[max(1, D-1), D, min(5, D+1)]` (3 levels per topic; some collapse to 2 at edges)
  - Default count per bucket: **5** for `multiple_choice` / `fill_in_the_blank` / `true_false` / `reorder`, **15** for `free_text` and reading-related topics (variety matters more)
- Throttle: `await sleep(13000)` between AI calls to stay well under any free-tier RPM
- Allow `--model gemini-2.5-pro` flag so a higher-quality model can be used on a paid key for seeding
- Stamp every generated row with `batchId = randomUUID()` for the run, `modelVersion = AI_MODEL`
- Write output to `prisma/exercise-data/<language>.json` — array of `{topic, category, exerciseType, difficulty, payload, batchId, modelVersion}` rows
- Support `--topic`, `--type`, `--difficulty` flags for targeted regeneration (manual refresh)
- Add CLI flag `--append` to add to existing JSON file vs overwriting

Add npm script: `"seed:exercises": "tsx prisma/seed-exercises.ts"`.

### 3. Loader — JSON → DB (runs at deploy)

Create `prisma/seed-exercises-load.ts` mirroring the structure of [prisma/seed-achievements.ts](../prisma/seed-achievements.ts):
- Read both `prisma/exercise-data/de.json` and `prisma/exercise-data/en.json`
- For each row: `prisma.exercise.upsert({ where: { id }, create, update })` so loading is idempotent
- Print counts per (language, type) bucket at the end so you can see what landed
- Use the same `PrismaLibSql` adapter pattern as the achievements seed

Add npm script: `"seed:load:exercises": "tsx prisma/seed-exercises-load.ts"`.

### 4. Swap `generate.ts` to query DB

Modify [src/lib/exercises/generate.ts](../src/lib/exercises/generate.ts):
- Replace `generateFromAI` with `generateFromDB` that runs:
  ```ts
  prisma.exercise.findMany({
    where: { language, topic: topicId, exerciseType, difficulty, reviewStatus: "approved" },
    take: count * 4,  // overfetch for randomness
  })
  ```
  then shuffles and slices to `count`
- If the difficulty bucket is empty, widen to `difficulty: { in: [d-1, d, d+1] }`; if still empty, drop the difficulty filter
- If still empty, fall through to existing `getFallbackBatch` — keep [src/lib/exercises/fallbacks.ts](../src/lib/exercises/fallbacks.ts) as last-resort safety
- Keep `try/catch` so a DB error still falls back instead of breaking the practice flow
- Set `source: "db"` on the returned `ExerciseBatch` (extend the `source` union in [src/lib/exercises/types.ts](../src/lib/exercises/types.ts) to `"ai" | "fallback" | "db"`)
- The in-memory cache in [src/lib/exercises/cache.ts](../src/lib/exercises/cache.ts) becomes optional (DB queries are fast); leave it in place for now

### 5. Update tests

- Existing tests for `generateExercises` likely mock the AI client — update to mock `prisma.exercise.findMany` instead, or seed test data into a test DB
- Add a test for the difficulty-widening fallback behavior in `generate.ts`
- Add a sanity test that loads `prisma/exercise-data/*.json` and validates each `payload` parses against the corresponding `Exercise` discriminated union shape from [src/lib/exercises/types.ts](../src/lib/exercises/types.ts) — catches malformed seed data before it ships

### 6. Manual-refresh ergonomics (no cron yet)

Document in `docs/exercise-pool.md`:
- How to top up: `npm run seed:exercises -- --topic=de_noun_cases --type=free_text --append`
- How to deploy new content: re-run the loader against Turso (`DATABASE_URL=<turso-url> DATABASE_AUTH_TOKEN=<token> npm run seed:load:exercises`)
- How to roll back a bad batch: `DELETE FROM Exercise WHERE batchId = '<id>'`

### 7. Cleanup

- Remove `GEMINI_API_KEY` from production Vercel env vars (keep it locally for the seed script). Confirm with user before doing this so the seed script in CI/local still works.
- Decide whether to remove `@google/generative-ai` from production dependencies (keep as devDependency since seed script uses it).

---

## Verification

1. **Schema migration applies cleanly:** `npx prisma migrate dev` succeeds, `npx prisma studio` shows `Exercise` table.
2. **Seed script runs locally:** `GEMINI_API_KEY=... npm run seed:exercises -- --language=de --topic=de_noun_cases --type=multiple_choice` produces non-empty JSON in `prisma/exercise-data/de.json` with at least 5 valid exercises across 3 difficulty levels.
3. **Loader is idempotent:** Run `npm run seed:load:exercises` twice; row count stays the same on the second run.
4. **Practice flow works end-to-end:** Start dev server, create a profile, run a daily session — exercises load instantly (no 1-3s AI wait), all 15 render correctly across types, session summary is correct. Verify in browser/iPad.
5. **Production-equivalent test:** Unset `GEMINI_API_KEY` in `.env`, restart dev server, run a daily session — exercises still load (proves runtime no longer depends on AI). Logs should show `source: "db"`, not `source: "fallback"`.
6. **Difficulty fallback works:** Manually delete all difficulty-3 rows for one topic in Prisma Studio, request a session at difficulty 3 — verify the widening kicks in (logs should show widened query, not fallback).
7. **Vitest passes:** `npm run test`.
8. **Playwright passes:** `npm run test:e2e`.
9. **Vercel deployment succeeds:** Push to a preview branch, confirm deploy logs show no 429s and the seed loader runs as a build step (or document the manual deploy-time `npm run seed:load:exercises` invocation if not auto-running).

---

## Out of scope (explicitly deferred)

- **Vercel Cron auto-refresh** — agreed to do manual-only first; revisit if pool feels stale after a few weeks.
- **Per-profile recently-seen exclusion** — `ExerciseResult` stores raw `question` JSON, not `exerciseId`. Adding an `exerciseId` FK is a future enhancement once we see real repetition feedback.
- **Admin UI for review/approval workflow** — `reviewStatus` column is in place so we can build it later, but for now everything seeds as `approved` and is reviewed via Prisma Studio.
- **Removing `@google/generative-ai` runtime usage entirely** — kept available so the in-process AI fallback remains possible if we ever want it; the actual call site in `generate.ts` is removed.
