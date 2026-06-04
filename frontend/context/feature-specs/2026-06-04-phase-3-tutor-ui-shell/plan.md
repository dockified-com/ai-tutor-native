# Plan — Phase 3: Tutor UI Shell

> Branch: `feature/phase-3-tutor-ui-shell`
> Roadmap reference: `roadmap.md` → Phase 3, Week 3

---

## Group A — Sequential: Core Store & Layout Shell *(start here)*

Group A must be fully complete before any other group starts. Both tasks can be worked
on by the same developer in order — the store drives the layout, so finish the store first.

### 1. Install Mermaid

- [ ] **1.1** Run `npm install mermaid` — confirm the package resolves without peer-dep conflicts
- [ ] **1.2** Confirm `@monaco-editor/react` is NOT installed yet (belongs to Phase 4) — do not pull it in here

### 2. `features/tutor/stores/tutor-store.ts`

- [ ] **2.1** Create file under `features/tutor/stores/`
- [ ] **2.2** Define the full `TutorState` interface (see `requirements.md` §State Shape)
- [ ] **2.3** Implement Zustand store with `create<TutorState>()(...)`:
  - `revealedIndex`, `activeBlockId`, `blocks` array
  - `audio` sub-object (url, playing, speed, autoContinue, volume)
  - `activeSidebar: 'progress' | 'notes' | null`
  - `conceptAnswers`, `understandingResponse`, `understandingFeedback`, `understandingPassed`, `understandingAttempts`
  - Stub fields for Phase 4/5: `codeValues`, `terminalOutputs`, `codeAttempts`, `hints`, `roasts`, `chatHistory`, `askInput`
- [ ] **2.4** Implement actions: `revealNext()`, `setActiveBlock(id)`, `setActiveSidebar(val)`, `resetLesson(blocks, startIndex)`
- [ ] **2.5** Export `useTutorStore` from `features/tutor/index.ts`
- [ ] **2.6** TypeScript: zero `any` — all state fields fully typed

### 3. `features/tutor/components/tutor-layout.tsx`

- [ ] **3.1** Create 4-zone layout shell using CSS grid or flex (see `requirements.md` §Layout Zones)
- [ ] **3.2** Zone: Left pane — `w-[450px] shrink-0 flex flex-col overflow-hidden`
- [ ] **3.3** Zone: Right pane — `flex-1 min-w-0 flex flex-col overflow-hidden`
- [ ] **3.4** Zone: Drawer — conditional `w-[320px] shrink-0` (visible when `activeSidebar !== null`)
- [ ] **3.5** Zone: Nav rail — `w-14 shrink-0 flex flex-col items-center py-4 gap-3`
- [ ] **3.6** Accept `children` props for each zone as render props or named slot props: `leftSlot`, `rightSlot`, `drawerSlot`, `navSlot`
- [ ] **3.7** The drawer must sit between workspace and nav rail (not overlaying workspace)
- [ ] **3.8** Export from `features/tutor/index.ts`

---

## Group B — Parallel: Block Components *(needs Group A store done)*

All three block components can be developed in parallel. Each is a self-contained component
that reads block data from props and dispatches to `useTutorStore`.

### 4. `features/tutor/components/blocks/markdown-block.tsx`

- [ ] **4.1** Create component; accept `block: MarkdownBlock` prop
- [ ] **4.2** Apply: `font-serif leading-relaxed text-[15px] text-slate-800`
- [ ] **4.3** Render `block.content.text` via `react-markdown` (or basic HTML — confirm package availability)
- [ ] **4.4** Active state: `border-l-2 border-emerald-400` left accent when `activeBlockId === block.id`
- [ ] **4.5** Past block dim: `opacity-60` when block index < revealedIndex and not active

### 5. `features/tutor/components/blocks/mermaid-block.tsx`

- [ ] **5.1** Create component; accept `block: MermaidBlock` prop
- [ ] **5.2** Use `mermaid.render()` inside a `useEffect` — render SVG into a container `div`
- [ ] **5.3** Error state: catch `mermaid.render` exceptions; render `"Diagram could not be rendered"` with `block.id` logged to console (per error table in `feature-system.md`)
- [ ] **5.4** Active highlight: same `border-l-2 border-emerald-400` pattern as markdown-block
- [ ] **5.5** On click → sets `activeBlockId` in TutorStore → right pane will re-derive to `'mermaid'`

