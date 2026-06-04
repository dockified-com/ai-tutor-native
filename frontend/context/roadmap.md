# Frontend Roadmap — V1 (8-Week Build Plan)

> **Goal**: Ship the AI Native Programming Tutor — one creator, one cohort, end-to-end.
> **Design Reference**: `docs/superpowers/specs/2026-05-30-ai-native-tutor-design.md` + light-theme prototype (2026-05-29)

---

## Phase 1 — Design System & Auth Foundation
> **Progress**: 5 / 22 tasks done — last synced from `git log` on 2026-06-03
> **Week 1 | Status: 🟡 IN PROGRESS**
> All tasks in Group A can start in parallel. Group B depends on Group A completing first.

### Group A — Parallel: Styling & Types & API Client

- [ ] `app/globals.css` — full light theme token system, animation keyframes, custom scrollbars *(file exists but is a basic placeholder — needs full token system)*
- [ ] Install fonts: Merriweather (serif) via `next/font/google`; confirm Geist Mono is loaded
- [ ] `npm install @fontsource/fira-code` (or use existing Geist Mono)
- [ ] `npx shadcn@latest init` — add: Button, Card, Badge, Sheet, Dialog, Input, Textarea, Select, Progress, Skeleton, Separator, Tabs, Sonner
- [ ] `shared/lib/cn.ts` — `clsx` + `tailwind-merge` helper *(packages installed, file not yet created)*
- [ ] `shared/types/blocks.ts` — Block discriminated union (5 types, client-safe fields)
- [ ] `shared/types/course.ts` — Course, Lesson, Enrollment, CourseStatus types
- [x] `shared/api/client.ts` — authenticated fetch wrapper (Clerk token injection, error parsing)

### Group B — Parallel: Auth & Role System (needs Group A)

- [x] `features/auth/hooks/use-user-role.ts` — implemented as `use-app-user.ts`; fetches `/api/me`, returns full `AppUser` with `role: 'creator' | 'student'`
- [ ] `features/auth/components/role-guard.tsx` — conditional render by role

### Group C — Parallel: Dashboard Components (needs Group A)

- [ ] `features/courses/components/course-status-badge.tsx`
- [ ] `features/courses/components/course-card.tsx` — status badge, progress bar
- [x] `app/dashboard/page.tsx` — empty state shell done; needs course list wired once course components exist

### Group D — Sequential: Course Creation Wizard (needs Group B + C)

- [ ] `features/authoring/stores/wizard-store.ts` — Zustand store, persisted to localStorage *(Zustand installed ✓)*
- [ ] `features/authoring/components/creation-wizard/step-1.tsx` — PDF upload
- [ ] `features/authoring/components/creation-wizard/step-2.tsx` — configure
- [ ] `features/authoring/components/creation-wizard/step-3.tsx` — generate trigger
- [ ] `features/authoring/actions/create-course.ts` — Server Action: `POST /api/courses/generate`
- [ ] `features/authoring/hooks/use-generation-status.ts` — SWR poll every 3s
- [ ] `app/courses/new/page.tsx`
- [ ] `app/courses/[id]/page.tsx` — basic course detail shell

---

## Phase 2 — Generation Pipeline & Status UI
> **Week 2 | Status: ✅ COMPLETE**
> Primarily backend week; frontend tasks are small and can run in parallel with any backend work.

### Group A — Parallel: Generation Status UI

- [x] `features/authoring/components/generation-status.tsx` — animated phase display
  - Phases: `extracting_pdf → embedding → generating_outline → generating_lesson_N → generating_audio → ready`
- [x] Update Wizard Step 3 to show live generation status after trigger

### Group B — Parallel: Course Detail Page

- [x] `app/courses/[id]/page.tsx` — show lesson list + "Preview" / "Publish" actions when `status = ready`

---

## Phase 3 — Tutor UI Shell
> **Week 3 | Status: ✅ COMPLETE**
> Group A (store + layout) must be done first. Groups B, C, D, E can all run in parallel after that.

### Group A — Sequential: Core Store & Layout Shell

- [x] `npm install mermaid` (or `react-mermaid`)
- [x] `features/tutor/stores/tutor-store.ts` — TutorStore: revealed blocks, active block, audio, hints, ask answers, sidebar state
- [x] `features/tutor/components/tutor-layout.tsx` — 4-zone layout shell (`w-[450px]` left, `flex-1` right, `w-14` nav rail)

### Group B — Parallel: Block Components (needs Group A store)

- [x] `features/tutor/components/blocks/markdown-block.tsx` — `font-serif leading-relaxed text-[15px]`
- [x] `features/tutor/components/blocks/mermaid-block.tsx`
- [x] `features/tutor/components/blocks/concept-check-block.tsx` — Yes/No buttons with color feedback

