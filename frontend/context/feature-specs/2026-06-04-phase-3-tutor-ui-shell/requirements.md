# Requirements — Phase 3: Tutor UI Shell

> Roadmap: `roadmap.md` → Phase 3, Week 3
> Branch: `feature/phase-3-tutor-ui-shell`
> Design references: `frontend/context/ui-context.md`, `frontend/context/feature-system.md`

---

## Scope

Phase 3 delivers the **skeleton of the tutor experience** — the 4-zone layout, the Zustand
store, all block components needed to render a lesson, the workspace shell, nav rail, and
both sidebars. Audio playback, code execution, chat, and understanding checks are **not**
in scope (Phases 4–6). The goal is a working, navigable lesson page where a creator can
see the full UI structure with real block data.

### What ships in Phase 3

| Area | Deliverable |
|---|---|
| Zustand store | `TutorStore` — full state shape (stub fields for Phases 4/5) + core actions |
| Layout | `TutorLayout` — 4-zone CSS shell, no business logic |
| Block components | `MarkdownBlock`, `MermaidBlock`, `ConceptCheckBlock` |
| Lesson feed | `LessonFeed` + `ContinueButton` with `fade-in-up` reveal |
| Workspace | `WorkspaceShell` + `MermaidWorkspace` + `EmptyWorkspace` |
| Nav & sidebars | `NavRail` + `CourseProgressSlideout` + `NotesSlideout` |
| Progress actions | `mark-block-complete.ts` + `update-bookmark.ts` |
| Route | `app/courses/[id]/lesson/[lesson_id]/page.tsx` RSC |

### What is explicitly out of scope

- `CodeBlock` + `MonacoWorkspace` (Phase 4)
- `AskFooter` / chat history (Phase 5)
- `UnderstandingCheckBlock` (Phase 5)
- TTS audio hooks and controls (Phase 6)
- Real progress % in slideout (Phase 6)
- My Notes persistence (V2)

---

## Layout Zones — Exact Dimensions

```
┌─────────────────────────────────────────────────────────────┐
│  Left pane (w-450px)  │  Workspace (flex-1)  │ Drawer (320) │ Rail (56) │
│  LessonFeed           │  WorkspaceShell       │ conditional  │           │
│  ContinueButton       │                       │              │           │
│  AskFooter (stub)     │                       │              │           │
└─────────────────────────────────────────────────────────────┘
```

| Zone | Width | Overflow | Notes |
|---|---|---|---|
| Left pane | `w-[450px] shrink-0` | `overflow-hidden` | Scrolls internally |
| Workspace | `flex-1 min-w-0` | `overflow-hidden` | Grows to fill |
| Drawer | `w-[320px] shrink-0` | `overflow-y-auto` | Conditional — hidden when `activeSidebar === null` |
| Nav rail | `w-14 shrink-0` | none | Icon strip only |

**Decision**: Drawer sits **between** workspace and nav rail — it pushes the workspace narrower,
never overlays it. No z-index stacking for the drawer.

---

## TutorStore — Full State Shape

```ts
interface TutorState {
  // Core lesson state
  blocks: Block[];
  revealedIndex: number;        // index of last revealed block in blocks[]
  activeBlockId: string | null; // drives left pane highlight + right pane

  // Sidebar
  activeSidebar: 'progress' | 'notes' | null;

  // Audio (Phase 6 — stub here)
  audio: {
    url: string | null;
    playing: boolean;
    speed: 0.5 | 0.75 | 1.0 | 1.25 | 1.5;
    autoContinue: boolean;
    volume: number; // 0.0–1.0
  };

  // Block interaction state — Phase 3 scope
  conceptAnswers: Record<string, string>;       // blockId → selected option string

  // Block interaction state — Phase 4 stubs (typed, never written in Phase 3)
  codeValues: Record<string, string>;
  terminalOutputs: Record<string, TerminalOutput | null>;
  codeAttempts: Record<string, number>;
  hints: Record<string, string | null>;
  roasts: Record<string, RoastState | null>;

  // Block interaction state — Phase 5 stubs
  chatHistory: Array<{ role: 'user' | 'ai'; text: string }>;
  askInput: string;
  understandingResponse: Record<string, string>;
  understandingFeedback: Record<string, string>;
  understandingPassed: Record<string, boolean>;
  understandingAttempts: Record<string, number>;

  // Actions
  revealNext: () => void;
  setActiveBlock: (id: string) => void;
  setActiveSidebar: (val: 'progress' | 'notes' | null) => void;
  resetLesson: (blocks: Block[], startIndex: number) => void;
  setConceptAnswer: (blockId: string, answer: string) => void;
}
```

