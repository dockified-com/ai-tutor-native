# Requirements — Phase 2: Generation Pipeline & Status UI

> Roadmap: `roadmap.md` → Phase 2, Week 2
> Branch: `feature/phase-2-generation-pipeline-status-ui`
> Design reference: `docs/superpowers/specs/2026-05-30-ai-native-tutor-design.md`

---

## Scope

Phase 2 is a **primarily frontend week**. The backend generation pipeline (PDF extraction, embedding, LLM outline, audio) is assumed to be running. The frontend's job is to:

1. Show live generation progress to the creator inside Wizard Step 3.
2. Show the completed course detail (lesson list + action bar) once generation is done.

This phase has **no new backend endpoints** beyond what is already contracted in the API spec. It builds on:
- `use-generation-status.ts` (SWR polling hook — defined in Phase 1 roadmap but potentially not yet implemented)
- `create-course.ts` Server Action (Phase 1, Group D)
- `role-guard.tsx` (Phase 1, Group B)
- `course-status-badge.tsx` (Phase 1, Group C)

---

## Feature: Generation Status Component

### What it does

A multi-phase progress indicator rendered inside Wizard Step 3 after the user triggers course generation. Shows the creator exactly where the pipeline is.

### Phases (ordered)

| Phase key               | Display label                          |
|-------------------------|----------------------------------------|
| `extracting_pdf`        | Extracting PDF content…                |
| `embedding`             | Building knowledge index…              |
| `generating_outline`    | Generating course outline…             |
| `generating_lesson_N`   | Generating lesson {N} of {total}…      |
| `generating_audio`      | Generating audio narration…            |
| `ready`                 | Your course is ready! 🎉               |

### Polling contract

**Decision:** SWR poll every 3 s against `GET /api/courses/{id}/status`.

Expected response shape:
```ts
{
  status: 'draft' | 'generating' | 'ready' | 'published' | 'failed';
  current_phase: string;       // e.g. "generating_lesson_2"
  total_lessons: number;       // for progress calculation in generating_lesson_N
}
```

The `use-generation-status.ts` hook owns this polling. It should stop polling once `status === 'ready'` or `status === 'failed'`.

### Error handling

- `status === 'failed'`: Show error message. Provide a "Try again" button that resets the wizard to Step 1 (clears WizardStore).
- Network error during polling: show a subtle "Reconnecting…" message; do not unmount the status display.

### Animation requirements

- Active phase row: spinning `Loader2` icon (16px, emerald-600) + text label with `animate-pulse` on the label.
- Completed phase row: `CheckCircle2` icon (16px, emerald-500) + strikethrough or dimmed label.
- Pending phase rows: dim circle placeholder (slate-200) + label at opacity-40.
- On phase advance: the newly completed row transitions from spinner → checkmark with a `fade-in` (0.3 s ease-out). No jarring jumps.
- Ready state: the entire card background transitions to `bg-emerald-50 border-emerald-200`.

---

## Feature: Course Detail Page (`app/courses/[id]/page.tsx`)

### Scope

This page serves **two distinct views** based on `course.status` and `user.role`.

### Status-driven display

| `course.status`            | What the page shows                                     |
|----------------------------|---------------------------------------------------------|
| `draft` / `generating`     | Generation status component (or generating spinner)     |
| `ready`                    | Lesson list + Creator action bar                        |
| `published`                | Lesson list + Published banner + Creator action bar     |
| `failed`                   | Error state + Regenerate CTA                            |

### Role-driven actions (`status === 'ready'` or `'published'`)

| Role      | Actions shown                                                        |
|-----------|----------------------------------------------------------------------|
| `creator` | `[Preview]` button (navigates to `/courses/[id]/preview`) + `[Publish]` button |
| `student` | Auto-redirect to first lesson (`/courses/[id]/lesson/[lesson_id]`) when `status === 'published'`. If `status !== 'published'`, show "This course isn't available yet." |

### Lesson list (creator view)

Each lesson row shows:
- Lesson title (`font-serif font-medium`)
- Block count (`N blocks`)
- A `CourseStatusBadge`-style chip for the lesson's own status (if applicable)

### Decision: Publish action in Phase 2

`[Publish]` button in this phase is a **stub** — it renders the button with correct styling but its action (`publish-course.ts`) is Phase 7 work. In Phase 2, clicking it should show a Sonner toast: *"Publish flow coming soon."* The button must be wired correctly via `role-guard.tsx` so only creators see it.

---

## Out of Scope (Phase 2)

- The full `publish-course.ts` Server Action (Phase 7)
- Preview banner (`preview-banner.tsx`) (Phase 7)
- Student join flow (Phase 7)
- Lesson regeneration modal (Phase 7)
- Any new Zustand store additions (Phase 3+)
- Backend implementation of the generation pipeline itself

---

## Context & Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Polling vs SSE for generation status | SWR polling every 3 s | Simpler to implement, acceptable latency for a multi-minute pipeline. SSE is reserved for token-by-token AI streaming (Phases 4–5). |
| Course Detail role routing | Creator sees lesson list + action bar; Student auto-redirects to first lesson | Aligns with the product design — students don't manage courses, they consume them. |
| Publish button in Phase 2 | Stub with toast | Keeps Phase 2 self-contained; full publish flow (copy-to-clipboard join code, Sonner toast, Clerk role check) belongs to Phase 7 as a cohesive unit. |
| `generation-status.tsx` as standalone component | ✅ Yes — exported from `features/authoring/index.ts` | Allows reuse in `app/courses/[id]/page.tsx` for `status === 'generating'` case without duplicating logic. |

---

## Files Created / Modified

### New files
- `features/authoring/components/generation-status.tsx`

### Modified files
- `features/authoring/components/creation-wizard/step-generate.tsx` (or `step-3.tsx`) — wire status display
- `app/courses/[id]/page.tsx` — full RSC implementation
- `features/authoring/index.ts` — export `GenerationStatus`
- `frontend/context/roadmap.md` — tick Phase 2 checkboxes as tasks complete
- `frontend/context/progress-tracker.md` — update current phase + completed

### Files that must already exist (Phase 1 dependencies)
- `features/authoring/hooks/use-generation-status.ts`
- `features/authoring/actions/create-course.ts`
- `features/auth/components/role-guard.tsx`
- `features/courses/components/course-status-badge.tsx`
- `shared/api/client.ts`
