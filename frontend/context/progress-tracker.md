# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

**Week 1 — Foundation: Auth + Dashboard + Wizard Shell + Design System**

## Current Goal

Build the full design system (light theme, emerald accent, tri-font system, shadcn/ui), the `shared/` foundation layer, the dashboard, and the 3-step creation wizard shell.

## Completed

### Infrastructure
- [x] Next.js 16 (App Router) project bootstrapped with TypeScript
- [x] Tailwind v4 configured (`@tailwindcss/postcss`)
- [x] Clerk v7 (`@clerk/nextjs`) installed + `ClerkProvider` in root layout
- [x] Clerk middleware configured — protects all routes except `/`, `/sign-in`, `/sign-up`, `/join/*`, `/api/health`
- [x] Zustand v5 installed
- [x] `eslint-plugin-boundaries` installed + in `eslint.config.mjs`
- [x] `clsx` + `tailwind-merge` installed
- [x] `features/auth/` directory scaffold (index.ts, components/, hooks/)

### Context / Docs
- [x] All `context/` files fully populated with project-specific content (2026-06-03)
- [x] UI Context updated to light theme + emerald accent + tri-font system (2026-06-03)
- [x] Roadmap updated with 3 new Superpower features (2026-06-03)
- [x] Full PRD, product roadmap, frontend plan, backend plan, DB schema, API contracts, local setup written in `docs/`

## In Progress

- [ ] `app/globals.css` — light theme token system, tri-font setup, animation keyframes, custom scrollbars
- [ ] Merriweather font via `next/font/google` in `layout.tsx`
- [ ] shadcn/ui install + theme configuration

## Next Up

### Immediate (Week 1, remaining)

**Design System foundation:**
- [ ] `app/globals.css` — full token system (all CSS variables from ui-context.md), keyframe animations (`fadeInUp`, `slideLeft`), custom scrollbars, `.fade-in-up`, `.animate-slide-left` classes
- [ ] `app/layout.tsx` — add Merriweather font alongside Geist fonts
- [ ] `npx shadcn@latest init` — configure for light theme, slate base, emerald accent
- [ ] Add components: Button, Card, Badge, Sheet, Dialog, Input, Textarea, Select, Progress, Skeleton, Separator, Tabs, Sonner

**Shared layer:**
- [ ] `shared/lib/cn.ts` — `cn()` utility (clsx + tailwind-merge)
- [ ] `shared/lib/errors.ts` — `APIError` class + error parsing
- [ ] `shared/types/blocks.ts` — Block discriminated union (all 5 types; strip `hint_seed_prompt` and `evaluation_rubric`)
- [ ] `shared/types/course.ts` — Course, Lesson, Enrollment, CourseStatus types
- [ ] `shared/types/api.ts` — `APIError` response shape, `RunCodeResponse`, `UnderstandingResult`
- [ ] `shared/api/client.ts` — authenticated fetch wrapper (injects Clerk JWT, throws `APIError` on non-2xx)
- [ ] `shared/api/endpoints.ts` — typed URL builder functions

**Auth feature:**
- [ ] `features/auth/hooks/use-user-role.ts` — SWR fetch to `/api/me`
- [ ] `features/auth/components/role-guard.tsx` — wraps children conditionally by role
- [ ] `features/auth/index.ts` — public API

**Dashboard + Courses:**
- [ ] `features/courses/components/course-card.tsx` — creator card (status + actions) and student card (progress %)
- [ ] `features/courses/components/course-status-badge.tsx` — draft/generating/ready/published/failed
- [ ] `features/courses/hooks/use-course.ts` — SWR fetcher
- [ ] `features/courses/index.ts`

**Authoring wizard:**
- [ ] `features/authoring/stores/wizard-store.ts` — Zustand, persisted to localStorage
- [ ] `features/authoring/components/creation-wizard/wizard-shell.tsx` — step container + step indicator
- [ ] `features/authoring/components/creation-wizard/step-upload.tsx` — PDF drag-drop + validation
- [ ] `features/authoring/components/creation-wizard/step-configure.tsx` — title, desc, lang, custom prompt
- [x] `features/authoring/components/creation-wizard/step-generate.tsx` — trigger + live phase display
- [x] `features/authoring/actions/create-course.ts` — Server Action: POST /api/courses/generate
- [x] `features/authoring/hooks/use-generation-status.ts` — SWR poll every 3s
- [ ] `features/authoring/index.ts`

**Pages:**
- [ ] `app/dashboard/page.tsx` — RSC: split by role, render CourseCard grid
- [ ] `app/courses/new/page.tsx` — wizard page
- [x] `app/courses/[id]/page.tsx` — course detail (status, lessons, action bar)

### Week 3 — Tutor Shell
- [ ] `features/tutor/stores/tutor-store.ts` — TutorStore full interface (revealed blocks, active block, audio, hints, roasts, chatHistory, sidebar state)
- [ ] All tutor component stubs (see roadmap.md Week 3)
- [ ] `features/tutor/lib/derive-right-pane.ts` — pure function
- [ ] `features/progress/` module
- [ ] `app/courses/[id]/lesson/[lesson_id]/page.tsx`

