# PRD: Phase 1 — Foundation & Profile System

## Introduction

Marc_EN_DE is a daily German and English practice app for Gymnasium 5. Klasse students. This first phase establishes the project foundation (Next.js, database, CI) and builds the profile system so users can identify themselves across devices. No exercises yet — just the shell that everything else plugs into.

**Target user:** 10-year-old Gymnasium student (Marc), accessed from iPad and desktop.
**Deployment:** Vercel free tier. Database: Turso (LibSQL) for production, SQLite for dev.

## Goals

- Scaffold a working Next.js 15 + TypeScript + Tailwind project with Prisma/Turso
- Deploy to Vercel with a "hello world" page accessible from iPad and desktop
- Build a profile system (create, select, switch) with avatar selection
- Establish the database schema for profiles, sessions, exercises, achievements, and streaks
- Set up testing infrastructure (Vitest for unit/integration, Playwright for E2E)
- Establish the GitHub repo and CI pipeline

## User Stories

### US-001: Project scaffolding and tooling
**Description:** As a developer, I need a properly configured Next.js 15 project so that all subsequent work has a solid foundation.

**Acceptance Criteria:**
- [ ] Next.js 15 (App Router) project initialized with TypeScript and Tailwind CSS
- [ ] Path alias `@/*` → `./src/*` configured in tsconfig.json
- [ ] ESLint configured and passing
- [ ] Vitest configured with a sample passing test
- [ ] Playwright configured with a sample passing E2E test
- [ ] `npm run dev` starts the dev server at localhost:3000
- [ ] `npm run build` completes without errors
- [ ] `npm run test` runs Vitest tests
- [ ] `npm run test:e2e` runs Playwright tests
- [ ] `npm run lint` runs ESLint
- [ ] CLAUDE.md updated with project setup and commands
- [ ] .gitignore includes node_modules, .next, .env, dev.db, playwright-report

### US-002: Database schema and Prisma setup
**Description:** As a developer, I need the database schema defined so that all features can persist data.

**Acceptance Criteria:**
- [ ] Prisma 7 installed with `@libsql/client` adapter
- [ ] `prisma/schema.prisma` defines all models: Profile, Session, ExerciseResult, Achievement, ProfileAchievement, Streak
- [ ] Profile model: id (cuid), name (string), avatarId (string), timestamps
- [ ] Session model: id, profileId (FK), language (de/en), mode (daily/free), startedAt, completedAt, totalPoints, exerciseCount
- [ ] ExerciseResult model: id, sessionId (FK), profileId (FK), language, category, topic, exerciseType, question (JSON string), userAnswer (JSON string), correctAnswer (JSON string), isCorrect, pointsEarned, timeSpentSec, createdAt
- [ ] Achievement model: id, key (unique), nameDE, nameEN, descriptionDE, descriptionEN, iconId, category, threshold
- [ ] ProfileAchievement model: id, profileId (FK), achievementId (FK), earnedAt; unique constraint on (profileId, achievementId)
- [ ] Streak model: id, profileId (FK), language, currentStreak, longestStreak, lastPracticeDate (ISO string); unique constraint on (profileId, language)
- [ ] Indexes on: Session(profileId, language), Session(profileId, startedAt), ExerciseResult(profileId, language, topic), ExerciseResult(sessionId), Streak(profileId, language)
- [ ] `npx prisma migrate dev` runs successfully against local SQLite
- [ ] Prisma client singleton created at `src/lib/prisma.ts`
- [ ] Unit test: Prisma client can connect and run a simple query
- [ ] CLAUDE.md updated with database commands

### US-003: Achievement seed data
**Description:** As a developer, I need reference achievement data seeded so that the gamification system has badges to award.

**Acceptance Criteria:**
- [ ] Seed script at `prisma/seed-achievements.ts`
- [ ] Seeds streak badges: streak_3, streak_7, streak_14, streak_30, streak_100
- [ ] Seeds mastery badges: grammar_star, spelling_ace, reading_pro, writing_hero
- [ ] Seeds milestone badges: first_session, ten_sessions, hundred_sessions, perfect_5, both_languages, level_5
- [ ] Seeds special badges: early_bird, night_owl, weekend_warrior
- [ ] Each achievement has nameDE, nameEN, descriptionDE, descriptionEN, iconId, category, threshold
- [ ] `npm run seed:achievements` runs the seed script
- [ ] Seed is idempotent (can run multiple times without duplicates)
- [ ] Integration test: seed script creates expected number of achievements

