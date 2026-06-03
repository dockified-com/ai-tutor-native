# Validation — Phase 2: Generation Pipeline & Status UI

> This phase is done and mergeable when **all** criteria below pass.

---

## 1. TypeScript & Lint

- [ ] `npm run build` exits with 0 errors (no TypeScript errors)
- [ ] `npm run lint` exits with 0 errors — specifically no `eslint-plugin-boundaries` violations (no `features/authoring` importing from `features/courses` or vice versa)
- [ ] `npm run type-check` clean (if separate from build)

---

## 2. Generation Status Component — `generation-status.tsx`

### Render validation (manual)

- [ ] With `currentPhase = 'extracting_pdf'`: only the first row is active (spinner), all others are pending (dim)
- [ ] With `currentPhase = 'generating_lesson_2'` and `totalLessons = 5`: rows 1–3 show ✓, row 4 shows spinner + label "Generating lesson 2 of 5…", row 5 is pending
- [ ] With `currentPhase = 'ready'`: all rows show ✓, the card transitions to emerald background, "Your course is ready!" heading appears, CTA button is visible
- [ ] With `currentPhase = 'failed'` (error state): error message visible, "Try again" button visible
- [ ] The spinner icon animates (Loader2 spin class applied)
- [ ] Phase advance is animated (completed row transitions from spinner to checkmark with fade-in)
- [ ] No layout shift when phase changes

### Export validation

- [ ] `GenerationStatus` is exported from `features/authoring/index.ts`
- [ ] Import in Step 3 uses the public index, not a direct internal path

---

## 3. Wizard Step 3 — Generation Trigger + Status Handoff

- [ ] Clicking the "Generate" button calls the `create-course.ts` Server Action and receives a `courseId`
- [ ] After the action resolves, the step view switches from trigger UI to status UI (no page reload)
- [ ] `use-generation-status.ts` SWR hook begins polling `GET /api/courses/{id}/status` every 3 s
- [ ] `generation-status.tsx` receives live `currentPhase` updates as polling returns new data
- [ ] Polling stops automatically when `status === 'ready'` or `status === 'failed'`
- [ ] "Try again" on failure resets WizardStore and returns to Step 1

---

## 4. Course Detail Page — `app/courses/[id]/page.tsx`

### Status-gated display

- [ ] `status === 'generating'`: `generation-status.tsx` renders in the page body with live phase
- [ ] `status === 'ready'`: lesson list renders; each lesson row shows title, block count, status chip
- [ ] `status === 'published'`: lesson list renders + published badge visible in the page header
- [ ] `status === 'failed'`: error state shown with a "Regenerate" CTA (stub — shows toast in Phase 2)
- [ ] `status === 'draft'`: shows a "Course is being set up" placeholder (not generation status)

### Creator actions (`status === 'ready'` or `'published'`)

- [ ] `[Preview]` button is visible to creators; clicking navigates to `/courses/[id]/preview` (page may be empty in Phase 2)
- [ ] `[Publish]` button is visible to creators; in Phase 2, clicking shows Sonner toast: *"Publish flow coming soon."*
- [ ] Both buttons are **not visible** to students (role-guard correctly applied)

### Student redirect

- [ ] Student visiting `/courses/[id]` when `status === 'published'` is redirected to the first lesson (`/courses/[id]/lesson/[lesson_id]`)
- [ ] Student visiting `/courses/[id]` when `status !== 'published'` sees "This course isn't available yet." (no crash, no empty page)

### Design tokens

- [ ] Lesson titles use `font-serif font-medium`
- [ ] Chrome (page heading, action bar) uses `font-sans`
- [ ] `CourseStatusBadge` component is used for the course-level status chip

---

## 5. Context File Sync

- [ ] All Phase 2 task checkboxes in `roadmap.md` are ticked (`[x]`)
- [ ] `progress-tracker.md` reflects:
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
