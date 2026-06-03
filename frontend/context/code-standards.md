# Code Standards

## General

- Keep modules small and single-purpose — one component per file, one responsibility per hook
- Fix root causes; do not layer workarounds (e.g. if a component re-renders unnecessarily, fix the selector — don't add `useMemo` everywhere)
- Do not mix unrelated concerns in one component or file (e.g. audio logic and block reveal logic belong in separate hooks)
- No `console.log` in committed code — use structured logging or `console.error` for real errors only
- All TODO comments must include a reference to the open question in `progress-tracker.md`

## TypeScript

- Strict mode is required throughout — `tsconfig.json` has `"strict": true`
- No `any` — use explicit interfaces, narrowly scoped generics, or `unknown` with a type guard
- Validate unknown external input (API responses, URL params, event data) at system boundaries before trusting it
- All block content uses the `Block` discriminated union from `shared/types/blocks.ts` — use type guards, not casts
- Server Actions must be typed: `Promise<T>` return types, not `Promise<any>`
- All API response shapes must have a corresponding type in `shared/types/`

## Next.js (App Router)

- Default to Server Components (no `'use client'`) — add `'use client'` only when browser APIs, event handlers, or hooks require it
- Pages in `app/` are thin: fetch data, pass to feature components, return JSX. No inline business logic.
- Server Actions live in `features/X/actions/` with `'use server'` at the top of the file
- Never call `fetch()` directly in a Server Component — use `shared/api/client.ts` with auth
- Use `loading.tsx` and `error.tsx` co-located with pages for suspense and error states
- Never use `router.refresh()` as a workaround for stale data — prefer SWR `mutate()` or revalidation

## Styling (Tailwind v4)

- All colors use CSS custom property tokens defined in `app/globals.css` — no hardcoded hex values in components
- Use the token names from `ui-context.md` (`--bg-base`, `--accent-primary`, etc.)
- No inline `style={{}}` for colors or spacing — use Tailwind classes only
- Use `cn()` from `shared/lib/cn.ts` (clsx + tailwind-merge) for conditional class composition
- Block fade-in uses `animate-fade-in` class (defined in `tailwind.config.js` custom keyframes)
- Do not create custom CSS files per component — Tailwind utilities + globals.css only

## Components

- shadcn/ui components live in `shared/ui/` — add new ones via `npx shadcn@latest add <component>`, never hand-write them
- Import from `@/shared/ui` (the barrel re-export), not from `@/shared/ui/button` etc.
- Feature components are in `features/X/components/` — they may import from `shared/ui` and `shared/lib`
- Client components that accept callbacks should name props with the `on` prefix (`onContinue`, `onRunCode`)
- Avoid prop drilling beyond 2 levels — lift to the Zustand store or a hook instead

## Server Actions

- Always call `auth()` from `@clerk/nextjs/server` first and get the token before any API call
- Never trust `params` or `formData` values without validation — parse with Zod or explicit checks
- Return typed results — never `return res.json()` untyped
- On error, throw or return an error shape — never `console.error` silently

```ts
// ✅ Correct pattern
'use server';
import { auth } from '@clerk/nextjs/server';
import { apiClient } from '@/shared/api/client';

export async function createCourse(formData: FormData): Promise<CreateCourseResult> {
  const { getToken } = auth();
  const token = await getToken();
  if (!token) throw new Error('Unauthorized');
  // ...
}
```

## API Routes

- All requests to FastAPI include `Authorization: Bearer <Clerk JWT>` header
- Use `shared/api/client.ts` — it handles auth header injection and error parsing
- `APIError` from `shared/lib/errors.ts` is the standard error type — catch it at boundaries
- SSE endpoints pass token as query param `?token=<jwt>` (browser EventSource limitation)

## Data and Storage

- All structured data (courses, blocks, enrollments, progress) lives in Postgres via FastAPI — never store it in localStorage
- `WizardStore` may persist to `localStorage` for UX continuity (survives refresh during creation)
- `TutorStore` is always hydrated from the server on page load — never persisted
- Course PDF and TTS audio files live in Supabase Storage — frontend receives signed URLs from the backend
- No Supabase client SDK in the frontend — all storage access goes through FastAPI

## File Organization

- `app/` — Route files only: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- `features/X/components/` — React components owned by feature X
- `features/X/actions/` — Server Actions (files must start with `'use server'`)
- `features/X/hooks/` — Custom React hooks owned by feature X
- `features/X/stores/` — Zustand stores owned by feature X
- `features/X/lib/` — Pure functions, type guards, constants owned by feature X
- `features/X/index.ts` — Public API barrel; the ONLY file outside the feature may import
- `shared/api/` — `client.ts` (fetch wrapper), `sse.ts` (EventSource factory), `endpoints.ts` (URL builders)
- `shared/components/` — Shared layout components (app shell, error boundary, skeletons)
- `shared/lib/` — Pure utilities: `cn.ts`, `dates.ts`, `errors.ts`
- `shared/types/` — Cross-cutting types: `blocks.ts`, `course.ts`, `api.ts`
- `shared/ui/` — shadcn/ui component re-exports (generated; do not hand-edit)
