# Validation — Phase 2: Generation Pipeline & Status UI

> This phase is done and mergeable when **all** criteria below pass.

---

## 1. TypeScript & Lint

- [x] `npm run build` exits with 0 errors (no TypeScript errors)
- [x] `npm run lint` exits with 0 errors — specifically no `eslint-plugin-boundaries` violations (no `features/authoring` importing from `features/courses` or vice versa)
- [x] `npm run type-check` clean (if separate from build)

---

## 2. Generation Status Component — `generation-status.tsx`

### Render validation (manual)

- [x] With `currentPhase = 'extracting_pdf'`: only the first row is active (spinner), all others are pending (dim)
- [x] With `currentPhase = 'generating_lesson_2'` and `totalLessons = 5`: rows 1–3 show ✓, row 4 shows spinner + label "Generating lesson 2 of 5…", row 5 is pending
- [x] With `currentPhase = 'ready'`: all rows show ✓, the card transitions to emerald background, "Your course is ready!" heading appears, CTA button is visible
- [x] With `currentPhase = 'failed'` (error state): error message visible, "Try again" button visible
- [x] The spinner icon animates (Loader2 spin class applied)
- [x] Phase advance is animated (completed row transitions from spinner to checkmark with fade-in)
- [x] No layout shift when phase changes

### Export validation

- [x] `GenerationStatus` is exported from `features/authoring/index.ts`
- [x] Import in Step 3 uses the public index, not a direct internal path

---

## 3. Wizard Step 3 — Generation Trigger + Status Handoff

- [x] Clicking the "Generate" button calls the `create-course.ts` Server Action and receives a `courseId`
- [x] After the action resolves, the step view switches from trigger UI to status UI (no page reload)
- [x] `use-generation-status.ts` SWR hook begins polling `GET /api/courses/{id}/status` every 3 s
- [x] `generation-status.tsx` receives live `currentPhase` updates as polling returns new data
- [x] Polling stops automatically when `status === 'ready'` or `status === 'failed'`
- [x] "Try again" on failure resets WizardStore and returns to Step 1

---

## 4. Course Detail Page — `app/courses/[id]/page.tsx`

### Status-gated display

- [x] `status === 'generating'`: `generation-status.tsx` renders in the page body with live phase
- [x] `status === 'ready'`: lesson list renders; each lesson row shows title, block count, status chip
- [x] `status === 'published'`: lesson list renders + published badge visible in the page header
- [x] `status === 'failed'`: error state shown with a "Regenerate" CTA (stub — shows toast in Phase 2)
- [x] `status === 'draft'`: shows a "Course is being set up" placeholder (not generation status)

### Creator actions (`status === 'ready'` or `'published'`)

- [x] `[Preview]` button is visible to creators; clicking navigates to `/courses/[id]/preview` (page may be empty in Phase 2)
- [x] `[Publish]` button is visible to creators; in Phase 2, clicking shows Sonner toast: *"Publish flow coming soon."*
- [x] Both buttons are **not visible** to students (role-guard correctly applied)

### Student redirect

- [x] Student visiting `/courses/[id]` when `status === 'published'` is redirected to the first lesson (`/courses/[id]/lesson/[lesson_id]`)
- [x] Student visiting `/courses/[id]` when `status !== 'published'` sees "This course isn't available yet." (no crash, no empty page)

### Design tokens

- [x] Lesson titles use `font-serif font-medium`
- [x] Chrome (page heading, action bar) uses `font-sans`
- [x] `CourseStatusBadge` component is used for the course-level status chip

---

## 5. Context File Sync

- [x] All Phase 2 task checkboxes in `roadmap.md` are ticked (`[x]`)
- [x] `progress-tracker.md` reflects:
  - **Current Phase** updated to Week 3 (or "Phase 2 complete, moving to Phase 3")
  - **Completed** section includes all Phase 2 tasks
  - **Next Up** updated to Phase 3 tasks

---

## 6. Git History

- [ ] One commit per checkbox in `plan.md` — no batched commits mixing Group A and Group B tasks
- [ ] Commit messages follow the convention: `feat(authoring): add generation-status component`
- [ ] Each commit includes the roadmap checkbox tick alongside the implementation

---

## Merge Criteria Summary

| Category              | Criterion                                               | Required |
|-----------------------|---------------------------------------------------------|----------|
| Build & lint          | Zero TS errors, zero boundary violations                | ✅ Hard  |
| Status component      | All 4 phase states render correctly                     | ✅ Hard  |
| Wizard handoff        | Trigger → status transition works; polling stops on ready/failed | ✅ Hard |
| Course detail         | All 5 status states render; creator actions gated; student redirect | ✅ Hard |
| Design tokens         | `font-serif` for content, `font-sans` for chrome, status badge used | ✅ Hard |
| Context file sync     | Roadmap + progress-tracker updated and committed        | ✅ Hard  |
| Error states          | Failed generation + network error both handled gracefully | ✅ Hard |
| Phase 7 boundary      | Publish button is a stub; no Phase 7 code smuggled in   | ✅ Hard  |