### Group C — Parallel: Lesson Feed (needs Group A + B)

- [x] `features/tutor/components/lesson-feed.tsx` — scrollable feed, `fade-in-up` on new blocks
- [x] `features/tutor/components/continue-button.tsx` — `rounded-full`, block count badge

### Group D — Parallel: Workspace (needs Group A store)

- [x] `features/tutor/lib/derive-right-pane.ts` — `Block → 'monaco' | 'mermaid' | 'empty'`
- [x] `features/tutor/components/workspace/workspace-shell.tsx` — pure derivation from `active_block_id`
- [x] `features/tutor/components/workspace/mermaid-workspace.tsx`
- [x] `features/tutor/components/workspace/empty-workspace.tsx` — Hand icon + "Welcome to the Course!"

### Group E — Parallel: Nav & Sidebars (needs Group A layout)

- [x] `features/tutor/components/nav-rail.tsx` — `w-14`, PieChart + FileText + Globe + Settings icons
- [x] `features/tutor/components/course-progress-slideout.tsx` — Sheet, `w-[320px]`, `animate-slide-left`, static curriculum tree
- [x] `features/tutor/components/notes-slideout.tsx` — Tabs: Instructor Notes / My Notes

### Group F — Sequential: Progress Actions & Route (needs Group C + D)

- [x] `features/progress/actions/mark-block-complete.ts`
- [x] `features/progress/actions/update-bookmark.ts`
- [x] `app/courses/[id]/lesson/[lesson_id]/page.tsx` — RSC: fetch blocks + progress, render TutorLayout

---

## Phase 4 — Monaco + Code Execution + Socratic Hints
> **Week 4 | Status: ✅ COMPLETE**
> Group A (install + SSE hook) can start immediately. Groups B and C can run in parallel after that.

### Group A — Sequential: Install & Shared Hook

- [x] `npm install @monaco-editor/react`
- [x] `features/tutor/hooks/use-sse-stream.ts` — generic SSE hook (used by hints, roast, ask)

### Group B — Parallel: Code Block in Feed (needs Group A)

- [x] `features/tutor/components/blocks/code-block.tsx` — instruction + "Code Exercise" label in feed; clicking activates Monaco workspace

### Group C — Parallel: Monaco Workspace (needs Group A)

- [x] `features/tutor/components/workspace/monaco-workspace.tsx`:
  - [x] Header: Code2 icon, block name, Struggle Heatmap badge (`🔥 N friends got stuck here`)
  - [x] Editor zone: line gutter (`w-12 font-mono text-xs text-slate-300`) + Monaco editor
  - [x] Terminal zone (`h-[40%]`): TerminalSquare header, verdict display
  - [x] Roast panel: `bg-orange-50 border-orange-200` panel with streaming text (shown after pass)

### Group D — Parallel: Server Actions (needs Group A SSE hook)

- [x] `features/tutor/actions/run-code.ts` — `POST /api/blocks/{id}/run`
- [x] `features/tutor/actions/get-socratic-hint.ts` — SSE: `POST /api/blocks/{id}/socratic-hint`
- [x] `features/tutor/actions/get-code-roast.ts` — SSE: `POST /api/blocks/{id}/roast`

### Group E — Sequential: Store Updates & Gating (needs Group B + C + D)

- [x] TutorStore additions: `codeValues`, `terminalOutputs`, `codeAttempts`, `hints`, `roasts`
- [x] Continue gating: code blocks only enable Continue when `verdict = 'passed'`

---

## Phase 5 — Ask Anything + Understanding Check + Lesson Gating
> **Week 5 | Status: ✅ COMPLETE**
> Groups A and B can start in parallel. Group C depends on both.

### Group A — Parallel: Ask Footer

- [x] `features/tutor/components/ask-footer.tsx`
  - Styling: `bg-slate-50 rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50`
  - Submit: `<ArrowUp size={18} strokeWidth={2.5} />`
  - Placeholder: "Ask or Comment ..."
- [x] `features/tutor/actions/ask-question.ts` — SSE: `POST /api/enrollments/{id}/ask`
- [x] Wire chat bubbles into `lesson-feed.tsx`: user bubble (`bg-slate-800 text-white rounded-br-sm`), AI bubble (`bg-emerald-50 border-emerald-100 rounded-bl-sm` + Sparkles icon)

### Group B — Parallel: Understanding Check

- [x] `features/tutor/components/blocks/understanding-check-block.tsx` — textarea + streaming Socratic feedback loop
- [x] `features/tutor/actions/submit-understanding-check.ts` — SSE
- [x] `features/tutor/actions/submit-concept-check.ts` — one-shot POST

### Group C — Sequential: Gating & Store (needs Group A + B)

