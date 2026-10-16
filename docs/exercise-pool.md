# Exercise Pool (Fallback)

Real-time AI generation via **Claude** (using Anthropic SDK + the access configured on this computer, typically `ANTHROPIC_API_KEY`) is the **primary** path in `generateExercises()`. The pre-seeded pool (and hardcoded fallbacks) are used only when:

- `ANTHROPIC_API_KEY` is not set in the environment (or the claude CLI auth is not usable by the SDK)
- The AI call fails (rate limit, network, parse error, auth, etc.)
- As a last-resort safety net

This gives fresh, non-repeating exercises on every practice run. The pool remains valuable for curated/offline content and as a stable fallback when Claude is unavailable.

## How it works

```
src/lib/exercises/generate.ts   # runtime: tries Claude first (source:"ai"), falls back to pool ("db") or fallback ("fallback")
prisma/seed-exercises.ts        # (optional) bulk AI → JSON for the pool (local, throttled)
prisma/exercise-data/de.json    # committed pool (used only on AI failure / no key)
prisma/exercise-data/en.json
prisma/seed-exercises-load.ts   # JSON → DB (idempotent)
```

Runtime behavior (see src/lib/exercises/generate.ts: generateExercises):
- Check in-memory cache (10 min TTL, key includes topic+type+count+difficulty)
- Try live AI via the provider chain in `src/lib/ai.ts` (`completeText`: Grok → Claude Sonnet → Claude Opus → Qwen) + buildGenerationPrompt + parse → source: "ai"
- On any error: query the Exercise table (difficulty widening + shuffle) → "db"
- If pool empty for bucket: hardcoded fallbacks.ts → "fallback"

The call signature and ExerciseBatch return shape are unchanged (only `source` varies).

If a difficulty bucket is empty, the query widens to ±1 difficulty. If still empty, it drops the difficulty filter. Only if the entire (language, topic, type) bucket is empty does it fall through to `src/lib/exercises/fallbacks.ts`.

## First-time setup (for pool as fallback)

The pool is optional but recommended as a robust fallback. To populate it (e.g. for environments without Claude access):

```bash
# 1. Generate the full pool (uses the AI provider chain, run locally on the internal network)
npm run seed:exercises            # or pin one provider: -- --provider sonnet

# ... (throttled, ~1-2h, writes prisma/exercise-data/{de,en}.json)

# 2. Load into DB (local or Turso)
npm run seed:load:exercises

# 3. Verify fallback path works (unset key)
# In .env: comment out or do not set ANTHROPIC_API_KEY
npm run dev
# Start a practice session — you should see logs "AI generation failed ... (falling back to pool)"
# and batch.source === "db" (or "fallback" if pool empty)
```

For live AI (the normal happy path):
- Ensure `ANTHROPIC_API_KEY=...` (or equivalent auth that the local "claude" CLI uses) is in your `.env`
- `npm run dev` — practice sessions will call Claude at runtime and log source "ai"
- The goal is to reuse the Claude access already present on this computer (Claude Code / keychain / config).
- For production deploys, supply a valid ANTHROPIC_API_KEY (or use a provider that supports Anthropic).
```

## Topping up specific buckets (for the fallback pool)

When you want richer fallback content (or to replace a bad batch in the pool), regenerate slices using your Anthropic key:

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

## Deploying pool updates (fallback content)

If you updated the committed JSON files, load to prod DB:

```bash
DATABASE_URL=libsql://your-db.turso.io \
DATABASE_AUTH_TOKEN=... \
  npm run seed:load:exercises
```

(Note: live AI path does not use the DB pool at all when the key is present.)

## Rolling back a bad batch (in the pool)

Every row stamped with `batchId` and `modelVersion`. (Only affects fallback path.)

```sql
-- Find the batch
SELECT batchId, modelVersion, COUNT(*) FROM Exercise GROUP BY batchId;

-- Roll it back
DELETE FROM Exercise WHERE batchId = '<the-bad-id>';
```

Then re-run `seed:exercises` for the affected slice with `--append` to refill.

## CLI reference (pool generator)

`npm run seed:exercises -- [flags]` — populates the *fallback* pool only.

| Flag              | Default               | Notes                                                         |
| ----------------- | --------------------- | ------------------------------------------------------------- |
| `--language`      | both `de` and `en`    | Restrict to one language                                      |
| `--topic`         | all topics            | Single topic id (e.g. `de_noun_cases`)                        |
| `--type`          | all 5 exercise types  | One of: `multiple_choice`, `fill_in_the_blank`, `true_false`, `reorder`, `free_text` |
| `--difficulty`    | topic.difficulty ±1   | Generate only this difficulty level (1-5)                     |
| `--provider`      | full chain            | Pin one provider: `grok`, `sonnet`, `opus` or `qwen` (models come from `.env`) |
| `--count`         | 5                     | Default count per bucket (free_text/reading default to 15)    |
| `--throttle-ms`   | 13000                 | Delay between AI calls (set to 0 for paid tier with no RPM cap) |
| `--append`        | false                 | Add to existing JSON files instead of overwriting             |

Live runtime generation uses the same prompt + `completeText` provider chain from src/lib/ai.ts.

## Grammar drills (curated CSV → pool)

Drills are **pool-first** (not AI-first). Hidden topics are built from CSVs:

| Topic | Source CSV |
| ----- | ---------- |
| `de_drill_nouns` | `sources/drill-nouns.csv` |
| `de_drill_verbs` | `sources/drill-verbs.csv` |
| `de_drill_adjectives` | `sources/drill-de-adjectives.csv` |
| `de_drill_prepositions` | `sources/drill-de-prepositions.csv` |
| `de_drill_relative` | `sources/drill-de-relative.csv` |
| `de_drill_adverbial` | `sources/drill-de-adverbial.csv` |
| `de_drill_complement` | `sources/drill-de-complement.csv` |
| `de_drill_infinitive` | `sources/drill-de-infinitive.csv` |
| `de_drill_extras` | `sources/drill-de-extras.csv` |
| `en_drill_plurals` | `sources/drill-en-plurals.csv` |
| `en_drill_verbs` | `sources/drill-en-verbs.csv` |
| `en_drill_adjectives` | `sources/drill-en-adjectives.csv` |
| `en_drill_prepositions` | `sources/drill-en-prepositions.csv` |
| `en_drill_relative` | `sources/drill-en-relative.csv` |
| `en_drill_adverbial` | `sources/drill-en-adverbial.csv` |
| `en_drill_complement` | `sources/drill-en-complement.csv` |
| `en_drill_infinitive` | `sources/drill-en-infinitive.csv` |
| `en_drill_extras` | `sources/drill-en-extras.csv` |

```bash
npm run seed:build:drills   # CSV → de.json / en.json (replaces drill topics only)
npm run seed:load:exercises # JSON → DB
```

Each drill payload includes bilingual `explanation` (English) + `explanationCN` (Chinese).

## Anti-repeat (recent exclusion)

`generateExercises` can take `profileId` (wired from session build). It loads pool IDs and content hashes from the profile’s `ExerciseResult` rows in the last 7 days and excludes them from pool shuffle / AI stems. Drill sessions always prefer the curated pool and skip the shared AI cache so “Practice Again” reshuffles.

## Out of scope (deferred)

- **Vercel Cron auto-refresh of pool** — not needed now that AI is primary
- **Admin review UI** — `reviewStatus` exists for pool rows
