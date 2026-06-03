# Frontend Roadmap

## V1 — 8-Week Build Plan (Active)

> **Goal**: Ship the AI Native Programming Tutor — one creator, one cohort, end-to-end.  
> **Design Reference**: Prototype in `docs/superpowers/specs/2026-05-30-ai-native-tutor-design.md` + light-theme prototype built in Google Canvas (2026-05-29)

---

### Week 1 — Foundation ✦ IN PROGRESS

**Deliverables:**
- Auth (Clerk) wired: sign-in, sign-up, middleware, role-guard
- Dashboard: creator sees course list + "Create"; student sees enrolled courses
- Course creation wizard shell (3-step form): PDF upload → configure → generate trigger
- Full design token system in `globals.css` (light theme, emerald accent, tri-font)
- shadcn/ui installed and themed

**Frontend tasks:**
- `app/globals.css` — full light theme token system + animation keyframes + custom scrollbars
- Install fonts: Merriweather (serif) via next/font/google for lesson content
- `npm install @fontsource/fira-code` or use Geist Mono (already loaded)
- Install shadcn/ui: `npx shadcn@latest init`; add Button, Card, Badge, Sheet, Dialog, Input, Textarea, Select, Progress, Skeleton, Separator, Tabs, Sonner
- `shared/lib/cn.ts` — clsx + tailwind-merge
- `shared/types/blocks.ts` — Block discriminated union (all 5 types, stripped server fields)
- `shared/types/course.ts` — Course, Lesson, Enrollment, CourseStatus types
- `shared/api/client.ts` — authenticated fetch wrapper (Clerk token injection, error parsing)
- `features/auth/hooks/use-user-role.ts` — SWR fetch to `/api/me`, returns `'creator' | 'student' | undefined`
- `features/auth/components/role-guard.tsx` — conditional render by role
- `features/courses/components/course-card.tsx` — dashboard card (status badge, progress)
- `features/courses/components/course-status-badge.tsx`
- `features/authoring/stores/wizard-store.ts` — Zustand, persisted to localStorage
- `features/authoring/components/creation-wizard/` — Steps 1, 2, 3
- `features/authoring/actions/create-course.ts` — Server Action: POST /api/courses/generate
- `features/authoring/hooks/use-generation-status.ts` — SWR poll every 3s
- `app/dashboard/page.tsx`, `app/courses/new/page.tsx`, `app/courses/[id]/page.tsx`

---

### Week 2 — Generation Pipeline (Backend Focus)

**Deliverables:**
- Full async generation pipeline working end-to-end
- Status polling frontend shows live phase: `extracting_pdf → embedding → generating_outline → generating_lesson_N → generating_audio → ready`
- Course detail page shows lesson list once ready

**Frontend tasks:**
- `features/authoring/components/generation-status.tsx` — animated phase display
- Update Step 3 of wizard to show live status after trigger
- `app/courses/[id]/page.tsx` — show lesson list + "Preview" / "Publish" actions when ready

---

### Week 3 — Tutor UI Shell

**Deliverables:**
- Full 2-pane tutor layout working for markdown + mermaid + concept_check blocks
- Block-by-block reveal with `fade-in-up` animation and TutorStore
- Exact layout from prototype: `w-[450px]` left, `flex-1` right, `w-14` nav rail
- Click-to-jump with `opacity-60` dimming
- Course Progress slide-out drawer (static curriculum tree)
- Notes drawer (Instructor Notes tab)
- Empty workspace "Welcome" state with animated Hand icon

**Frontend tasks:**
- `npm install mermaid` (or `react-mermaid`)
- `features/tutor/stores/tutor-store.ts` — full TutorStore (revealed blocks, active block, audio, hints, ask answers, sidebar state)
- `features/tutor/components/tutor-layout.tsx` — 4-zone layout shell
- `features/tutor/components/lesson-feed.tsx` — scrollable feed, fade-in-up on new blocks
- `features/tutor/components/continue-button.tsx` — rounded-full, block count badge
- `features/tutor/components/blocks/markdown-block.tsx` — `font-serif leading-relaxed text-[15px]`
- `features/tutor/components/blocks/mermaid-block.tsx`
- `features/tutor/components/blocks/concept-check-block.tsx` — Yes/No buttons with color feedback
- `features/tutor/components/workspace/workspace-shell.tsx` — pure derivation from `active_block_id`
- `features/tutor/components/workspace/mermaid-workspace.tsx`
- `features/tutor/components/workspace/empty-workspace.tsx` — Hand icon + "Welcome to the Course!"
- `features/tutor/components/course-progress-slideout.tsx` — Sheet, `w-[320px]`, `animate-slide-left`
- `features/tutor/components/notes-slideout.tsx` — Tabs: Instructor Notes / My Notes
- `features/tutor/components/nav-rail.tsx` — `w-14`, PieChart + FileText + Globe + Settings
- `features/tutor/lib/derive-right-pane.ts` — `Block → 'monaco' | 'mermaid' | 'empty'`
- `features/progress/actions/mark-block-complete.ts`
- `features/progress/actions/update-bookmark.ts`
- `app/courses/[id]/lesson/[lesson_id]/page.tsx` — RSC: fetch blocks + progress, render TutorLayout

