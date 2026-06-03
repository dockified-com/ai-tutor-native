# Plan — Phase 2: Generation Pipeline & Status UI

> Branch: `feature/phase-2-generation-pipeline-status-ui`
> Roadmap reference: `roadmap.md` → Phase 2, Week 2

---

## Group A — Generation Status UI (starts immediately)

Both tasks in Group A are independent and can be implemented in parallel.

### 1. `features/authoring/components/generation-status.tsx`

- [ ] **1.1** Create the component file under `features/authoring/components/`
- [ ] **1.2** Define the ordered phases array:
  ```
  extracting_pdf → embedding → generating_outline
  → generating_lesson_N → generating_audio → ready
  ```
- [ ] **1.3** Accept props: `currentPhase: string`, `totalLessons: number` (for the `generating_lesson_N` step count)
- [ ] **1.4** Render each phase as a row — completed phases show a ✓ CheckCircle2 icon (emerald), active phase shows a spinning Loader2 icon, pending phases show a dim circle
- [ ] **1.5** Animate the active phase row with a subtle pulse on the icon and a text label describing the current phase in plain language (e.g. "Generating lesson 2 of 5…")
- [ ] **1.6** When `currentPhase === 'ready'`, display a full-row success state: emerald background, "Your course is ready!" heading, CTA to navigate to `app/courses/[id]/page.tsx`
- [ ] **1.7** Export from `features/authoring/index.ts`

### 2. Update Wizard Step 3 (`step-generate.tsx` / `step-3.tsx`)

- [ ] **2.1** After the user triggers generation (calls `create-course.ts` Server Action), transition the step from "trigger" mode to "status" mode
- [ ] **2.2** Mount `generation-status.tsx` inside the step, passing `currentPhase` from the SWR poll
- [ ] **2.3** Wire `use-generation-status.ts` hook (poll `GET /api/courses/{id}/status` every 3 s) — this hook already exists in the roadmap; confirm it is implemented or stub it here
- [ ] **2.4** On phase change, the `generation-status` component transitions automatically (no manual refresh)
- [ ] **2.5** When `status === 'ready'`, the CTA inside `generation-status` navigates to `app/courses/[id]/page.tsx`
- [ ] **2.6** Handle error states: `status === 'failed'` → show error message with "Try again" button that resets the wizard to Step 1

---

## Group B — Course Detail Page (starts immediately, parallel with Group A)

### 3. `app/courses/[id]/page.tsx` — Full Course Detail Implementation

- [ ] **3.1** Convert existing shell to a full RSC — fetch course data via `apiClient` using the `[id]` param
- [ ] **3.2** Derive display state from `course.status`:
  - `draft | generating`: show `generation-status.tsx` progress view
  - `ready`: show lesson list + Creator action bar
  - `published`: show lesson list + published banner
  - `failed`: show error state with regeneration CTA
- [ ] **3.3** Render lesson list: ordered list of `Lesson` objects, each showing lesson title, block count, and a status chip
- [ ] **3.4** **Creator role** (gated via `role-guard.tsx`): Show action bar with:
  - `[Preview]` button → navigate to `app/courses/[id]/preview/page.tsx` (page to be built in Phase 7, but the route should exist)
  - `[Publish]` button → calls `publish-course.ts` Server Action (stub only — full implementation in Phase 7)
- [ ] **3.5** **Student role**: Auto-redirect to `app/courses/[id]/lesson/[lesson_id]/page.tsx` (first lesson) when `status === 'published'`. If not published, show a "not available yet" message.
- [ ] **3.6** Apply design tokens: `font-serif` for lesson titles, `font-sans` for chrome, `course-status-badge.tsx` for status chip

---

## Commit Checklist (per `ai-workflow-rules.md`)

After each task group above is done and verified:

- [ ] Tick corresponding checkboxes in `roadmap.md` Phase 2
- [ ] Update `progress-tracker.md` → Current Phase + Completed section
- [ ] `npm run build` — zero TypeScript errors
- [ ] `npm run lint` — no boundary violations
- [ ] One `git commit` per checkbox (see commit message convention in `ai-workflow-rules.md`)