**Decision**: Stub fields for Phases 4/5 are typed in the store from the start. This prevents
brittle partial rewrites later and means Phase 4/5 only need to wire actions — the state
shape is already correct. They are never set to non-default values in Phase 3.

---

## Block Components — Token Decisions

### All block components share

| Property | Value |
|---|---|
| Active accent | `border-l-2 border-emerald-400 pl-4` |
| Past-block dim | `opacity-60 transition-opacity` |
| Reveal animation | `fade-in-up` keyframe, 0.4s ease-out, applied via className |
| Wrapper padding | `py-3 px-0` (feed handles horizontal padding) |

### `MarkdownBlock`

| Property | Value |
|---|---|
| Font | `font-serif leading-relaxed text-[15px] text-slate-800` |
| Prose links | `text-emerald-600 underline-offset-2` |
| Code spans | `font-mono text-sm bg-slate-100 px-1 rounded` |
| Renderer | `react-markdown` — confirm package; install if missing |

### `MermaidBlock`

| Property | Value |
|---|---|
| Container | `rounded-lg border border-slate-200 overflow-hidden p-4 bg-white` |
| Error fallback | `text-slate-500 text-sm italic` with block_id in console |
| Click behavior | Sets `activeBlockId` → right pane switches to `'mermaid'` |

### `ConceptCheckBlock`

| Property | Value |
|---|---|
| Question text | `font-serif font-medium text-slate-800 mb-3` |
| Idle option | `bg-white border border-slate-300 rounded-lg px-4 py-2 hover:border-emerald-500 hover:text-emerald-700` |
| Correct option | `bg-emerald-50 border-emerald-500 text-emerald-800` |
| Wrong option | `bg-red-50 border-red-300 text-red-800` |
| Other options | `opacity-50 cursor-not-allowed` |
| Explanation | `font-serif italic text-slate-600 text-sm mt-3` |
| One-shot rule | No retry, no second chance. Continue enables whether correct or wrong. |

---

## Sidebar Animation

**Decision**: Use shadcn `Sheet` component for both sidebars. Animation:
- Mount: `animate-slide-left` (custom keyframe: `translateX(320px) → translateX(0)` over 0.25s ease-out)
- Exit: No exit animation in V1 (instant unmount)

The animation class should be defined in `app/globals.css` as a keyframe + utility class:

```css
@keyframes slide-left {
  from { transform: translateX(320px); }
  to   { transform: translateX(0); }
}
.animate-slide-left {
  animation: slide-left 0.25s ease-out;
}
```

---

## Right Pane — Derivation Rules

The right pane is a **pure derivation** from `activeBlockId`. No side effects.

| Active block type | Right pane renders |
|---|---|
| `code` | `MonacoWorkspace` (Phase 4 — stub: show empty-workspace for now) |
| `mermaid` | `MermaidWorkspace` |
| `markdown` | No change (keep current pane) |
| `concept_check` | No change (keep current pane) |
| `understanding_check` | No change (keep current pane) |
| `null` | `EmptyWorkspace` |

**Phase 3 stub rule**: Since `MonacoWorkspace` ships in Phase 4, a `code` block active in Phase 3
should render `EmptyWorkspace` with a label `"Code editor — coming in Phase 4"`. This prevents
a broken workspace from blocking Phase 3 merge.

