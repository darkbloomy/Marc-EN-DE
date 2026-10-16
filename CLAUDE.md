# CLAUDE.md

@AGENTS.md

## currentDate
Today's date is 2026-04-27.

## Project Overview

Marc_EN_DE is a daily German and English practice app for a 10-year-old Gymnasium 5. Klasse student. It provides structured 10-15 minute daily practice sessions with AI-generated exercises, gamification, and cross-device access (iPad + desktop).

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma 7 (SQLite/LibSQL), Vitest, Playwright

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest unit/integration tests
npm run test:watch   # Run Vitest in watch mode
npm run test:e2e     # Run Playwright E2E tests
npm run seed:achievements        # Seed achievement data (idempotent)
npm run seed:exercises           # Generate exercise pool via AI → JSON files (local only, throttled)
npm run seed:build:drills        # Build DE/EN grammar drills from CSVs → de.json/en.json
npm run seed:load:exercises      # Load prisma/exercise-data/*.json into DB (idempotent)
npm run ai:check                 # Ping each AI provider (text + tool call) and print OK/FAIL + latency

# Prisma
npx prisma migrate dev     # Run migrations (dev)
npx prisma generate        # Regenerate Prisma client
npx prisma studio          # Open Prisma Studio GUI
```

## Architecture

```
src/
  app/
    page.tsx                    # Profile picker ("Who is practicing?")
    layout.tsx                  # Root layout with viewport meta
    api/
      profiles/
        route.ts                # GET (list), POST (create)
        [id]/
          route.ts              # GET, PATCH, DELETE single profile
          gamification/route.ts # GET level, streaks, achievements
          progress/route.ts     # GET progress stats, activity, accuracy
      achievements/
        route.ts                # GET list all achievements
      exercises/
        generate/route.ts       # POST — AI exercise generation
      sessions/
        route.ts                # POST create session
        build/route.ts          # POST build session exercises (daily/free/drills/custom)
        [id]/
          route.ts              # GET session with results
          complete/route.ts     # POST complete session
          results/route.ts      # POST save exercise result
      ai-chat/
        route.ts                # POST — streaming AI tutor chat (SSE, tool use)
      dictionary/
        route.ts                # POST — AI dictionary lookup for one word (other two languages)
      pool/
        save/route.ts           # POST — save AI-session exercises to pool (drafts, idempotent per batchId)
    profiles/
      new/page.tsx              # Profile creation form
    [profileId]/
      layout.tsx                # Profile-scoped layout (header + nav)
      page.tsx                  # Dashboard (live stats, recent sessions, achievements)
      ProfileHeader.tsx         # Header with avatar, name, level/points, switch button
      ProfileNav.tsx            # Bottom nav (mobile) / sidebar nav (desktop), incl. AI Tutor button
      practice/
        daily/page.tsx          # Daily practice flow (language pick → exercises → summary)
        free/page.tsx           # Free practice (language → topic → exercises → summary)
        custom/[sessionId]/page.tsx # AI-built custom session (plan from AI Tutor chat)
      badges/page.tsx           # All achievements grid (earned/locked)
      progress/page.tsx         # Progress page (heatmap, accuracy, sessions, topics)
  components/
    SessionSummary.tsx         # Session completion screen (stats, per-exercise breakdown, optional save-to-pool)
    AiChatModal.tsx            # AI tutor chat modal (SSE streaming, plan cards, start-session flow)
    exercises/
      ExerciseRenderer.tsx     # Dispatcher: routes Exercise to correct component
      ExerciseShell.tsx        # Wrapper with progress bar + double-click/double-tap dictionary
      useWordLookup.ts         # Dictionary trigger: dblclick / touch double-tap → word → /api/dictionary
      WordLookupPopover.tsx    # Dictionary popover card
      ExerciseFeedback.tsx     # Correct/incorrect feedback with explanation
      MultipleChoice.tsx       # 4-option question
      FillInTheBlank.tsx       # Sentence with text input blank
      TrueFalse.tsx            # True/False toggle buttons
      Reorder.tsx              # Tap-to-order word arrangement
      FreeText.tsx             # Textarea with self-check
      index.ts                 # Barrel export
  contexts/
    ProfileContext.tsx          # ProfileProvider + useProfile hook
  generated/
    prisma/                    # Generated Prisma client (do not edit)
  lib/
    ai.ts                      # AI provider chain (Grok → Claude Sonnet → Claude Opus → Qwen): completeText / callTool / streamChat
    ai/
      tutor.ts                 # AI tutor: system prompt, plan validation, propose_practice_plan tool
      dictionary.ts            # Dictionary prompt, tool schema, validation, 24h cache
    api-response.ts            # successResponse, errorResponse, validateBody
    avatars.ts                 # Avatar options (emoji-based)
    exercises/
      types.ts                 # Exercise type definitions (MC, FillBlank, T/F, Reorder, FreeText)
      topics.ts                # Topic registry for DE and EN (22 topics)
      prompts.ts               # System prompt + per-type generation prompts
      generate.ts              # AI / pool / fallback with recent-exclusion + drill pool-first
      content-hash.ts          # Exercise stem + contentHash for anti-repeat
      recent.ts                # Load recent exercise keys per profile
      sheet-html.ts            # Standalone printable worksheet + answer key HTML
      fallbacks.ts             # Hardcoded last-resort exercises per type/language
      cache.ts                 # In-memory cache (10min TTL)
      word-at.ts               # extractWordAt: word under a caret offset (umlauts, apostrophes, skips CJK)
      index.ts                 # Barrel export
    gamification/
      levels.ts                # Level calculation (exponential curve, 50 levels)
      streaks.ts               # Streak tracking (update on session complete)
      achievements.ts          # Achievement checking and awarding
    sessions/
      daily-builder.ts         # Daily / free / drills / custom session builders
      drill-categories.ts      # Drill category keys (clauses + extras) — safe for client import
    prisma.ts                  # Prisma client singleton
    validations.ts             # Zod schemas for profile CRUD
  test/
    setup.ts                   # Vitest setup (jest-dom)
