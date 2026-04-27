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
npm run seed:achievements  # Seed achievement data (idempotent)

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
        [id]/route.ts           # GET, PATCH, DELETE single profile
    profiles/
      new/page.tsx              # Profile creation form
    [profileId]/
      layout.tsx                # Profile-scoped layout (header + nav)
      page.tsx                  # Profile home dashboard
      ProfileHeader.tsx         # Header with avatar, name, switch button
      ProfileNav.tsx            # Bottom nav (mobile) / sidebar nav (desktop)
  contexts/
    ProfileContext.tsx          # ProfileProvider + useProfile hook
  generated/
    prisma/                    # Generated Prisma client (do not edit)
  lib/
    api-response.ts            # successResponse, errorResponse, validateBody
    avatars.ts                 # Avatar options (emoji-based)
    prisma.ts                  # Prisma client singleton
    validations.ts             # Zod schemas for profile CRUD
  test/
    setup.ts                   # Vitest setup (jest-dom)
e2e/                           # Playwright E2E tests
prisma/
  schema.prisma                # Database schema
  seed-achievements.ts         # Achievement seed script
  migrations/                  # Prisma migrations
tasks/
  prd-phase1-foundation.md     # Phase 1 PRD
  prd.json                     # Ralph agent task file
```

## Key Patterns

- **API responses:** All API routes use `successResponse(data)` and `errorResponse(code, message)` from `@/lib/api-response`
- **Validation:** Use `validateBody(request, zodSchema)` — returns parsed data or NextResponse error
- **Prisma client:** Import from `@/lib/prisma` (singleton with hot-reload protection)
- **Prisma imports:** Import types/client from `@/generated/prisma/client` (Prisma 7 output path)
- **Profile scoping:** Profile pages live under `/[profileId]/...`, layout fetches profile from DB
- **Avatars:** Emoji-based, defined in `@/lib/avatars` — 10 animal options
- **No auth:** Profiles are identified by URL path (CUID), no login/passwords

## Database

- **Dev:** SQLite via `file:./dev.db` (set in `.env`)
- **Adapter:** `@prisma/adapter-libsql` required by Prisma 7
- **Models:** Profile, Session, ExerciseResult, Achievement, ProfileAchievement, Streak
- **Cascade deletes:** Deleting a Profile cascades to all related records

## Testing

- **Unit/Integration:** Vitest with happy-dom, `@testing-library/react`, `@testing-library/jest-dom`
- **E2E:** Playwright with Chromium, auto-starts dev server
- **Test files:** `src/**/*.test.{ts,tsx}` for Vitest, `e2e/**/*.spec.ts` for Playwright

## Phase Status

- **Phase 1 (Foundation):** Complete — scaffolding, DB, profiles, deployment-ready
- **Phase 2 (AI Exercises):** Not started
- **Phase 3 (Exercise UI):** Not started
- **Phase 4 (Sessions):** Not started
- **Phase 5 (Gamification):** Not started
- **Phase 6 (Progress):** Not started
- **Phase 7 (Polish):** Not started
