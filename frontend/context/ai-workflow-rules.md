# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. The `context/` files define what to build, how to build it, and the current state of progress. Always implement against these specs — do not infer or invent behavior from scratch.

The authoritative design spec lives at `docs/superpowers/specs/2026-05-30-ai-native-tutor-design.md`. The detailed implementation plans live in `docs/architecture/03_frontend_plan.md` (frontend) and `docs/architecture/04_backend_plan.md` (backend). When the context files conflict with the design spec, the design spec wins — update the context file to match.

Before writing any Next.js code, check `frontend/AGENTS.md` — this project uses Next.js 16 (App Router) which may differ from training data.

## Scoping Rules

- Work on one feature unit at a time (one feature module, or one sub-component of a feature)
- Prefer small, verifiable increments over large speculative changes
- Do not combine multiple feature modules in a single implementation step
- Do not add V2 features to V1 implementation (see `project-overview.md` → Out of Scope)
- Do not add dependencies not already in `package.json` without justification in `progress-tracker.md`

## When to Split Work

Split an implementation step if it combines:

- Frontend UI changes and backend API changes simultaneously
- Multiple unrelated feature modules (e.g. `features/tutor/` and `features/authoring/` in one step)
- A new UI component and a new Zustand store action
- Behavior not clearly defined in the context files or design spec

If a change cannot be verified end-to-end in under 5 minutes, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files or design spec
- If a requirement is ambiguous, resolve it in the relevant context file before implementing
- If a requirement is missing, add it as an open question in `progress-tracker.md` and stop — do not assume
- Pedagogical rules (never reveal answers, gate on understanding) are non-negotiable constraints, not implementation choices

## Feature Module Checklist

When building a new feature module at `features/X/`:

1. Create `features/X/index.ts` first — define what is public API
2. Internal files are `features/X/components/`, `features/X/hooks/`, `features/X/stores/`, `features/X/actions/`, `features/X/lib/`
3. No imports from `features/Y/` in any file inside `features/X/`
4. Server actions in `features/X/actions/` must call FastAPI — no direct DB access
5. All Server Actions use `'use server'` directive and retrieve Clerk token before any API call
6. Client components in `features/X/` use `'use client'` directive
7. Default to RSC (no `'use client'`) unless browser interactivity requires it

## Protected Files

Do not modify the following unless explicitly instructed:

- `shared/ui/` — shadcn/ui generated components; use the CLI to add new ones (`npx shadcn@latest add <component>`)
- `middleware.ts` — Clerk auth middleware; routes listed there are final for V1
- `app/layout.tsx` — root layout with `<ClerkProvider>`; only change to add global providers
- `eslint.config.mjs` — boundary rules; do not loosen `feature → feature` restrictions
- `context/*.md` — update these, but never delete them

## API Call Pattern

All backend calls go through `shared/api/client.ts`. Never write raw `fetch()` calls inline in components or server actions.

```ts
// ✅ Correct
import { apiClient } from '@/shared/api/client';
const course = await apiClient<Course>(`/api/courses/${id}`);

// ❌ Wrong
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${id}`);
```

## SSE Streaming Pattern

Use the `useSseStream` hook from `features/tutor/hooks/use-sse-stream.ts` for all SSE consumption. Do not create raw `EventSource` instances in components.

```ts
// ✅ Correct — inside a tutor feature component
useSseStream(hintUrl, (token) => appendSocraticHint(token));

// ❌ Wrong — raw EventSource in a component
const es = new EventSource(url);
```

## Zustand Store Pattern

- One store per major interaction surface: `TutorStore` for the tutor, `WizardStore` for authoring
- Stores live in `features/X/stores/`
- Use selectors to read from stores — do not subscribe to the whole store in one component
- `WizardStore` is persisted to `localStorage` via `zustand/middleware/persist`
- `TutorStore` is NOT persisted — it is hydrated from server-fetched data on page load

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes involve:

- A new feature module or sub-module
- A new invariant or boundary rule
- A change to the auth or storage model
- A new environment variable
- A completed or newly in-progress task in `progress-tracker.md`
- A new design decision not already captured

## Git Commit Rules

**Commit after every completed task — no matter how small.** A task = one checkbox in `roadmap.md`.

### Commit Message Convention

```
<type>(<scope>): <short description>
```

| Type | When to use |
|------|-------------|
| `feat` | New file or feature added |
| `fix` | Bug fix |
| `chore` | Install, config, scaffolding |
| `style` | CSS / design token changes |
| `refactor` | Restructure without behavior change |
| `docs` | Context files, markdown only |
| `test` | Vitest / Playwright tests |

**Scope** = the feature module or layer touched (e.g. `auth`, `tutor`, `shared`, `wizard`, `globals`).

### Examples

```bash
git commit -m "feat(shared): add api/client.ts with Clerk token injection"
git commit -m "chore(shared): create lib/cn.ts clsx+tailwind-merge helper"
git commit -m "style(globals): add full light-theme token system + keyframes"
git commit -m "feat(auth): add role-guard component"
git commit -m "feat(wizard): add step-1 PDF upload form"
git commit -m "docs(context): sync roadmap Phase 1 progress"
```

### Rules

- **Never batch unrelated tasks into one commit** — one checkbox = one commit
- **Always tick the checkbox in `roadmap.md`** and commit the roadmap update together with the implementation in the same commit
- **Commit before switching to a different task group** — do not carry uncommitted work across groups
- If a task is partially done, commit with `WIP:` prefix: `chore(tutor): WIP add tutor-store skeleton`

---

## Before Moving to the Next Unit

1. The current feature unit works end-to-end within its defined scope
2. No invariant defined in `architecture.md` was violated (especially: no cross-feature imports, no direct DB access)
3. `progress-tracker.md` reflects the completed work and updated "Next Up"
4. `npm run build` passes with no TypeScript errors
5. `npm run lint` passes with no boundary violations
6. The Socratic constraint test passes if you touched `features/tutor/` code blocks or hints
7. **`git commit` has been made** — the completed task checkbox is ticked in `roadmap.md` and committed
