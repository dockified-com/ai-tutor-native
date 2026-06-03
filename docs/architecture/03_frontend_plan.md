# Frontend Architecture Plan
# AI Native Programming Tutor — V1

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Zustand · Clerk  
**Last Updated:** 2026-05-30  

---

## Table of Contents

1. [Architecture Principles](#1-architecture-principles)
2. [Directory Structure](#2-directory-structure)
3. [Module Boundary Rules](#3-module-boundary-rules)
4. [Feature Module Breakdown](#4-feature-module-breakdown)
5. [Shared Layer](#5-shared-layer)
6. [Routing & Pages](#6-routing--pages)
7. [State Management](#7-state-management)
8. [Data Fetching Strategy](#8-data-fetching-strategy)
9. [SSE Streaming](#9-sse-streaming)
10. [Auth Integration (Clerk)](#10-auth-integration-clerk)
11. [UI System (shadcn/ui + Tailwind)](#11-ui-system-shadcnui--tailwind)
12. [Testing](#12-testing)
13. [Build & Deployment](#13-build--deployment)

---

## 1. Architecture Principles

### Feature-Sliced Design (FSD-lite)

The frontend is organized by **feature**, not by technical concern. Each feature is a self-contained vertical slice: components, server actions, hooks, stores, lib helpers — all internal — with a single public API via `index.ts`.

**Why:** Prevents cross-feature spaghetti. Makes it trivial to extract a feature into a package for the parent Dockified LMS later. Makes code review precise — "does this PR stay inside `features/tutor/`?"

### Page = Composition of Features

Pages in `app/` are thin orchestrators. They compose features; they do not contain business logic. If logic is in a page, it belongs in a feature.

### Static-First, Streaming Only Where Necessary

Server Components handle all static data. Client Components are islands of interactivity (Zustand store, SSE consumers, audio controls). Do not wrap static content in `"use client"`.

---

## 2. Directory Structure

```
frontend/
├── app/                                   # Routes — thin pages composing features
│   ├── (auth)/
│   │   ├── sign-in/[[...rest]]/page.tsx   # Clerk sign-in catch-all
│   │   └── sign-up/[[...rest]]/page.tsx   # Clerk sign-up catch-all
│   ├── dashboard/
│   │   └── page.tsx                       # Enrolled courses + Create button
│   ├── courses/
│   │   ├── new/
│   │   │   └── page.tsx                   # 3-step creation wizard
│   │   └── [id]/
│   │       ├── page.tsx                   # Course detail (status, lessons, action bar)
│   │       ├── preview/
│   │       │   └── page.tsx               # Preview mode (creator only)
│   │       └── lesson/
│   │           └── [lesson_id]/
│   │               └── page.tsx           # THE TUTOR VIEW
│   ├── join/
│   │   └── [code]/
│   │       └── page.tsx                   # Public auto-enroll + redirect
│   └── layout.tsx                         # Root layout with <ClerkProvider>
│
├── middleware.ts                          # Clerk auth middleware (protects /dashboard, /courses/*)
│
├── features/                              # Feature modules
│   ├── auth/
│   ├── authoring/
│   ├── courses/
│   ├── enrollment/
│   ├── tutor/
│   └── progress/
│
├── shared/                                # Cross-cutting (importable from anywhere)
│   ├── api/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── ui/
│
├── eslint.config.mjs                      # Boundary enforcement
├── tailwind.config.js
├── next.config.ts
└── package.json
```

---

## 3. Module Boundary Rules

### Rule: No Cross-Feature Imports

```
ALLOWED:
  app/*             → features/*/index.ts   (public API only)
  app/*             → shared/*
  features/X/*      → features/X/*          (within same feature)
  features/X/*      → shared/*
  shared/*          → shared/*

FORBIDDEN:
  features/X/*      → features/Y/*          (cross-feature import)
  features/X/*      → features/Y/internal.ts (bypassing public API)
```

### ESLint Enforcement

```js
// eslint.config.mjs
import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app',     pattern: 'app/**' },
        { type: 'feature', pattern: 'features/*', mode: 'folder' },
        { type: 'shared',  pattern: 'shared/**' }
      ]
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'app',     allow: ['feature', 'shared'] },
          { from: 'feature', allow: ['shared'] },  // strict: NO cross-feature
          { from: 'shared',  allow: ['shared'] }
        ]
      }]
    }
  }
];
```

### Public API Pattern

Each feature exposes only what it needs to via `index.ts`:

```ts
// features/tutor/index.ts
export { TutorLayout }  from './components/tutor-layout';
export { useTutorStore } from './stores/tutor-store';
export type { TutorBlock } from './lib/types';
// Everything else is private to the feature
```

---

## 4. Feature Module Breakdown

### `features/auth/`

**Responsibility:** Role-aware UI components, role checks, profile display.

```
features/auth/
├── components/
│   ├── user-button.tsx          # Clerk UserButton with role badge
│   └── role-guard.tsx           # Conditionally renders based on user role
├── hooks/
│   └── use-user-role.ts         # Returns 'creator' | 'student' | null
├── lib/
│   └── get-current-user.ts      # Server helper: get Clerk user + app role from backend
└── index.ts
```

**Key decisions:**
- Role is fetched from the backend `/api/me` endpoint on first load, cached in session
- `<RoleGuard role="creator">` wraps creator-only UI elements in pages

---

### `features/authoring/`

**Responsibility:** Course creation wizard, regeneration, publish, preview banner.

```
features/authoring/
├── components/
│   ├── creation-wizard/
│   │   ├── wizard-shell.tsx           # Step 1-2-3 container with progress indicator
│   │   ├── step-upload.tsx            # PDF drag-drop; file validation
│   │   ├── step-configure.tsx         # Title, description, language, custom prompt
│   │   └── step-generate.tsx          # Trigger + live phase polling
│   ├── generation-status.tsx          # Phase indicator (extracting_pdf → ready)
│   ├── preview-banner.tsx             # "PREVIEW MODE" sticky banner
│   └── regenerate-lesson-modal.tsx    # Refined prompt input + confirm
├── actions/
│   ├── create-course.ts               # Server action: POST /api/courses/generate
│   ├── regenerate-lesson.ts           # Server action: POST /api/lessons/{id}/regenerate
│   └── publish-course.ts              # Server action: POST /api/courses/{id}/publish
├── hooks/
│   ├── use-generation-status.ts       # Polls /api/courses/{id}/status every 3s
│   └── use-wizard-validation.ts       # Per-step form validation
├── stores/
│   └── wizard-store.ts                # Zustand: wizard state (survives refresh via localStorage)
├── lib/
│   └── upload-pdf.ts                  # Supabase Storage presigned upload helper
└── index.ts
```

**State:** Zustand wizard store persisted to `localStorage` so refresh doesn't lose progress.

**Polling:** `use-generation-status.ts` uses `setInterval` + `SWR` mutate to poll status; clears on `status === 'ready' | 'failed'`.

---

### `features/courses/`

**Responsibility:** Course list (dashboard), course detail page, status display.

```
features/courses/
├── components/
│   ├── course-card.tsx                # Dashboard card (creator: status + actions; student: progress)
│   ├── course-detail-header.tsx       # Title, description, status badge, action bar
│   ├── lesson-list.tsx                # Ordered lesson cards with status + completion %
│   └── course-status-badge.tsx        # draft | generating | ready | published | failed
├── hooks/
│   └── use-course.ts                  # SWR fetcher for course data
└── index.ts
```

---

### `features/enrollment/`

**Responsibility:** Course-code input form, `/join/{code}` logic.

```
features/enrollment/
├── components/
│   ├── join-form.tsx                  # Enter course code input + submit
│   └── already-enrolled-redirect.tsx # If enrolled, redirect instead of re-enrolling
├── actions/
│   └── enroll-by-code.ts             # Server action: POST /api/enrollments
└── index.ts
```

---

### `features/tutor/`

**Responsibility:** The moat. Block renderers, 2-pane layout, audio controls, Ask Anything, click-to-jump.

```
features/tutor/
├── components/
│   ├── tutor-layout.tsx               # 2-pane shell (left feed + right workspace)
│   ├── lesson-feed.tsx                # Scrollable block feed, active block highlighting
│   ├── continue-button.tsx            # Continue (N) with block count + gating logic
│   ├── blocks/
│   │   ├── markdown-block.tsx         # Rendered markdown; auto-enables Continue
│   │   ├── code-block.tsx             # Monaco editor + terminal + run button
│   │   ├── mermaid-block.tsx          # Mermaid SVG renderer + error placeholder
│   │   ├── concept-check-block.tsx    # Question + options + explanation reveal
│   │   └── understanding-check-block.tsx # Textarea + evaluation + Socratic loop
│   ├── workspace/
│   │   ├── workspace-shell.tsx        # Right pane container; derives from active_block_id
│   │   ├── monaco-workspace.tsx       # Monaco editor instance + terminal output
│   │   └── mermaid-workspace.tsx      # Full-size Mermaid SVG
│   ├── ask-footer.tsx                 # Sticky input; question bubbles in feed
│   ├── audio-controls.tsx             # Play/pause, scrub, speed, auto-continue toggle
│   └── course-progress-slideout.tsx   # Edge nav slide-out: curriculum tree
├── actions/
│   ├── run-code.ts                    # POST /api/blocks/{id}/run
│   ├── get-socratic-hint.ts           # POST /api/blocks/{id}/socratic-hint (SSE)
│   ├── ask-question.ts                # POST /api/enrollments/{id}/ask (SSE)
│   ├── submit-concept-check.ts        # POST /api/blocks/{id}/concept-check
│   └── submit-understanding-check.ts  # POST /api/blocks/{id}/understanding-check (SSE)
├── hooks/
│   ├── use-sse-stream.ts              # Generic SSE hook (EventSource wrapper)
│   ├── use-tts-audio.ts               # HTML5 Audio preload + play/pause/speed
│   └── use-block-gating.ts            # Derives whether Continue is enabled for active block
├── stores/
│   └── tutor-store.ts                 # Zustand TutorStore (see §7)
├── lib/
│   ├── derive-right-pane.ts           # Pure fn: Block → 'monaco' | 'mermaid' | 'empty'
│   ├── block-types.ts                 # Type guards + discriminated union
│   └── sse-helpers.ts                 # SSE event accumulation utilities
└── index.ts
```

**Critical component:** `workspace-shell.tsx` — the right pane is a **pure derivation** of `active_block_id`:

```ts
// Pure derivation — no side effects
function WorkspaceShell({ activeBlockId, blocks }) {
  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const pane = deriveRightPane(activeBlock);
  
  if (pane === 'monaco') return <MonacoWorkspace block={activeBlock} />;
  if (pane === 'mermaid') return <MermaidWorkspace block={activeBlock} />;
  return <EmptyWorkspace />;
}
```

---

### `features/progress/`

**Responsibility:** Lesson completion logic, progress persistence calls.

```
features/progress/
├── components/
│   ├── lesson-complete-card.tsx       # "Lesson Complete" celebration card
│   └── course-complete-card.tsx       # "Course Complete" celebration + CTA
├── actions/
│   ├── mark-block-complete.ts         # POST /api/progress/blocks/{id}/complete
│   └── update-bookmark.ts             # PATCH /api/enrollments/{id}/bookmark
└── index.ts
```

---

## 5. Shared Layer

```
shared/
├── api/
│   ├── client.ts                      # fetch wrapper (base URL, auth header, error handling)
│   ├── sse.ts                         # EventSource factory with reconnect logic
│   └── endpoints.ts                   # Typed endpoint URL builders
├── components/
│   ├── app-layout.tsx                 # Root layout: header, sidebar, main
│   ├── page-header.tsx                # Breadcrumb + title + action slot
│   ├── error-boundary.tsx             # React error boundary wrapper
│   ├── loading-skeleton.tsx           # Reusable skeleton loaders
│   └── empty-state.tsx                # Empty state with icon + CTA
├── lib/
│   ├── dates.ts                       # Date formatting utilities
│   ├── cn.ts                          # clsx + tailwind-merge
│   └── errors.ts                      # APIError type + error parsing
├── types/
│   ├── api.ts                         # API response envelope types
│   ├── blocks.ts                      # Block discriminated union (all 5 types)
│   └── course.ts                      # Course, Lesson, Enrollment types
└── ui/                                # shadcn/ui re-exports (one canonical import location)
    └── index.ts                       # export { Button, Dialog, Sheet, ... } from '@/shared/ui'
```

**API client pattern:**

```ts
// shared/api/client.ts
async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getClerkToken(); // from @clerk/nextjs/server or client
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new APIError(res.status, await res.json());
  return res.json();
}
```

---

## 6. Routing & Pages

### Route Table

| Route | Page | Auth | Role |
|---|---|---|---|
| `/sign-in/[[...rest]]` | Clerk sign-in | Public | Any |
| `/sign-up/[[...rest]]` | Clerk sign-up | Public | Any |
| `/dashboard` | Course dashboard | Protected | Any |
| `/courses/new` | Creation wizard | Protected | Creator |
| `/courses/[id]` | Course detail | Protected | Any (different views) |
| `/courses/[id]/preview` | Preview tutor | Protected | Creator |
| `/courses/[id]/lesson/[lesson_id]` | Tutor view | Protected | Student |
| `/join/[code]` | Auto-enroll + redirect | Public (redirect to auth if needed) | Any |

### Middleware

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/join(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
```

---

## 7. State Management

### Zustand TutorStore

The tutor's entire interactive state lives in a single Zustand store. No prop drilling. No Context. Derived values are computed inside components using selectors.

```ts
// features/tutor/stores/tutor-store.ts
interface TutorStore {
  // Lesson data (pre-fetched; immutable during session)
  blocks: Block[];
  lessonId: string;
  enrollmentId: string;

  // Revelation state
  revealedBlockIds: string[];
  activeBlockId: string;

  // Audio state
  audio: {
    url: string | null;
    playing: boolean;
    speed: number;         // 0.5 | 0.75 | 1.0 | 1.25 | 1.5
    autoContinue: boolean;
  };

  // Interaction state
  socraticHint: string | null;        // current block's streaming hint
  askAnswers: AskAnswer[];            // SSE-streaming answers in feed
  understandingFeedback: string | null; // current UC block's streaming feedback

  // Actions
  revealNextBlock: () => void;
  setActiveBlock: (id: string) => void;
  returnToCurrent: () => void;
  setAudioPlaying: (playing: boolean) => void;
  setAudioSpeed: (speed: number) => void;
  toggleAutoContinue: () => void;
  appendSocraticHint: (token: string) => void;
  clearSocraticHint: () => void;
  appendAskAnswer: (id: string, token: string) => void;
  appendUnderstandingFeedback: (token: string) => void;
  clearUnderstandingFeedback: () => void;
}
```

### Wizard Store

```ts
// features/authoring/stores/wizard-store.ts
interface WizardStore {
  step: 1 | 2 | 3;
  pdfFile: File | null;
  pdfUploadUrl: string | null;
  courseId: string | null;
  config: {
    title: string;
    description: string;
    defaultLanguage: string;
    customPrompt: string;
  };
  // Actions
  goToStep: (step: 1 | 2 | 3) => void;
  setPdfFile: (file: File) => void;
  setPdfUploadUrl: (url: string) => void;
  setCourseId: (id: string) => void;
  updateConfig: (partial: Partial<WizardStore['config']>) => void;
  reset: () => void;
}
```

Persisted to `localStorage` via `zustand/middleware/persist`.

---

## 8. Data Fetching Strategy

### Server Components (RSC) — Default

Pages fetch data directly in Server Components. No client-side hydration waterfall.

```tsx
// app/courses/[id]/lesson/[lesson_id]/page.tsx (Server Component)
export default async function TutorPage({ params }) {
  const { lesson, blocks, progress } = await fetchLessonData(
    params.id,
    params.lesson_id
  );
  
  return (
    <TutorLayout
      lesson={lesson}
      initialBlocks={blocks}
      initialProgress={progress}
    />
  );
}
```

### SWR — Client-side revalidation

Used for data that changes during a session (generation status polling, course list after enroll):

```ts
// Polling generation status
const { data: status } = useSWR(
  courseId ? `/api/courses/${courseId}/status` : null,
  fetcher,
  {
    refreshInterval: (data) => 
      data?.status === 'ready' || data?.status === 'failed' ? 0 : 3000,
  }
);
```

### Server Actions — Mutations

All mutations use Next.js Server Actions. They authenticate via Clerk server helpers, call FastAPI, and return typed results.

```ts
// features/authoring/actions/create-course.ts
'use server';
import { auth } from '@clerk/nextjs/server';

export async function createCourse(formData: FormData) {
  const { getToken } = auth();
  const token = await getToken();
  
  const res = await fetch(`${process.env.API_URL}/api/courses/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  
  if (!res.ok) throw new Error('Generation failed');
  return res.json(); // { course_id, status: 'generating' }
}
```

---

## 9. SSE Streaming

### Generic `use-sse-stream` Hook

```ts
// features/tutor/hooks/use-sse-stream.ts
export function useSseStream(url: string | null, onToken: (token: string) => void) {
  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    
    es.addEventListener('token', (e) => onToken(e.data));
    es.addEventListener('error', () => {
      // Show retry UI — don't throw
    });
    es.addEventListener('done', () => es.close());
    
    return () => es.close();
  }, [url]);
}
```

### Usage in Code Block

```tsx
// features/tutor/components/blocks/code-block.tsx
const [hintUrl, setHintUrl] = useState<string | null>(null);
const appendHint = useTutorStore(s => s.appendSocraticHint);

useSseStream(hintUrl, appendHint);

const handleRunFail = async () => {
  // After receiving failed verdict:
  setHintUrl(`/api/blocks/${block.id}/socratic-hint`);
};
```

---

## 10. Auth Integration (Clerk)

### Setup

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html><body>{children}</body></html>
    </ClerkProvider>
  );
}
```

### Token Usage

- **Server Components / Server Actions:** `auth().getToken()` from `@clerk/nextjs/server`
- **Client Components:** `useAuth().getToken()` from `@clerk/nextjs`
- **API client:** token injected in `Authorization: Bearer <token>` header on every request

### Role Check Pattern

```ts
// features/auth/hooks/use-user-role.ts
export function useUserRole() {
  const { data } = useSWR('/api/me', fetcher);
  return data?.role as 'creator' | 'student' | undefined;
}
```

```tsx
// Usage in a page
const role = useUserRole();
if (role === 'creator') return <CreatorView />;
return <StudentView />;
```

---

## 11. UI System (shadcn/ui + Tailwind)

### shadcn/ui Components Used

| Component | Used in |
|---|---|
| `Button` | Continue, Run, Submit, Publish, Regenerate |
| `Dialog` | Regenerate lesson modal, publish confirmation |
| `Sheet` | Course Progress slide-out |
| `Card` | Course cards, lesson cards, Lesson Complete card |
| `Badge` | Status badges, "Code Exercise" badge |
| `Textarea` | Understanding check input, custom prompt |
| `Input` | Course code input, title fields |
| `Select` | Language dropdown, TTS speed |
| `Progress` | Lesson progress bars in slide-out |
| `Skeleton` | Loading states for course list, tutor |
| `Sonner` | Toast notifications (publish success, generation fail) |
| `Separator` | Section dividers |

### Tailwind Config Additions

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, y: 8 }, to: { opacity: 1, y: 0 } },
        slideInRight: { from: { x: '100%' }, to: { x: 0 } },
      },
    },
  },
};
```

Block reveal uses `animate-fade-in` class applied when block enters `revealedBlockIds`.

---

## 12. Testing

### Unit Tests — Vitest

```
tests/
├── unit/
│   ├── tutor-store.test.ts         # State transitions: reveal, jump, return-to-current
│   ├── derive-right-pane.test.ts   # Pure fn: Block type → pane type
│   ├── block-gating.test.ts        # Is Continue enabled? for each block type + state
│   └── block-types.test.ts         # Type guards for discriminated union
```

### Integration Tests — Playwright

```
tests/
└── e2e/
    ├── creator-flow.spec.ts        # Sign in → upload PDF → generate → preview → publish
    ├── student-flow.spec.ts        # Sign up → enter code → complete lesson
    ├── code-block.spec.ts          # Run code → fail → get hint → pass → Continue enables
    ├── ask-anything.spec.ts        # Ask question → SSE answer streams in feed
    └── understanding-check.spec.ts # Submit answer → fail → Socratic → revise → pass
```

### Critical assertions

- **No answer leak:** `code-block.spec.ts` asserts that Socratic hint text does not contain the solution string
- **Gating:** `student-flow.spec.ts` asserts "Next Lesson" is disabled before understanding check passes
- **Progress persistence:** Navigate away → return → assert bookmark is restored

---

## 13. Build & Deployment

### Environment Variables

```env
# .env.local (never committed)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_API_URL=https://api.tutor.dockified.com
```

### Vercel Deployment

- Auto-deploy from `main` branch via Vercel GitHub integration
- Environment variables set in Vercel dashboard
- `next.config.ts` disables telemetry, sets image domains

```ts
// next.config.ts
const config: NextConfig = {
  experimental: { typedRoutes: true },
  images: { domains: ['your-supabase-project.supabase.co'] },
};
export default config;
```

### Build Checks (GitHub Actions)

```yaml
# .github/workflows/frontend.yml
jobs:
  check:
    steps:
      - run: npm ci
      - run: npm run type-check      # tsc --noEmit
      - run: npm run lint            # eslint (includes boundary rules)
      - run: npm run test:unit       # vitest run
      - run: npm run build           # next build (fail on type errors)
```

Playwright E2E runs against staging environment (not CI) to avoid LLM API costs.