### Week 4 — Code + Superpowers
- [ ] `@monaco-editor/react` installed
- [ ] Monaco workspace with Struggle Heatmap badge
- [ ] Roast My Code button + streaming display
- [ ] `features/tutor/actions/get-code-roast.ts`
- [ ] Backend: `POST /api/blocks/{id}/roast` endpoint
- [ ] Backend: `GET /api/blocks/{id}/struggle-stats` endpoint

### Week 5 — Ask Anything + Understanding Check + Hobby Context
- [ ] Ask footer + chat history in feed (not separate panel)
- [ ] Student onboarding: hobbies/interests input (post-signup profile step)
- [ ] `PATCH /api/me/profile` with hobbies
- [ ] Backend injects hobbies into RAG system prompt

### Weeks 6–8 — Audio + Preview + Publish + Tests
*(see roadmap.md for full task lists)*

## Open Questions

- **OQ-01**: Claude model for Socratic hints — Sonnet vs. Haiku? *Default: Sonnet. Revisit Week 4.*
- **OQ-02**: SSE auth via `?token=` query param acceptable in V1? *Decision: Yes with HTTPS. V2: cookie auth.*
- **OQ-03**: Install shadcn/ui now (Week 1) or defer? *Decision: Install now — needed for dashboard immediately.*
- **OQ-04**: `@monaco-editor/react` vs raw `monaco-editor`? *Decision: `@monaco-editor/react` for Next.js Web Worker compatibility.*
- **OQ-05**: Struggle Heatmap data source — live aggregate query or periodic batch? *V1: simple COUNT query on code_submissions where attempt_number > 2. V2: materialized view.*
- **OQ-06**: Hobby context — onboarding step after signup, or profile page? *V1: simple optional input on dashboard "Tell us about yourself" card. Not a full profile page.*
- **OQ-07**: Roast My Code — same Anthropic call as Socratic hint or separate endpoint? *Decision: Separate endpoint `/api/blocks/{id}/roast` with a distinct "Senior Dev" system prompt that's humorous but technically accurate. SSE streamed.*
- **OQ-08**: Notes drawer in V1 — read-only Instructor Notes only, or allow student to type? *Decision: V1 = Instructor Notes read-only (pre-generated with lesson). My Notes tab is V2.*
- **OQ-09**: ThumbsDown on Continue — what data does it log? *Decision: POST `/api/feedback` with `{ block_id, enrollment_id, type: 'negative' }`. No UI follow-up in V1.*
- **OQ-10**: Merriweather font — load via `next/font/google` or CDN? *Decision: `next/font/google` for performance + no FOUT.*

## Architecture Decisions

- **Light theme** (not dark): The prototype and user-provided UI context confirm light mode only. Design tokens in `globals.css` follow the emerald/slate palette. No dark mode in V1.
- **Tri-font system**: `font-sans` (Geist) for UI chrome, `font-serif` (Merriweather) for all lesson content and AI text, `font-mono` (Geist Mono or Fira Code) for code/terminal. This is a deliberate UX decision to signal "reading mode" in lesson content.
- **Chat history in feed**: Ask Anything answers render directly in the left block feed — not in a separate panel. This keeps the conversation contextually adjacent to the lesson content.
- **Slide-out drawers (not modals)**: Progress and Notes use 320px slide-out Sheet panels from the right, between the workspace and the nav rail. They don't overlay the full screen.
- **No Supabase client in frontend**: All data via FastAPI REST. Confirmed again.
- **Roast My Code = V1 Superpower**: Confirmed as a V1 feature — it drives student engagement and code quality awareness post-exercise without blocking pedagogy.
- **Struggle Heatmap = V1 Superpower**: Confirms as V1 — simple COUNT query in V1, materialized view in V2.
- **Hobby Context Injection = V1 Superpower**: Stored as `users.hobbies TEXT[]`, injected as system prompt prefix in `/ask` endpoint. Simple opt-in on dashboard.
- **Roasts never on failing code**: Only available after `verdict = 'passed'`. Pedagogically: don't demotivate students who are struggling.

## Session Notes

- Codebase is at the beginning of Week 1 — infrastructure and Clerk are wired, but no UI features built yet
- **The light theme UI context (ui-context.md) completely supersedes the earlier dark theme** — do not use dark colors
- The three Superpower features (Roast, Heatmap, Hobby) are all confirmed V1 features — they are in the roadmap and require backend endpoints
- Next session should start with: `globals.css` design token setup → shadcn/ui install → shared layer (cn, types, api client) → dashboard
- Reference the prototype code at `docs/superpowers/specs/` for exact class names and layout dimensions when building the tutor layout
- The `w-[450px]` left pane width, `w-14` nav rail, and `w-[320px]` drawers are exact — do not approximate with Tailwind defaults
