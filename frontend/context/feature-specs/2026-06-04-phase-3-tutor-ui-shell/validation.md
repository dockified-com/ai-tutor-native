# Validation — Phase 3: Tutor UI Shell

> This phase is done and mergeable when **all** criteria below pass.

---

## 1. TypeScript & Lint

- [ ] `npm run build` exits with 0 errors (zero TypeScript errors, zero missing imports)
- [ ] `npm run lint` exits with 0 errors — specifically no `eslint-plugin-boundaries` violations
  - `features/tutor` must not import from `features/authoring` or `features/enrollment`
  - `features/progress` must not import from `features/tutor`
  - `app/` routes may import from any `features/` module (this is the allowed direction)
- [ ] `npm run type-check` clean (if a separate script exists)
- [ ] Zero `any` types in `tutor-store.ts` or `derive-right-pane.ts`

---

## 2. TutorStore — `features/tutor/stores/tutor-store.ts`

- [ ] `useTutorStore()` is importable from `features/tutor/index.ts`
- [ ] `resetLesson(blocks, 0)` correctly sets `revealedIndex = 0`, `activeBlockId = blocks[0].id`
- [ ] `revealNext()` increments `revealedIndex` and sets `activeBlockId = blocks[revealedIndex].id`
- [ ] `setActiveBlock(id)` updates `activeBlockId` without changing `revealedIndex`
- [ ] `setActiveSidebar('progress')` sets `activeSidebar = 'progress'`; calling again with `'progress'` sets it to `null` (toggle behavior)
- [ ] `setConceptAnswer(blockId, answer)` writes to `conceptAnswers[blockId]` without mutating other state
- [ ] All Phase 4/5 stub fields exist on the store type (even if never written)

---

## 3. Layout Shell — `TutorLayout`

- [ ] 4 zones render side-by-side with no overlap
- [ ] Left pane is exactly `450px` wide (check in browser DevTools)
- [ ] Nav rail is exactly `56px` wide (`w-14`)
- [ ] Workspace fills remaining horizontal space (`flex-1`)
- [ ] Drawer (`320px`) is visible between workspace and nav rail when `activeSidebar !== null`
- [ ] No scroll on the outer layout — each zone manages its own scroll independently
- [ ] `TutorLayout` is exported from `features/tutor/index.ts`

---

## 4. Block Components

### `MarkdownBlock`

- [ ] `font-serif leading-relaxed text-[15px]` classes applied to text content
- [ ] Active block (`activeBlockId === block.id`): `border-l-2 border-emerald-400` accent visible
- [ ] Past block (index < revealedIndex, not active): renders at `opacity-60`
- [ ] Newly revealed block plays `fade-in-up` animation (check for keyframe in DevTools)

### `MermaidBlock`

- [ ] Valid Mermaid syntax renders a diagram SVG inside the component
- [ ] Invalid Mermaid syntax: renders `"Diagram could not be rendered"` text (not a crash)
- [ ] `block.id` is logged to console on render error
- [ ] Clicking the block sets `activeBlockId` in store → right pane switches to `MermaidWorkspace`

### `ConceptCheckBlock`

- [ ] Question text renders with `font-serif font-medium`
- [ ] Clicking the correct option: button turns emerald, explanation appears, all buttons disabled
- [ ] Clicking the wrong option: clicked button turns red, explanation appears, all buttons disabled
- [ ] Non-selected options: `opacity-50`
- [ ] `conceptAnswers[block.id]` is set in store after any selection
- [ ] Fire-and-forget `POST /api/blocks/{id}/concept-check` is called (check Network tab)
- [ ] Continue button becomes enabled after any selection (correct or wrong)

---

## 5. Lesson Feed — `LessonFeed` + `ContinueButton`

- [ ] Feed renders all blocks from `blocks[0]` to `blocks[revealedIndex]` in order
- [ ] Clicking `ContinueButton` reveals the next block with `fade-in-up` animation
- [ ] New block is scrolled into view after reveal
- [ ] Clicking a past block (index < revealedIndex) sets `activeBlockId` to that block
- [ ] After click-to-jump: blocks after `activeBlockId` have `opacity-60`
- [ ] `"Return to current"` pill appears when `activeBlockId !== blocks[revealedIndex].id`
- [ ] Clicking `"Return to current"` restores `activeBlockId` to current block and removes `opacity-60` from all
- [ ] `ContinueButton` label: `"Continue"` for non-final blocks; `"Next Lesson"` for final `understanding_check`
- [ ] `ContinueButton` is **disabled** for `concept_check` until an option is selected
- [ ] `ContinueButton` is **disabled** for `code` and `understanding_check` in Phase 3 (always disabled — Phase 4/5 will enable)

---

## 6. Workspace — Right Pane