---

### Week 4 — Monaco + Code Execution + Socratic Hints

**Deliverables:**
- Code blocks: Monaco editor, Run button (`text-emerald-600` uppercase), Judge0 execution
- Terminal with pass/fail verdict UI, diff output display
- Socratic hint streaming inline in feed (`border-l-2 border-emerald-400 bg-emerald-50/50 font-serif`)
- **[SUPERPOWER] Roast My Code**: after passing, "🎭 Roast My Code" button appears → AI streams humorous code review in `bg-orange-50 border-orange-200` panel
- **[SUPERPOWER] Struggle Heatmap**: `<Flame animate-pulse />` badge in code block header showing "N friends got stuck here"
- Automated test: Socratic hints must not contain solution code

**Frontend tasks:**
- `npm install @monaco-editor/react`
- `features/tutor/components/blocks/code-block.tsx` — instruction + "Code Exercise" in feed; triggers Monaco workspace
- `features/tutor/components/workspace/monaco-workspace.tsx`:
  - Header: Code2 icon, block name, **Struggle Heatmap badge** (orange flame + count), Run shortcut
  - Editor: line number gutter (`w-12 font-mono text-xs text-slate-300`) + Monaco / `<textarea>`
  - Terminal (`h-[40%]`): TerminalSquare header, verdict display, **Roast My Code button**
  - Roast display: `bg-orange-50 border-orange-200` panel with streaming text
- `features/tutor/hooks/use-sse-stream.ts` — generic SSE hook
- `features/tutor/actions/run-code.ts` — POST /api/blocks/{id}/run
- `features/tutor/actions/get-socratic-hint.ts` — SSE: POST /api/blocks/{id}/socratic-hint
- `features/tutor/actions/get-code-roast.ts` — SSE: POST /api/blocks/{id}/roast (new V1 endpoint)
- TutorStore additions: `codeValues`, `terminalOutputs`, `codeAttempts`, `hints`, `roasts`
- Continue gating: `code` blocks only enable on `verdict = 'passed'`

---

### Week 5 — Ask Anything + Understanding Check + Lesson Gating

**Deliverables:**
- **[SUPERPOWER] Hobby Context Injection**: AI answers personalized with student's context (hobbies, analogies). Ask footer placeholder reflects this.
- Ask Anything footer: user bubbles (`bg-slate-800 text-white rounded-br-sm`) + AI bubbles (`bg-emerald-50 border-emerald-100 rounded-bl-sm` + Sparkles icon) render **in the block feed**
- Understanding check: textarea → Claude evaluates → Socratic feedback → pass → "Next Lesson"
- Lesson gating enforced in UI: Continue / Next Lesson disabled until threshold met

**Frontend tasks:**
- `features/tutor/components/ask-footer.tsx`:
  - `bg-slate-50 rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50`
  - Submit: `<ArrowUp size={18} strokeWidth={2.5} />`
  - placeholder: "Ask or Comment ..."
- `features/tutor/actions/ask-question.ts` — SSE: POST /api/enrollments/{id}/ask
- Chat history renders in `lesson-feed.tsx` between lesson blocks and the continue button
- `features/tutor/components/blocks/understanding-check-block.tsx` — textarea + streaming Socratic loop
- `features/tutor/actions/submit-understanding-check.ts` — SSE
- `features/tutor/actions/submit-concept-check.ts` — one-shot POST
- `features/tutor/hooks/use-block-gating.ts` — derives Continue enabled per block type + state
- TutorStore: `chatHistory`, `askInput`, `understandingFeedback` additions

---

### Week 6 — TTS Audio + Auto-Continue + Progress Sidebar Polish

**Deliverables:**
- TTS audio plays on block reveal; `AudioLines + ChevronDown` controls in header
- Auto-Continue: audio `ended` → Continue fires when toggle is on
- Course Progress drawer shows real % per lesson, real curriculum tree
- ThumbsDown feedback on Continue row (logs to backend)

**Frontend tasks:**
- `features/tutor/hooks/use-tts-audio.ts` — HTML5 Audio, preload on block activate
- `features/tutor/components/audio-controls.tsx` — `AudioLines size={14}` + `ChevronDown size={14}` in top header, popover for speed/auto-continue
- Wire `audio.onended` → auto-Continue
- Update `course-progress-slideout.tsx` with real enrollment progress data
- ThumbsDown: POST /api/feedback (log negative block feedback)
- `features/progress/` module complete