e2e/                           # Playwright E2E tests
prisma/
  schema.prisma                # Database schema
  seed-achievements.ts         # Achievement seed script
  seed-exercises.ts            # Exercise pool generator (AI → JSON, local only)
  seed-exercises-load.ts       # Exercise pool loader (JSON → DB, idempotent)
  exercise-data/               # Committed exercise pool: de.json, en.json
  migrations/                  # Prisma migrations
tasks/
  prd-phase1-foundation.md     # Phase 1 PRD
  prd-phase8-exercise-pool.md  # Phase 8 PRD (pre-seeded exercise pool)
  prd.json                     # Ralph agent task file
docs/
  exercise-pool.md             # Refresh, deploy, and rollback workflow for the pool
```

## Key Patterns

- **API responses:** All API routes use `successResponse(data)` and `errorResponse(code, message)` from `@/lib/api-response`
- **Validation:** Use `validateBody(request, zodSchema)` — returns parsed data or NextResponse error
- **Prisma client:** Import from `@/lib/prisma` (singleton with hot-reload protection)
- **Prisma imports:** Import types/client from `@/generated/prisma/client` (Prisma 7 output path)
- **Profile scoping:** Profile pages live under `/[profileId]/...`, layout fetches profile from DB
- **Avatars:** Emoji-based, defined in `@/lib/avatars` — 10 animal options
- **No auth:** Profiles are identified by URL path (CUID), no login/passwords
- **AI client:** `@/lib/ai` exposes `completeText`, `callTool` (forced single tool call + optional `parse` validator) and `streamChat`. Each walks a provider chain: **Grok** (`GROK_DEFAULT_MODEL`, OpenAI-compatible at `inference.tesla.com/xai/v1`) → **Claude Sonnet** (`ANTHROPIC_MODEL` / `ANTHROPIC_DEFAULT_SONNET_MODEL`, Vertex proxy) → **Claude Opus** (`ANTHROPIC_DEFAULT_OPUS_MODEL`) → **Qwen** (`QWEN_MODEL`, default `Qwen/Qwen3.8-Flash-Next-FP8` at `inference.tesla.com/v1`). Grok/Qwen authenticate with `ANTHROPIC_AUTH_TOKEN` unless `XAI_API_KEY` / `QWEN_API_KEY` are set; `AI_PROVIDER_ORDER` reorders/drops providers (local `.env` uses `qwen,sonnet,opus,grok`). Per-call `prefer` moves providers to the front (the dictionary prefers Qwen). A failing provider is skipped for 5 min; `streamChat` only falls back before the first token. Claude 5.x rejects `temperature` and forced `tool_choice` — the client learns that per model from the 400 and retries without them. All providers are internal-network only (not reachable from Vercel). Tool definitions use the Anthropic shape (`ToolDefinition`) and are converted for OpenAI-compatible providers.
- **Exercise generation:** `generateExercises({ topicId, exerciseType, count, difficulty })` tries live AI first (`completeText`, low reasoning effort, 45s timeout per provider). If every provider fails it falls back to DB pool query (with widening) then to hardcoded `fallbacks.ts`. Caches results for 10min. `source` in batch is "ai" | "db" | "fallback".
- **Exercise pool:** Pre-generated content lives in the `Exercise` table, seeded from `prisma/exercise-data/*.json`. Each row has `reviewStatus` ("approved"/"draft"/"rejected"), `batchId` (for rollback), and `modelVersion` (provenance)
- **Exercise types:** `multiple_choice`, `fill_in_the_blank`, `true_false`, `reorder`, `free_text`
- **Topics:** 12 German + 10 English topics, accessed via `getTopic(id)`, `getTopicsByLanguage(lang)`
- **Session flow:** Create session → generate exercises → render exercises → save results → complete session → show summary
- **Daily builder:** Picks 3 random topics, generates 15 exercises with mixed types
- **Free practice:** User picks language → topic → 10 exercises generated for that topic
- **Grammar drills:** DE/EN; categories nouns/plurals, verbs, adjectives (comp/sup), prepositions, relative clauses, adverbial clauses, complement clauses, infinitive clauses, extras (numbers/dates/time, comparison, reported speech, collocations); mixed mode (10/20/30/50 across all aspects) or per-category counts; confirm step with multiple-choice % (0–100) before generation; pool-first from curated CSVs; bilingual wrong-answer explanations (EN + CN); post-session review of each item
- **Dictionary:** Double-click (desktop) or double-tap (iPad) a word on an exercise card → popover explaining it in the *other two* languages (English exercise → German + Chinese; German exercise → English + Chinese), with article/plural for German nouns and an example. `useWordLookup` finds the word via `caretRangeFromPoint` + `extractWordAt` and sends the surrounding sentence as context to `POST /api/dictionary` → `lookupWord` (`callTool` with `DICTIONARY_TOOL`, 24h in-memory cache). Buttons are ignored unless marked `data-lookup` (MC options); `data-no-lookup` excludes English UI chrome; `data-lookup-lang="en"` marks the always-English feedback explanation
- **AI Tutor:** Violet Sparkles "AI Tutor" button at the bottom of `ProfileNav` (below Badges) opens `AiChatModal` (all `/[profileId]` pages). Multi-turn chat via `POST /api/ai-chat` (SSE, `streamChat` provider chain) with one tool, `propose_practice_plan`; the AI answers grammar questions (mirrors the user's language, sees the last 10 `ExerciseResult`s) and proposes practice plans, which the UI renders as confirmable cards. Plan caps: 3 topics / 50 exercises, topics validated against the registry. Conversation state is client-side only: it survives closing/reopening the modal and navigating between profile pages, and is lost on page reload, tab close or profile switch; the header **Clear** button resets it. Nothing is stored server-side. `toModelHistory` (`src/lib/ai/chat-history.ts`) replays earlier plans as real tool calls (`ChatMessage.toolCall` → OpenAI `tool_calls` + `tool` message / Anthropic `tool_use` + `tool_result`) and drops UI-only messages — if the model only sees plan *text*, it starts describing plans without calling the tool (no card)
- **Custom sessions (mode "custom"):** Started from a confirmed plan card — create session → `buildCustomSession` (scaled type mix per topic; drill topics go pool-first fill-in) → exercises stashed in `sessionStorage` → `practice/custom/[sessionId]` page. Full gamification (points, streaks, achievements, progress, anti-repeat). Summary offers **Save to pool** → `POST /api/pool/save` (drafts, idempotent per `ai-<sessionId>` batch)
- **Exercise payload persistence:** Every practice page POSTs `exercisePayload` (full exercise JSON) with each result so pool-save and tutor context can recover exact exercises later
- **Printable HTML export:** During practicing/summary (Daily, Free, Drills), **Download HTML** / **Print** builds a standalone worksheet + answer-key file via `sheet-html.ts` / `ExerciseSheetActions`
- **Anti-repeat:** Excludes pool IDs / content hashes from the profile’s last 7 days of `ExerciseResult`s
- **Level system:** `calculateLevel(totalPoints)` from `@/lib/gamification/levels` — exponential curve, 50 levels max
- **Streaks:** Updated automatically on session completion via `updateStreak()` — tracks per-language streaks
- **Achievements:** Checked automatically on session completion via `checkAndAwardAchievements()` — 18 achievements across streak, mastery, milestone, and special categories

## Database

- **Dev:** SQLite via `file:./dev.db` (set in `.env`)
- **Adapter:** `@prisma/adapter-libsql` required by Prisma 7
- **Models:** Profile, Session, ExerciseResult, Achievement, ProfileAchievement, Streak, Exercise
- **Cascade deletes:** Deleting a Profile cascades to all related records

## Testing

- **Unit/Integration:** Vitest with happy-dom, `@testing-library/react`, `@testing-library/jest-dom`
- **E2E:** Playwright with Chromium, auto-starts dev server
- **Test files:** `src/**/*.test.{ts,tsx}` for Vitest, `e2e/**/*.spec.ts` for Playwright

## Phase Status

- **Phase 1 (Foundation):** Complete — scaffolding, DB, profiles, deployment-ready
- **Phase 2 (AI Exercises):** Complete — types, topics, prompts, generation endpoint, fallbacks, caching
- **Phase 3 (Exercise UI):** Complete — all 5 exercise components, shell, feedback, renderer
- **Phase 4 (Sessions):** Complete — session API, daily builder, daily/free practice flows, session summary
- **Phase 5 (Gamification):** Complete — levels, streaks, achievements, gamification API, badges page, dashboard integration
- **Phase 6 (Progress):** Complete — progress API, progress page (heatmap, accuracy, topics), dashboard with live data
- **Phase 7 (Polish):** Complete — loading states, error boundaries, iPad Safari fixes, PWA manifest, CSS polish
- **Phase 8 (Exercise Pool):** Complete — pre-seeded pool is now a *fallback*; live AI (Claude via local computer access) is primary for variety (real-time generation). Pool + fallbacks protect when no ANTHROPIC_API_KEY or under rate limits. Seed scripts still useful for bulk/curated content.