### 6. `features/tutor/components/blocks/concept-check-block.tsx`

- [ ] **6.1** Create component; accept `block: ConceptCheckBlock` prop
- [ ] **6.2** Render question text (`font-serif font-medium`) + answer option buttons
- [ ] **6.3** Idle button style: `bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700`
- [ ] **6.4** On select: disable all buttons (`hasAnswered = true`), store answer in `conceptAnswers[block.id]`
  - Correct: `bg-emerald-50 border-emerald-500 text-emerald-800`
  - Wrong: `bg-red-50 border-red-300 text-red-800`
  - Other options: `opacity-50`
- [ ] **6.5** Show explanation text below (`font-serif italic text-slate-600`) after selection
- [ ] **6.6** Fire `POST /api/blocks/{id}/concept-check` (fire-and-forget; no state dependency on response)

---

## Group C — Parallel: Lesson Feed *(needs Group A + B)*

### 7. `features/tutor/components/lesson-feed.tsx`

- [ ] **7.1** Create scrollable feed container: `flex flex-col gap-6 overflow-y-auto px-6 py-4`
- [ ] **7.2** Map `blocks[0..revealedIndex]` → render correct block component per `block.type`
- [ ] **7.3** Apply `fade-in-up` animation (0.4s ease-out) to the **newest** block when it appears
- [ ] **7.4** Click-to-jump: clicking any past block sets `activeBlockId`; blocks after `activeBlockId` get `opacity-60`
- [ ] **7.5** \"Return to current\" pill: appears (top-right of feed) when `activeBlockId !== blocks[revealedIndex].id`; click resets `activeBlockId` to current
- [ ] **7.6** Render `chatHistory` entries after all revealed blocks, separated by `border-t border-slate-100` (stub rendering — full chat wiring is Phase 5)

### 8. `features/tutor/components/continue-button.tsx`

- [ ] **8.1** Create component; reads `revealedIndex`, `blocks`, store state from `useTutorStore`
- [ ] **8.2** Style: `rounded-full` pill button, emerald fill, show block count badge (`N blocks remaining` or similar)
- [ ] **8.3** Label logic: `"Continue"` for all blocks except final `understanding_check` → `"Next Lesson"` (or `"Course Complete"` on final lesson)
- [ ] **8.4** Enabled/disabled derived from `isContinueEnabled()` logic — for Phase 3 only `markdown` and `mermaid` always return `true`; `concept_check` requires `conceptAnswers[block.id]` to be set; others return `false` (Phase 4/5 will fill these in)
- [ ] **8.5** On click: calls `revealNext()` from store; scrolls feed to new block

---

## Group D — Parallel: Workspace *(needs Group A store)*

### 9. `features/tutor/lib/derive-right-pane.ts`

- [ ] **9.1** Create pure function `deriveRightPane(block: Block | null): 'monaco' | 'mermaid' | 'empty'`
- [ ] **9.2** Logic: `code` → `'monaco'`; `mermaid` → `'mermaid'`; anything else → `'empty'`
- [ ] **9.3** 100% covered by TypeScript — no `any`; exhaustive switch

### 10. `features/tutor/components/workspace/workspace-shell.tsx`

- [ ] **10.1** Subscribe to `activeBlockId` from `useTutorStore`
- [ ] **10.2** Call `deriveRightPane(activeBlock)` → render the matching child component
- [ ] **10.3** Workspace does NOT change for `markdown`, `concept_check`, or `understanding_check` clicks (right pane is sticky to last `code`/`mermaid` block)

### 11. `features/tutor/components/workspace/mermaid-workspace.tsx`

- [ ] **11.1** Render the active `MermaidBlock`'s diagram at full workspace size
- [ ] **11.2** Same mermaid render logic as `mermaid-block.tsx` but larger canvas, centered
- [ ] **11.3** Error state: `"Diagram could not be rendered"` panel

### 12. `features/tutor/components/workspace/empty-workspace.tsx`