### US-004: Profile creation page
**Description:** As a student, I want to create my profile with a name and fun avatar so the app knows who I am.

**Acceptance Criteria:**
- [ ] Page at `/profiles/new` with a name input field and avatar selector
- [ ] Avatar selector shows 8-10 animal/creature options (fox, owl, dragon, cat, dog, bear, rabbit, unicorn, panda, tiger) as colorful icons or illustrations
- [ ] Name field validates: required, 2-30 characters
- [ ] Submit button creates profile via `POST /api/profiles`
- [ ] After creation, redirects to profile home (`/[profileId]`)
- [ ] Responsive: works on iPad portrait (768px) and desktop
- [ ] Large tap targets (min 48px) for avatar selection on touch devices
- [ ] Typecheck passes
- [ ] Unit test: name validation logic
- [ ] Integration test: POST /api/profiles creates a profile in DB
- [ ] E2E test: navigate to /profiles/new, enter name, select avatar, submit, verify redirect to dashboard
- [ ] Verify in browser using dev-browser skill

### US-005: Profile picker (home screen)
**Description:** As a student, I want to see a "Who is practicing?" screen when I open the app so I can select my profile.

**Acceptance Criteria:**
- [ ] Root page `/` shows "Who is practicing?" heading
- [ ] Displays all existing profiles as cards (avatar + name)
- [ ] Tapping a profile card navigates to `/[profileId]`
- [ ] "Add new profile" button/card navigates to `/profiles/new`
- [ ] If no profiles exist, shows only the "Create your first profile" prompt
- [ ] Responsive: 2-column grid on iPad, 3-column on desktop, 1-column on phone
- [ ] Loading state while profiles are fetched
- [ ] Typecheck passes
- [ ] Integration test: GET /api/profiles returns profile list
- [ ] E2E test: create a profile, return to home, see it in the picker, tap to navigate
- [ ] Verify in browser using dev-browser skill

### US-006: Profile API routes
**Description:** As a developer, I need CRUD API routes for profiles so the frontend can manage them.

**Acceptance Criteria:**
- [ ] `GET /api/profiles` — returns all profiles (id, name, avatarId)
- [ ] `POST /api/profiles` — creates profile, body: { name, avatarId }, returns created profile
- [ ] `GET /api/profiles/[id]` — returns single profile
- [ ] `PATCH /api/profiles/[id]` — updates name and/or avatarId
- [ ] `DELETE /api/profiles/[id]` — deletes profile and all associated data (sessions, results, achievements, streaks)
- [ ] Input validation with Zod on POST and PATCH
- [ ] Standardized API response format: `{ success: true, data }` / `{ success: false, error: { code, message } }`
- [ ] Error codes: INVALID_INPUT (400), NOT_FOUND (404), SERVER_ERROR (500)
- [ ] Typecheck passes
- [ ] Unit test: Zod validation schemas
- [ ] Integration test: full CRUD cycle (create, read, update, delete)

### US-007: Profile-scoped layout
**Description:** As a student, I want to see my name and avatar in the app header so I know I'm in my profile, and navigate between sections.

**Acceptance Criteria:**
- [ ] Layout at `/[profileId]/layout.tsx` wraps all profile-scoped pages
- [ ] Header shows: profile avatar (small) + name on the left, points/level placeholder on the right
- [ ] Bottom navigation bar (mobile) or sidebar (desktop) with: Home, Practice, Progress, Badges
- [ ] "Switch profile" link/button returns to `/`
- [ ] ProfileProvider React context provides current profile data to child components
- [ ] Responsive: bottom nav on iPad/mobile, sidebar on desktop (>1024px)
- [ ] Typecheck passes
- [ ] E2E test: navigate through bottom nav items, verify correct pages load
- [ ] Verify in browser using dev-browser skill

