# Exercise Pool

The app serves practice exercises from a pre-seeded database pool instead of calling Gemini at request time. This eliminates rate-limit failures, removes runtime AI latency, and lets every exercise be reviewed before it ships.

## How it works

```
prisma/seed-exercises.ts        # AI → JSON  (run locally, throttled)
prisma/exercise-data/de.json    # committed pool
prisma/exercise-data/en.json    # committed pool
prisma/seed-exercises-load.ts   # JSON → DB  (idempotent, safe to re-run)
src/lib/exercises/generate.ts   # runtime: queries DB, never calls AI
```

The runtime call signature is unchanged:
`generateExercises({ topicId, exerciseType, count, difficulty })` returns the same `ExerciseBatch` shape, but with `source: "db"`.

If a difficulty bucket is empty, the query widens to ±1 difficulty. If still empty, it drops the difficulty filter. Only if the entire (language, topic, type) bucket is empty does it fall through to `src/lib/exercises/fallbacks.ts`.

## First-time setup

```bash
# 1. One-time: generate the full pool with the best model you have a key for
GEMINI_API_KEY=... npm run seed:exercises -- --model gemini-2.5-pro

# This iterates topics × types × difficulty levels (~330 buckets), throttled
# at 13s between calls to stay under any free-tier RPM. Expect ~1-2 hours.
# Output lands in prisma/exercise-data/{de,en}.json — commit those files.

# 2. Load the JSON into your local SQLite
npm run seed:load:exercises

# 3. Verify
npx prisma studio  # check the Exercise table is populated
npm run dev        # run a practice session — exercises load instantly, source: "db"
```

## Topping up specific buckets

When a particular bucket feels stale or repeats too often, regenerate just that slice and append:

```bash
# More free_text exercises for noun cases
npm run seed:exercises -- \
  --topic de_noun_cases \
  --type free_text \
  --append

# More variety on a whole language
npm run seed:exercises -- --language en --append

# Single difficulty level
npm run seed:exercises -- --topic en_simple_past --difficulty 4 --append
```

Then commit the updated JSON and re-run the loader.

## Deploying new content to production

The loader can target Turso directly:

```bash
DATABASE_URL=libsql://your-db.turso.io \
DATABASE_AUTH_TOKEN=... \
  npm run seed:load:exercises
```

The loader uses upsert-by-id, so re-running is safe — only new/changed rows are written.

## Rolling back a bad batch

Every row stamped with `batchId` and `modelVersion`. To remove a bad generation run:

```sql
-- Find the batch
SELECT batchId, modelVersion, COUNT(*) FROM Exercise GROUP BY batchId;

-- Roll it back
DELETE FROM Exercise WHERE batchId = '<the-bad-id>';
```

Then re-run `seed:exercises` for the affected slice with `--append` to refill.

## CLI reference

`npm run seed:exercises -- [flags]`

| Flag              | Default               | Notes                                                         |
| ----------------- | --------------------- | ------------------------------------------------------------- |
| `--language`      | both `de` and `en`    | Restrict to one language                                      |
| `--topic`         | all topics            | Single topic id (e.g. `de_noun_cases`)                        |
| `--type`          | all 5 exercise types  | One of: `multiple_choice`, `fill_in_the_blank`, `true_false`, `reorder`, `free_text` |
| `--difficulty`    | topic.difficulty ±1   | Generate only this difficulty level (1-5)                     |
| `--model`         | `gemini-2.5-flash`    | Override the model — pass `gemini-2.5-pro` for best quality   |
| `--count`         | 5                     | Default count per bucket (free_text/reading default to 15)    |
| `--throttle-ms`   | 13000                 | Delay between AI calls (set to 0 for paid tier with no RPM cap) |
| `--append`        | false                 | Add to existing JSON files instead of overwriting             |

## Out of scope (deferred)

- **Vercel Cron auto-refresh** — manual top-up only for now
- **Per-profile recently-seen exclusion** — `ExerciseResult` does not store an `exerciseId` FK yet; with a pool of 5+ per bucket, plain random selection is fine to start
- **Admin review UI** — `reviewStatus` is in place; for now use Prisma Studio to mark rows `draft`/`rejected`