- [ ] **12.1** Render: Hand icon (Lucide) + heading `"Welcome to the Course!"`
- [ ] **12.2** Styled: centered vertically + horizontally in the right pane, muted slate palette

---

## Group E — Parallel: Nav & Sidebars *(needs Group A layout)*

### 13. `features/tutor/components/nav-rail.tsx`

- [ ] **13.1** Create `w-14` vertical icon strip
- [ ] **13.2** Icons (Lucide): `PieChart` (progress), `FileText` (notes), `Globe` (TBD), `Settings`
- [ ] **13.3** Click `PieChart` → toggle `activeSidebar = 'progress'`; click `FileText` → toggle `activeSidebar = 'notes'`
- [ ] **13.4** Active icon: filled or highlighted ring; inactive: `text-slate-400 hover:text-slate-600`

### 14. `features/tutor/components/course-progress-slideout.tsx`

- [ ] **14.1** Use shadcn `Sheet`, `w-[320px]`, open when `activeSidebar === 'progress'`
- [ ] **14.2** Animation: `animate-slide-left` on mount (no exit animation in V1)
- [ ] **14.3** Content: static curriculum tree — lesson titles listed, current lesson highlighted
- [ ] **14.4** Overall enrollment progress % bar (static placeholder value in Phase 3 — real data in Phase 6)
- [ ] **14.5** `X` button → sets `activeSidebar = null`

### 15. `features/tutor/components/notes-slideout.tsx`

- [ ] **15.1** Use shadcn `Sheet`, `w-[320px]`, open when `activeSidebar === 'notes'`
- [ ] **15.2** Same `animate-slide-left` pattern
- [ ] **15.3** `Tabs` component: `"Instructor Notes"` tab | `"My Notes"` tab
  - Instructor Notes: read-only lesson notes text (static placeholder in Phase 3)
  - My Notes: read-only display (live textarea with persistence is V2)
- [ ] **15.4** `X` button → sets `activeSidebar = null`

---

## Group F — Sequential: Progress Actions & Route *(needs Group C + D done)*

### 16. `features/progress/actions/mark-block-complete.ts`

- [ ] **16.1** Server Action: `POST /api/progress/blocks/{id}/complete` via `apiClient`
- [ ] **16.2** Called from `continue-button.tsx` on each `revealNext()` (fire-and-forget)
- [ ] **16.3** Accept `blockId: string, enrollmentId: string`

### 17. `features/progress/actions/update-bookmark.ts`

- [ ] **17.1** Server Action: `PATCH /api/enrollments/{id}/bookmark` via `apiClient`
- [ ] **17.2** Body: `{ block_id: string }` — the newly revealed block's id
- [ ] **17.3** Called in `continue-button.tsx` after `mark-block-complete` (fire-and-forget)

### 18. `app/courses/[id]/lesson/[lesson_id]/page.tsx`

- [ ] **18.1** RSC: fetch blocks for `lesson_id` + enrollment progress for `enrollmentId` via `apiClient`
- [ ] **18.2** Derive `startIndex` from bookmark (`block_progress` rows)
- [ ] **18.3** Initialize `TutorStore` with fetched blocks + `startIndex` (via a client component wrapper)
- [ ] **18.4** Render `TutorLayout` with all zones populated:
  - Left: `LessonFeed` + `ContinueButton` + `AskFooter` stub (Phase 5)
  - Right: `WorkspaceShell`
  - Drawer: `CourseProgressSlideout` | `NotesSlideout` (conditional)
  - Nav: `NavRail`
- [ ] **18.5** Handle loading state: skeleton placeholders for feed and workspace
- [ ] **18.6** Handle 404: lesson not found → redirect to `/courses/[id]`

---

## Commit Checklist (per `ai-workflow-rules.md`)

After each task group above is done and verified:

- [ ] Tick corresponding checkboxes in `roadmap.md` Phase 3
- [ ] Update `progress-tracker.md` → Current Phase + Completed section
- [ ] `npm run build` — zero TypeScript errors
- [ ] `npm run lint` — no boundary violations
- [ ] One `git commit` per checkbox (see commit message convention in `ai-workflow-rules.md`)