---

## Continue Button Gating (Phase 3 scope)

`use-block-gating.ts` ships in Phase 5. For Phase 3, inline the gating directly in `continue-button.tsx`:

```ts
// Phase 3 inline gating (will be extracted in Phase 5)
function isContinueEnabled(activeBlock: Block, state: TutorState): boolean {
  switch (activeBlock.type) {
    case 'markdown':       return true;
    case 'mermaid':        return true;
    case 'concept_check':  return !!state.conceptAnswers[activeBlock.id];
    case 'code':           return false; // Phase 4
    case 'understanding_check': return false; // Phase 5
  }
}
```

---

## Dependencies That Must Already Exist

From Phase 1 (required — do not stub these):

| File | Status check |
|---|---|
| `shared/api/client.ts` | ✅ Complete per roadmap |
| `features/auth/hooks/use-app-user.ts` | ✅ Complete per roadmap |
| `features/auth/components/role-guard.tsx` | May still be a Phase 1 TODO — implement if missing |
| `app/globals.css` token system | May still be a Phase 1 TODO — `animate-slide-left` keyframe needed |
| shadcn Sheet, Tabs, Progress, Skeleton | Must be installed (`npx shadcn@latest add sheet tabs progress skeleton`) |

From Phase 2 (required):
| File | Status check |
|---|---|
| `app/courses/[id]/page.tsx` | ✅ Complete per roadmap |

---

## Files Created / Modified

### New files (Phase 3)
- `features/tutor/stores/tutor-store.ts`
- `features/tutor/components/tutor-layout.tsx`
- `features/tutor/components/lesson-feed.tsx`
- `features/tutor/components/continue-button.tsx`
- `features/tutor/components/nav-rail.tsx`
- `features/tutor/components/course-progress-slideout.tsx`
- `features/tutor/components/notes-slideout.tsx`
- `features/tutor/components/blocks/markdown-block.tsx`
- `features/tutor/components/blocks/mermaid-block.tsx`
- `features/tutor/components/blocks/concept-check-block.tsx`
- `features/tutor/lib/derive-right-pane.ts`
- `features/tutor/components/workspace/workspace-shell.tsx`
- `features/tutor/components/workspace/mermaid-workspace.tsx`
- `features/tutor/components/workspace/empty-workspace.tsx`
- `features/progress/actions/mark-block-complete.ts`
- `features/progress/actions/update-bookmark.ts`
- `app/courses/[id]/lesson/[lesson_id]/page.tsx`
- `features/tutor/index.ts` (public barrel export)

### Modified files
- `app/globals.css` — add `animate-slide-left` keyframe + `fade-in-up` keyframe (if not already present)
- `frontend/context/roadmap.md` — tick Phase 3 checkboxes as tasks complete
- `frontend/context/progress-tracker.md` — update current phase

---

## Context & Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Drawer layout | Pushes workspace narrower (no overlay) | Consistent with `feature-system.md` §12 spec; overlay drawers feel mobile-native, not desktop-app |
| Store stub fields | Typed but unused in Phase 3 | Avoids breaking store shape rewrites in Phase 4/5; one source of truth for state |
| Monaco stub in Phase 3 | EmptyWorkspace with label | Keeps Phase 3 self-contained; MonacoWorkspace is Phase 4 scope |
| `use-block-gating.ts` | Inline gating in Phase 3, extract in Phase 5 | The hook makes most sense as a unit alongside the Phase 5 understanding check flow |
| Mermaid package | `mermaid` (npm) not `react-mermaid` | More control over `mermaid.initialize()` config; react wrappers add abstraction without benefit |
| Sheet vs custom drawer | shadcn `Sheet` | Accessible out of the box (focus trap, Esc key), matches existing shadcn usage pattern |
| `fade-in-up` keyframe | Defined in `globals.css` | Reusable animation token consistent with design system approach; not inline |
