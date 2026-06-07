# Spaces Home — Design Spec
**Date:** 2026-06-07  
**Branch:** lyyeakkhai

---

## Overview

Replace the stub `/dashboard` page with a NotebookLM-style spaces landing page. Every user is equal — no creator/student distinction. Users can own spaces they create and join spaces others share with them.

---

## Architecture

### New feature: `features/spaces/`

```
features/spaces/
  components/
    spaces-page.tsx        # root client component, composes the full page
    spaces-header.tsx      # logo + "Join space" button + UserMenu
    spaces-tabs.tsx        # shadcn Tabs: "My Spaces" / "Shared With Me"
    spaces-grid.tsx        # grid layout used by both tabs
    space-card-owned.tsx   # card for spaces the user created
    space-card-joined.tsx  # card for spaces the user joined
    create-space-modal.tsx # Dialog: name + description fields
    join-space-modal.tsx   # Dialog: single 6-char code input
    share-code-modal.tsx   # Dialog: shows code + copy link; opens after create
  actions/
    create-space.ts        # 'use server' — POST /api/spaces
    join-space.ts          # 'use server' — POST /api/spaces/join
  hooks/
    use-spaces.ts          # SWR: fetches owned + joined spaces
  types.ts                 # Space type
  index.ts                 # public barrel: SpacesPage only
```

### Modified files

- `app/dashboard/page.tsx` — replace stub with `<SpacesPage />`
- `shared/components/app-shell.tsx` — no changes; header composition is inside `spaces-header.tsx`

### Boundary rules (unchanged)

`features/spaces/` may import from `shared/` only. No cross-feature imports.

---

## Data Types

```ts
// features/spaces/types.ts
export type Space = {
  id: string;
  name: string;
  description: string | null;
  share_code: string;
  owner_name: string | null;   // populated only on joined spaces
  progress_pct: number | null; // populated only on joined spaces
};
```

---

## API Contracts (FastAPI — to be implemented)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/spaces/owned` | — | `Space[]` |
| GET | `/api/spaces/joined` | — | `Space[]` |
| POST | `/api/spaces` | `{ name, description? }` | `{ space: Space }` |
| POST | `/api/spaces/join` | `{ code: string }` | `{ space: Space }` |

All endpoints require `Authorization: Bearer <Clerk JWT>`.

---

## Components

### `spaces-page.tsx`
- `'use client'`
- Calls `useSpaces()` for owned + joined lists
- Renders `<SpacesHeader>`, then shadcn `<Tabs>` with two panes
- Manages modal open state: `createOpen`, `joinOpen`, `shareCode` (string | null)
- Passes `onJoined(space)` to `JoinSpaceModal` → calls SWR `mutate` to inject without reload

### `spaces-header.tsx`
- Logo mark: `w-6 h-6 bg-emerald-600 rounded` + `<Layout size={14} className="text-white" />`
- "Dockified" wordmark: `font-semibold text-slate-800 text-sm`
- Right side: "Join space with code" outline button → opens `JoinSpaceModal`; `<UserMenu />`
- Full width, `h-14 border-b border-emerald-100 bg-white px-6`

### `spaces-tabs.tsx`
- shadcn `<Tabs defaultValue="my-spaces">`
- Active tab indicator: `border-b-2 border-emerald-500 text-emerald-700`
- "My Spaces" tab: `<SpacesGrid>` of owned cards + "+ Create Space" button (top-right)
- "Shared With Me" tab: `<SpacesGrid>` of joined cards

### `space-card-owned.tsx`
- `bg-white/70 backdrop-blur-sm border border-emerald-100 rounded-xl p-5 shadow-sm`
- Hover: `border-emerald-300 shadow-md transition-all duration-200`
- Space name: `font-semibold text-slate-800`
- Description: 2-line clamp, `text-sm text-slate-500`
- Share code badge: `bg-emerald-50 text-emerald-700 text-xs rounded px-2 py-0.5 border border-emerald-200 cursor-pointer` — clicking opens `ShareCodeModal` with this space's code
- Entire card is clickable → `router.push('/courses/[id]')`

### `space-card-joined.tsx`
- Same glass card style
- Space name + `"by {owner_name}"` in `text-sm text-slate-500`
- shadcn `<Progress>` bar: `progress_pct`, emerald fill, `h-1.5 rounded-full`
- Percentage label: `text-xs text-slate-400`
- Card click → `/courses/[id]`

### `create-space-modal.tsx`
- shadcn `<Dialog>`
- Fields: Name (`<Input>`, required), Description (`<Textarea>`, optional, 3 rows)
- Submit → calls `createSpace` Server Action → on success: close this modal, open `ShareCodeModal` with returned `share_code`
- Loading state: button disabled + spinner

### `join-space-modal.tsx`
- shadcn `<Dialog>`
- Single `<Input>` for 6-char code, uppercase transform, maxLength=6
- Submit → calls `joinSpace` Server Action → on success: close modal, call `onJoined(space)` → SWR mutate injects new card into "Shared With Me" tab without reload
- Error: inline `text-red-600 text-sm` below input

### `share-code-modal.tsx`
- shadcn `<Dialog>`
- Code displayed large: `font-mono text-3xl font-bold text-emerald-700 tracking-widest`
- Copy button (Lucide `Copy` icon) copies `https://{host}/?code={code}` — shows `CheckCheck` icon on copy for 2s
- "Done" button closes

---

## Visual Style

All from the project theme (`ui-context.md`). No custom CSS files.

| Element | Classes |
|---------|---------|
| Page background | `bg-white min-h-screen` |
| Header | `h-14 border-b border-emerald-100 bg-white px-6 flex items-center justify-between` |
| Card (base) | `bg-white/70 backdrop-blur-sm border border-emerald-100 rounded-xl p-5 shadow-sm cursor-pointer` |
| Card (hover) | `hover:border-emerald-300 hover:shadow-md transition-all duration-200` |
| Grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| Primary button | `bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium` |
| Outline button | `border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 rounded-md text-sm font-medium` |
| Tab active | `border-b-2 border-emerald-500 text-emerald-700` |
| Share code badge | `bg-emerald-50 text-emerald-700 text-xs rounded px-2 py-0.5 border border-emerald-200` |
| Progress bar | `h-1.5 rounded-full` with emerald indicator |

---

## Hooks

### `use-spaces.ts`
```ts
// SWR — fetches both lists, exposes mutate for optimistic join
export function useSpaces() {
  // returns: { owned: Space[], joined: Space[], mutateJoined, loading }
}
```
On `joinSpace` success: `mutateJoined([...joined, newSpace], false)` — no revalidation needed.

---

## Server Actions

### `create-space.ts`
```ts
'use server';
// auth() → getToken → POST /api/spaces → return { space: Space }
```

### `join-space.ts`
```ts
'use server';
// auth() → getToken → POST /api/spaces/join { code } → return { space: Space }
// Throws APIError with user-facing message on invalid code
```

---

## Empty States

- My Spaces (no owned spaces): centered text + "+ Create Space" button
- Shared With Me (no joined spaces): centered text + "Join with a code" button

---

## Out of Scope

- Space deletion or editing (V2)
- Search/filter across spaces (V2)
- Pagination (V2)
- Real-time updates when someone joins your space (V2)