- [x] `features/tutor/hooks/use-block-gating.ts` — derives Continue enabled per block type + state
- [x] TutorStore additions: `chatHistory`, `askInput`, `understandingFeedback`
- [x] Enforce lesson gating in UI: Continue / Next Lesson disabled until threshold met

---

## Phase 6 — TTS Audio + Auto-Continue + Progress Polish
> **Week 6 | Status: ⬜ NOT STARTED**
> All groups can run in parallel; Group C depends only on Group A being done.

### Group A — Parallel: TTS Audio

- [ ] `features/tutor/hooks/use-tts-audio.ts` — HTML5 Audio, preload on block activate
- [ ] `features/tutor/components/audio-controls.tsx` — `AudioLines size={14}` + `ChevronDown size={14}` in top header; popover for speed + auto-continue toggle

### Group B — Parallel: Wire Auto-Continue

- [ ] Wire `audio.onended` → fire Continue when auto-continue is toggled on

### Group C — Parallel: Progress Sidebar (after Group A)

- [ ] Update `course-progress-slideout.tsx` with real enrollment progress % and curriculum tree data

### Group D — Parallel: Feedback

- [ ] ThumbsDown: `POST /api/feedback` — log negative block feedback
- [ ] `features/progress/` module: confirm all actions are complete

---

## Phase 7 — Preview + Publish + Join + Polish
> **Week 7 | Status: ⬜ NOT STARTED**
> Groups A, B, C can all run in parallel. Group D (polish) runs last.

### Group A — Parallel: Creator Publish Flow

- [ ] `features/authoring/components/preview-banner.tsx` — amber sticky banner "PREVIEW MODE — interactions not saved" + [Exit Preview] button
- [ ] `app/courses/[id]/preview/page.tsx`
- [ ] `features/authoring/actions/publish-course.ts`
- [ ] Copy-to-clipboard course code with Sonner toast

### Group B — Parallel: Student Join Flow

- [ ] `features/enrollment/components/join-form.tsx`
- [ ] `app/join/[code]/page.tsx` — auto-enroll + redirect to lesson

### Group C — Parallel: Lesson Regeneration

- [ ] `features/authoring/components/regenerate-lesson-modal.tsx`
- [ ] `features/authoring/actions/regenerate-lesson.ts`

### Group D — Sequential: Polish (needs Group A + B + C done)

- [ ] Error boundaries: Mermaid invalid syntax, Monaco load fail, SSE disconnect
- [ ] Loading skeletons: dashboard, course detail, tutor page
- [ ] All empty states (no courses, no lessons, no enrollments)
- [ ] Toast notifications for all user actions

---

## Phase 8 — Tests + Production Deploy
> **Week 8 | Status: ⬜ NOT STARTED**
> Groups A and B can run in parallel. Group C (deploy) only after both pass.

### Group A — Parallel: Unit Tests (Vitest)

- [ ] `TutorStore` state transitions
- [ ] `derive-right-pane` logic
- [ ] Block gating logic (`use-block-gating`)
- [ ] Chat history insertion in feed

### Group B — Parallel: E2E Tests (Playwright)

- [ ] Creator flow: upload PDF → preview → publish
- [ ] Student flow: join → complete lesson → pass understanding check
- [ ] Code failure → Socratic hint appears (verify no solution code leaked)
- [ ] Roast My Code button appears only after `verdict = 'passed'`

### Group C — Sequential: Production Deploy (needs Group A + B passing)

- [ ] `npm run build` — clean (zero errors)
- [ ] `npm run lint` — clean (boundary rules)
- [ ] `npm run type-check` — clean
- [ ] Vercel env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`
- [ ] Domain: `tutor.dockified.com` → Vercel
- [ ] Final pedagogical constraint review
- [ ] Onboard first student ✓

---

## V2 — Multi-Creator + Engine B (Q3 2026)

> Full detail in `docs/product/02_roadmap.md`.

- Multi-creator accounts (self-serve role upgrade flow)
- Block-level editing + drag-and-drop reorder
- Notes drawer: My Notes = real `<textarea>` with persistence
- Mobile responsive (all tutor panels collapse to tabs on mobile)
- `features/grading/` — Engine B Auto-Grader student UI
- Supabase RLS replaces API-layer ownership checks
- V2 Superpower candidates: AI-generated cheat sheet, Peer comparison in Struggle Heatmap

## V3 — Voice Interview + Adaptive (Q4 2026 / Q1 2027)

> Full detail in `docs/product/02_roadmap.md`.

- `features/interview/` — Engine C Voice Mock Interview
- Hobby Context Injection: richer student profile (skill level, goals, background)
- Adaptive block generation UI (JIT blocks indicator in feed)