---

### Week 7 — Preview + Publish + Join + Polish

**Deliverables:**
- Creator preview with amber "PREVIEW MODE — interactions not saved" banner
- Publish → copy 6-char code + share URL
- `/join/{code}` auto-enrollment + redirect
- Lesson-level regeneration modal
- All empty states, error boundaries, toast notifications

**Frontend tasks:**
- `features/authoring/components/preview-banner.tsx` — amber banner, sticky, with [Exit Preview] button
- `app/courses/[id]/preview/page.tsx`
- `features/authoring/actions/publish-course.ts`
- Copy-to-clipboard course code with Sonner toast
- `features/enrollment/components/join-form.tsx`
- `app/join/[code]/page.tsx`
- `features/authoring/components/regenerate-lesson-modal.tsx`
- `features/authoring/actions/regenerate-lesson.ts`
- Error boundaries in tutor layout (Mermaid invalid syntax, Monaco load fail, SSE disconnect)
- Loading skeletons for dashboard, course detail, tutor page

---

### Week 8 — Tests + Production Deploy

**Deliverables:**
- `npm run build` clean, `npm run lint` clean (boundary rules), `npm run type-check` clean
- Vitest unit tests pass
- Playwright E2E pass against staging
- Vercel production live at `tutor.dockified.com`
- First student onboarded

**Frontend tasks:**
- Vitest: `TutorStore` transitions, `derive-right-pane`, block gating, chat history in feed
- Playwright: creator flow (upload → preview → publish), student flow (join → lesson → pass understanding check), code failure → Socratic hint (verify no answer leak), Roast My Code appears after pass
- Vercel env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`
- Domain: `tutor.dockified.com` → Vercel
- Final pedagogical constraint review

---

## New Features in V1 ("Superpowers")

These three features were identified in the prototype and are confirmed for V1:

### 🎭 Roast My Code
- **Trigger**: After a code block passes, a "🎭 Roast My Code" button appears in the terminal
- **Behavior**: Calls `POST /api/blocks/{id}/roast`; AI reviews the passing code and delivers a humorous but technically accurate critique
- **Display**: Streams into `bg-orange-50 border-orange-200 rounded-lg p-4` panel below the terminal output
- **Pedagogy**: Encourages refactoring and code quality awareness without blocking progress
- **Never roasts failing code** — only available after `verdict = 'passed'`

### 🔥 Struggle Heatmap
- **Trigger**: Passive — shown on every code block in the workspace header
- **Data**: Backend tracks aggregated `attempt_number > 2` count across all enrollments for a block
- **Display**: `<Flame size={12} className="animate-pulse" /> "N friends got stuck here"` in `bg-orange-50 text-orange-600 rounded-full` badge
- **Psychology**: Students feel less alone when stuck; normalizes struggle
- **API**: `GET /api/blocks/{id}/struggle-stats` → `{ stuck_count: number }`
- **V1 stub**: hardcode from backend; aggregate query added in V2 for efficiency

### 🎮 Hobby Context Injection
- **Trigger**: During student onboarding (V1: optional profile step after sign-up), student enters 1-3 hobbies/interests (e.g., "gaming, Valorant, cooking")
- **Behavior**: Backend injects these into the RAG answer system prompt for "Ask Anything" endpoint
- **Display**: AI answers use the student's context naturally ("Think of decorators like playing Sage in Valorant...")
- **V1 scope**: Simple `users.hobbies TEXT[]` column; injected as system prompt prefix
- **API**: `PATCH /api/me/profile` — student updates hobbies; stored in `users` table

---

## V2 — Multi-Creator + Engine B (Q3 2026)

*Full detail in `docs/product/02_roadmap.md`.*

**Frontend highlights:**
- Multi-creator accounts (self-serve role upgrade flow)
- Block-level editing + drag-and-drop reorder
- Notes drawer: My Notes = real `<textarea>` with persistence
- Mobile responsive breakpoints (all tutor layout panels collapse to tabs on mobile)
- `features/grading/` — Engine B Auto-Grader student UI
- Supabase RLS replaces API-layer ownership checks
- V2 Superpower candidates: AI-generated cheat sheet in Notes drawer, Peer comparison in Struggle Heatmap

## V3 — Voice Interview + Adaptive (Q4 2026 / Q1 2027)

*Full detail in `docs/product/02_roadmap.md`.*

**Frontend highlights:**
- `features/interview/` — Engine C Voice Mock Interview
- Hobby Context Injection: richer student profile (beyond hobbies → skill level, goals, background)
- Adaptive block generation UI (JIT blocks indicator in feed)
