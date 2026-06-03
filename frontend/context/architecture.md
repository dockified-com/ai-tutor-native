# Architecture Context

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript | Pages, routing, RSC, Server Actions |
| UI | Tailwind v4 + shadcn/ui | Styling system, component library |
| State | Zustand v5 | Tutor interactive state, authoring wizard state |
| Auth | Clerk v7 (`@clerk/nextjs`) | Managed sign-in/sign-up, JWT issuance, middleware |
| Data fetching | RSC (server) + SWR (client polling) + Server Actions (mutations) | All data access |
| Streaming | Native `EventSource` (SSE) | AI hint, Ask Anything, understanding check streaming |
| Code editor | `@monaco-editor/react` | Monaco editor in code block workspace |
| Diagrams | `react-mermaid` / `mermaid` | Mermaid diagram rendering |
| Backend | FastAPI (Python) via REST + SSE | All AI, Judge0, DB operations |

## System Boundaries

- `app/` — Route shells only. Thin pages that compose features. No business logic lives here. Pages fetch data via RSC, then render feature components.
- `features/` — Vertical feature slices. Each feature owns its components, hooks, server actions, Zustand stores, and lib helpers. Exposes a single public API via `index.ts`. Cross-feature imports are forbidden.
- `shared/` — Cross-cutting infrastructure importable from anywhere: API client, SSE factory, common types, shared UI re-exports, utility functions.
- `context/` — Living project documentation for AI agents and developers. Updated after every meaningful implementation change.

### Feature Modules (V1)

| Feature | Responsibility |
| --- | --- |
| `features/auth/` | Role-aware components (`RoleGuard`), `useUserRole` hook, server helper for current user |
| `features/authoring/` | 3-step creation wizard, generation status polling, preview banner, regenerate modal |
| `features/courses/` | Course list cards, course detail view, status badges |
| `features/enrollment/` | Course-code input form, `/join/{code}` redirect logic |
| `features/tutor/` | 2-pane tutor layout, all 5 block renderers, Monaco workspace, Mermaid workspace, Ask Anything footer, audio controls, Course Progress slide-out, TutorStore |
| `features/progress/` | Block completion writes, bookmark updates, lesson/course completion cards |

### Module Boundary Rule (Enforced by ESLint `eslint-plugin-boundaries`)

```
ALLOWED:
  app/*            → features/*/index.ts   (public API only)
  app/*            → shared/*
  features/X/*     → features/X/*          (within same feature)
  features/X/*     → shared/*
  shared/*         → shared/*

FORBIDDEN:
  features/X/*     → features/Y/*          (NEVER — cross-feature)
  features/X/*     → features/Y/internal   (bypassing public API)
```

If two features need to share logic, **promote it to `shared/`**.

## Storage Model

- **Supabase Postgres** (via FastAPI backend): All structured data — users, courses, lessons, blocks, enrollments, block progress, code submissions, concept check attempts, understanding check attempts, questions log, RAG chunks with pgvector embeddings
- **Supabase Storage** (via FastAPI backend): PDF source files (`pdfs/` bucket, private), pre-generated TTS audio files (`audio/` bucket, public)
- **No direct DB access from frontend**: The Next.js frontend calls the FastAPI backend via REST + SSE. No Supabase client in the frontend. No Prisma.
- **Zustand (client memory)**: Tutor session state (revealed blocks, active block, audio state, streaming hints). Wizard state persisted to `localStorage`.

## Auth and Access Model

- **Authentication**: All users authenticate via Clerk (email/password or Google OAuth). The Clerk JWT is included as `Authorization: Bearer <token>` on every backend request.
- **User provisioning**: On first sign-in, FastAPI lazily creates a `users` row by `clerk_user_id`. Clerk webhooks (`user.created`, `user.updated`) keep email and `display_name` in sync.
- **Roles**: Two roles — `creator` and `student`. Default is `student`. Creator role is set via SQL on the founder's row (`UPDATE users SET role = 'creator' WHERE email = '...'`). Only creators can access `/courses/new` and authoring features.
- **Ownership**: Students can only read/write their own enrollments. The backend enforces ownership on every request — the frontend never sends enrollment IDs it doesn't own. Accessing another user's enrollment returns 403.
- **Preview mode**: Creator accesses `/courses/{id}/preview`. The `?preview=true` flag suppresses all progress writes — no `block_progress`, `code_submissions`, or attempt rows are created.

## Invariants

1. **No cross-feature imports**: `features/X/` may never import from `features/Y/`. Enforced by `eslint-plugin-boundaries` in `eslint.config.mjs`.
2. **No business logic in `app/`**: Route pages compose features; they never contain business logic, data transformation, or AI calls.
3. **`shared/` has no feature imports**: `shared/` may only import from `shared/`. It must not know about features.
4. **No direct Supabase/DB calls from frontend**: All data access goes through the FastAPI backend. Frontend only calls `/api/*` endpoints.
5. **SSE endpoints receive JWT via query param**: Browser `EventSource` cannot set custom headers. Pass Clerk JWT as `?token=<jwt>` for SSE endpoints. (V2: upgrade to cookie auth.)
6. **Every feature exposes only `index.ts`**: Internal files of a feature are private. Only the named exports in `index.ts` are importable from outside the feature.
7. **Tutor right pane is a pure derivation**: The right pane (Monaco / Mermaid / empty) is computed solely from `active_block_id` + `blocks[]`. No side effects drive it.
8. **`npm run build` must pass before merging**: Type errors and lint boundary violations are build-blockers.