- [ ] Route to lesson page with a `mermaid` block active → right pane shows `MermaidWorkspace` with rendered diagram
- [ ] Route to lesson page with no `code`/`mermaid` block active → right pane shows `EmptyWorkspace` (Hand icon + "Welcome to the Course!")
- [ ] `MermaidWorkspace` invalid diagram → error panel ("Diagram could not be rendered"), no crash
- [ ] Clicking a `markdown` or `concept_check` block does NOT change the right pane (workspace is sticky)
- [ ] `deriveRightPane(null)` returns `'empty'` (unit testable — verify manually or with a quick test)
- [ ] Code block active in Phase 3 → renders `EmptyWorkspace` with "Code editor — coming in Phase 4" label

---

## 7. Nav Rail & Sidebars

### NavRail

- [ ] `PieChart` icon click → `activeSidebar` toggles between `'progress'` and `null`
- [ ] `FileText` icon click → `activeSidebar` toggles between `'notes'` and `null`
- [ ] Active icon: visually distinct from inactive (filled/ring/highlight)
- [ ] Opening one drawer while the other is open: second drawer opens, first closes (only one active at a time)

### CourseProgressSlideout

- [ ] Opens when `activeSidebar === 'progress'`
- [ ] Width is `320px` (check DevTools)
- [ ] Slide-in animation visible (CSS `animate-slide-left` applied)
- [ ] Static curriculum tree renders (lesson titles visible)
- [ ] Progress % bar visible (static placeholder value acceptable)
- [ ] `X` button closes the drawer (`activeSidebar = null`)

### NotesSlideout

- [ ] Opens when `activeSidebar === 'notes'`
- [ ] Two tabs: `"Instructor Notes"` and `"My Notes"` both render
- [ ] Switching tabs does not crash
- [ ] `X` button closes the drawer

---

## 8. Lesson Route — `app/courses/[id]/lesson/[lesson_id]/page.tsx`

- [ ] Route resolves: navigating to `/courses/[id]/lesson/[lesson_id]` renders the TutorLayout (no 404, no crash)
- [ ] TutorStore is initialized with blocks fetched from the API (or a mocked response during development)
- [ ] `startIndex` is derived from enrollment progress (bookmark) — first lesson defaults to `0`
- [ ] Loading state: skeleton placeholders visible while data fetches
- [ ] Invalid `lesson_id`: redirect to `/courses/[id]` (no crash, no blank page)
- [ ] All 4 zones render: feed on left, workspace on right, nav rail on far right

---

## 9. Animation & CSS

- [ ] `fade-in-up` keyframe is defined in `app/globals.css` (not inline)
- [ ] `animate-slide-left` keyframe is defined in `app/globals.css`
- [ ] `fade-in-up` animation plays on newly revealed blocks (visible in DevTools → Animations panel)
- [ ] No layout shift on block reveal (CLS = 0 for the feed area)
- [ ] No janky repaints when `activeSidebar` changes

---

## 10. Context File Sync

- [ ] All Phase 3 task checkboxes in `roadmap.md` are ticked (`[x]`)
- [ ] `progress-tracker.md` reflects:
  - **Current Phase** updated to Week 4 (or "Phase 3 complete, moving to Phase 4")
  - **Completed** section includes all Phase 3 tasks
  - **Next Up** updated to Phase 4 tasks (Monaco + Code Execution + Socratic Hints)

---

## 11. Git History

- [ ] One commit per checkbox group in `plan.md` — no batched commits mixing groups
- [ ] Commit messages follow convention: `feat(tutor): add TutorStore with full state shape`
- [ ] Each commit includes the `roadmap.md` checkbox tick alongside implementation

---

## Merge Criteria Summary

| Category | Criterion | Required |
|---|---|---|
| Build & lint | Zero TS errors, zero boundary violations | ✅ Hard |
| TutorStore | All actions work, stub fields typed | ✅ Hard |
| Layout | 4 zones correct, dimensions match spec | ✅ Hard |
| Block components | All 3 block types render + interact correctly | ✅ Hard |
| Lesson feed | Reveal, click-to-jump, return-to-current all work | ✅ Hard |
| Continue gating | Correct enabled/disabled per block type in Phase 3 scope | ✅ Hard |
| Workspace | Right pane derives correctly from active block | ✅ Hard |
| Nav & sidebars | Toggle, animate, close all work for both drawers | ✅ Hard |
| Lesson route | Route resolves, store initialised, loading + 404 handled | ✅ Hard |
| Animations | `fade-in-up` + `animate-slide-left` visible in browser | ✅ Hard |
| Phase boundary | No Monaco/SSE/audio/chat code in this branch | ✅ Hard |
| Context file sync | Roadmap + progress-tracker updated and committed | ✅ Hard |