### US-008: Profile home dashboard (placeholder)
**Description:** As a student, I want a home page after selecting my profile that shows where to start practicing.

**Acceptance Criteria:**
- [ ] Page at `/[profileId]` — the profile's home dashboard
- [ ] Shows welcome message: "Hallo, [name]!" with avatar
- [ ] Two large CTA buttons: "Daily Practice" and "Free Practice"
- [ ] Placeholder sections for: streak display, level/points, recent activity (can show "Coming soon" or mock data)
- [ ] Responsive layout
- [ ] Typecheck passes
- [ ] E2E test: select profile from picker, verify dashboard loads with correct name
- [ ] Verify in browser using dev-browser skill

### US-009: Vercel deployment
**Description:** As a developer, I need the app deployed to Vercel so it's accessible from Marc's iPad and the family desktop.

**Acceptance Criteria:**
- [ ] GitHub repo connected to Vercel project
- [ ] Turso database provisioned (production)
- [ ] Environment variables configured: DATABASE_URL, TURSO_AUTH_TOKEN, ANTHROPIC_API_KEY (can be placeholder for now)
- [ ] `main` branch auto-deploys to production
- [ ] App loads on production URL from both desktop browser and iPad Safari
- [ ] CLAUDE.md updated with deployment info and production URL

### US-010: Standardized API response helpers
**Description:** As a developer, I need reusable API response utilities so all endpoints return consistent formats.

**Acceptance Criteria:**
- [ ] `src/lib/api-response.ts` exports `successResponse(data, status?)` and `errorResponse(code, message, status?)`
- [ ] Success format: `{ success: true, data: {...} }`
- [ ] Error format: `{ success: false, error: { code, message } }`
- [ ] Error code constants: INVALID_INPUT, NOT_FOUND, FORBIDDEN, CONFLICT, SERVER_ERROR
- [ ] Helper `validateBody<T>(request, zodSchema)` that returns parsed data or throws with INVALID_INPUT
- [ ] Typecheck passes
- [ ] Unit test: successResponse and errorResponse produce correct shapes
- [ ] Unit test: validateBody returns data for valid input, throws for invalid

## Functional Requirements

- FR-1: Next.js 15 App Router with TypeScript strict mode and `@/*` path alias
- FR-2: Tailwind CSS for styling, mobile-first responsive design
- FR-3: Prisma 7 with LibSQL adapter for database access
- FR-4: SQLite (`dev.db`) for local development, Turso for production
- FR-5: All API routes return standardized JSON response format
- FR-6: Profile identification via URL path (`/[profileId]/...`), no authentication
- FR-7: Profile CUIDs (not sequential IDs) for non-guessable URLs
- FR-8: Avatar selection from a fixed set of 8-10 predefined options
- FR-9: Cascade delete on profile removal (sessions, results, achievements, streaks)
- FR-10: Vitest for unit and integration tests, Playwright for E2E tests

## Non-Goals (Out of Scope for Phase 1)

- No exercise generation or practice sessions (Phase 2)
- No gamification logic — points, levels, streaks (Phase 3)
- No Claude API integration (Phase 2)
- No authentication or passwords
- No admin panel
- No internationalization beyond DE/EN content
- No dark mode (single light theme)
- No offline support / PWA

## Technical Considerations

- Use `@dnd-kit/core` for future drag-and-drop exercises (install but don't use yet)
- Install `@anthropic-ai/sdk` now so it's ready for Phase 2
- Use `date-fns` for date manipulation, `zod` for validation, `lucide-react` for icons
- Prisma client singleton pattern: single instance in dev (avoid hot-reload connection issues)
- iPad Safari requires `viewport` meta tag with `viewport-fit=cover` for safe area handling

## Success Metrics

- App accessible from both iPad Safari and desktop Chrome via Vercel URL
- Profile create → select → dashboard flow works end-to-end
- All tests pass: unit, integration, E2E
- Build completes without TypeScript errors
- Database schema supports all future phases without migration changes

## Open Questions

- Should we pre-install a charting library for the progress page (Phase 4), or keep deps minimal and add later?
- Should avatars be SVG components, emoji, or image files?
