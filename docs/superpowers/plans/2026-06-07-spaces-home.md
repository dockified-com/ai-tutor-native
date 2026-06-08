# Spaces Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `/dashboard` page with a NotebookLM-style spaces landing page where users can create spaces, share them via 6-char codes, and join spaces others have created.

**Architecture:** New `features/spaces/` vertical slice owns all components, server actions, and data-fetching. The dashboard page becomes a thin shell that renders `<SpacesPage />`. No cross-feature imports.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui (`@/components/ui/`), SWR v2, Clerk v7 (`useAuth`), `apiFetch` from `@/shared/api/client`.

> **Shadcn import path:** `@/components/ui/<component>` (NOT `@/shared/ui`).  
> **cn helper:** `@/lib/utils`.  
> **Auth pattern:** `const { getToken } = useAuth()` then `await getToken()` before `apiFetch`.

---

### Task 1: Types + feature skeleton

**Files:**
- Create: `frontend/features/spaces/types.ts`
- Create: `frontend/features/spaces/index.ts`

- [ ] **Create types file**

```ts
// frontend/features/spaces/types.ts
export type Space = {
  id: string;
  name: string;
  description: string | null;
  share_code: string;
  owner_name: string | null;
  progress_pct: number | null;
};
```

- [ ] **Create public barrel (empty for now, will be filled)**

```ts
// frontend/features/spaces/index.ts
export { SpacesPage } from "./components/spaces-page";
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/
git commit -m "feat(spaces): add Space type and feature barrel"
```

---

### Task 2: Server actions

**Files:**
- Create: `frontend/features/spaces/actions/create-space.ts`
- Create: `frontend/features/spaces/actions/join-space.ts`

- [ ] **Create createSpace action**

```ts
// frontend/features/spaces/actions/create-space.ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { Space } from "../types";

export async function createSpace(
  name: string,
  description: string | null,
): Promise<{ space: Space }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<{ space: Space }>("/api/spaces", {
    method: "POST",
    token,
    body: JSON.stringify({ name, description }),
  });
}
```

- [ ] **Create joinSpace action**

```ts
// frontend/features/spaces/actions/join-space.ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { Space } from "../types";

export async function joinSpace(code: string): Promise<{ space: Space }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<{ space: Space }>("/api/spaces/join", {
    method: "POST",
    token,
    body: JSON.stringify({ code }),
  });
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/actions/
git commit -m "feat(spaces): add createSpace and joinSpace server actions"
```

---

### Task 3: useSpaces hook

**Files:**
- Create: `frontend/features/spaces/hooks/use-spaces.ts`

- [ ] **Create hook**

```ts
// frontend/features/spaces/hooks/use-spaces.ts
"use client";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";
import type { Space } from "../types";

function useSpaceList(path: string) {
  const { getToken, isLoaded } = useAuth();
  const { data, error, mutate } = useSWR<Space[]>(
    isLoaded ? path : null,
    async () => {
      const token = await getToken();
      return apiFetch<Space[]>(path, { token });
    },
  );
  return {
    spaces: data ?? [],
    loading: !data && !error,
    mutate,
  };
}

export function useSpaces() {
  const owned = useSpaceList("/api/spaces/owned");
  const joined = useSpaceList("/api/spaces/joined");
  return { owned, joined };
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/hooks/
git commit -m "feat(spaces): add useSpaces SWR hook"
```

---

### Task 4: ShareCodeModal

**Files:**
- Create: `frontend/features/spaces/components/share-code-modal.tsx`

Requires: `Dialog` from shadcn. Add it if missing:
```bash
cd frontend && npx shadcn@latest add dialog
```

- [ ] **Create component**

```tsx
// frontend/features/spaces/components/share-code-modal.tsx
"use client";
import { useState } from "react";
import { Copy, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  code: string | null;
  onClose: () => void;
}

export function ShareCodeModal({ code, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(`${window.location.origin}/?code=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!code} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Share this space</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mt-1">
          Give this code to anyone you want to join
        </p>
        <div className="my-4 font-mono text-3xl font-bold tracking-widest text-emerald-700 bg-emerald-50 rounded-xl py-4">
          {code}
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? (
              <CheckCheck size={16} className="text-emerald-600" />
            ) : (
              <Copy size={16} />
            )}
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/components/share-code-modal.tsx
git commit -m "feat(spaces): add ShareCodeModal"
```

---

### Task 5: CreateSpaceModal

**Files:**
- Create: `frontend/features/spaces/components/create-space-modal.tsx`

Requires: `Dialog`, `Input`, `Textarea` from shadcn. Add if missing:
```bash
cd frontend && npx shadcn@latest add input textarea
```

- [ ] **Create component**

```tsx
// frontend/features/spaces/components/create-space-modal.tsx
"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSpace } from "../actions/create-space";
import type { Space } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (space: Space) => void;
}

export function CreateSpaceModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { space } = await createSpace(name.trim(), description.trim() || null);
      setName("");
      setDescription("");
      onCreated(space);
    } catch {
      setError("Failed to create space. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Backend SE-G2"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Description{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space for?"
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/components/create-space-modal.tsx
git commit -m "feat(spaces): add CreateSpaceModal"
```

---

### Task 6: JoinSpaceModal

**Files:**
- Create: `frontend/features/spaces/components/join-space-modal.tsx`

- [ ] **Create component**

```tsx
// frontend/features/spaces/components/join-space-modal.tsx
"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinSpace } from "../actions/join-space";
import type { Space } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onJoined: (space: Space) => void;
}

export function JoinSpaceModal({ open, onClose, onJoined }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const { space } = await joinSpace(code.trim().toUpperCase());
      setCode("");
      onJoined(space);
    } catch {
      setError("Invalid code or space not found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Space code
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BCKND1"
              maxLength={6}
              className="font-mono tracking-widest text-center text-lg uppercase"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || code.trim().length !== 6}>
              {loading ? "Joining…" : "Join"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/components/join-space-modal.tsx
git commit -m "feat(spaces): add JoinSpaceModal"
```

---

### Task 7: Space cards

**Files:**
- Create: `frontend/features/spaces/components/space-card-owned.tsx`
- Create: `frontend/features/spaces/components/space-card-joined.tsx`

- [ ] **Create owned card**

```tsx
// frontend/features/spaces/components/space-card-owned.tsx
"use client";
import { useRouter } from "next/navigation";
import type { Space } from "../types";

interface Props {
  space: Space;
  onShareCode: (code: string) => void;
}

export function SpaceCardOwned({ space, onShareCode }: Props) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/courses/${space.id}`)}
      className="bg-white/70 backdrop-blur-sm border border-emerald-100 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
    >
      <div>
        <h3 className="font-semibold text-slate-800 leading-snug">{space.name}</h3>
        {space.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
            {space.description}
          </p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onShareCode(space.share_code);
        }}
        className="self-start bg-emerald-50 text-emerald-700 text-xs rounded px-2 py-0.5 border border-emerald-200 font-mono tracking-wider hover:bg-emerald-100 transition-colors"
      >
        {space.share_code}
      </button>
    </div>
  );
}
```

- [ ] **Create joined card**

Requires `Progress` from shadcn (already in `components/ui/progress.tsx`).

```tsx
// frontend/features/spaces/components/space-card-joined.tsx
"use client";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import type { Space } from "../types";

interface Props {
  space: Space;
}

export function SpaceCardJoined({ space }: Props) {
  const router = useRouter();
  const pct = space.progress_pct ?? 0;

  return (
    <div
      onClick={() => router.push(`/courses/${space.id}`)}
      className="bg-white/70 backdrop-blur-sm border border-emerald-100 rounded-xl p-5 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
    >
      <div>
        <h3 className="font-semibold text-slate-800 leading-snug">{space.name}</h3>
        {space.owner_name && (
          <p className="text-sm text-slate-500 mt-0.5">by {space.owner_name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Progress value={pct} className="h-1.5 rounded-full [&>div]:bg-emerald-500" />
        <span className="text-xs text-slate-400">{pct}% complete</span>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/components/space-card-owned.tsx frontend/features/spaces/components/space-card-joined.tsx
git commit -m "feat(spaces): add SpaceCardOwned and SpaceCardJoined"
```

---

### Task 8: SpacesHeader

**Files:**
- Create: `frontend/features/spaces/components/spaces-header.tsx`

- [ ] **Create header**

```tsx
// frontend/features/spaces/components/spaces-header.tsx
"use client";
import { Layout } from "lucide-react";
import { UserMenu } from "@/features/auth";
import { Button } from "@/components/ui/button";

interface Props {
  onJoinOpen: () => void;
}

export function SpacesHeader({ onJoinOpen }: Props) {
  return (
    <header className="h-14 border-b border-emerald-100 bg-white px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
          <Layout size={14} className="text-white" />
        </div>
        <span className="font-semibold text-slate-800 text-sm">Dockified</span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onJoinOpen}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          Join space with code
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/components/spaces-header.tsx
git commit -m "feat(spaces): add SpacesHeader"
```

---

### Task 9: SpacesPage (root component)

**Files:**
- Create: `frontend/features/spaces/components/spaces-page.tsx`

- [ ] **Create SpacesPage**

```tsx
// frontend/features/spaces/components/spaces-page.tsx
"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SpacesHeader } from "./spaces-header";
import { SpaceCardOwned } from "./space-card-owned";
import { SpaceCardJoined } from "./space-card-joined";
import { CreateSpaceModal } from "./create-space-modal";
import { JoinSpaceModal } from "./join-space-modal";
import { ShareCodeModal } from "./share-code-modal";
import { useSpaces } from "../hooks/use-spaces";
import type { Space } from "../types";

export function SpacesPage() {
  const { owned, joined } = useSpaces();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);

  function handleCreated(space: Space) {
    setCreateOpen(false);
    owned.mutate([...owned.spaces, space], false);
    setShareCode(space.share_code);
  }

  function handleJoined(space: Space) {
    setJoinOpen(false);
    joined.mutate([...joined.spaces, space], false);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <Tabs defaultValue="my-spaces">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-transparent p-0 gap-6">
              <TabsTrigger
                value="my-spaces"
                className="bg-transparent px-0 pb-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none rounded-none text-slate-500"
              >
                My Spaces
              </TabsTrigger>
              <TabsTrigger
                value="shared"
                className="bg-transparent px-0 pb-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none rounded-none text-slate-500"
              >
                Shared With Me
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-spaces" className="mt-0">
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Plus size={16} />
                Create Space
              </Button>
            </TabsContent>
          </div>

          <TabsContent value="my-spaces">
            {owned.loading ? (
              <SpacesGridSkeleton />
            ) : owned.spaces.length === 0 ? (
              <EmptyState
                message="No spaces yet."
                action={
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <Plus size={16} /> Create your first space
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {owned.spaces.map((s) => (
                  <SpaceCardOwned key={s.id} space={s} onShareCode={setShareCode} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared">
            {joined.loading ? (
              <SpacesGridSkeleton />
            ) : joined.spaces.length === 0 ? (
              <EmptyState
                message="You haven't joined any spaces yet."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setJoinOpen(true)}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                  >
                    Join with a code
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {joined.spaces.map((s) => (
                  <SpaceCardJoined key={s.id} space={s} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CreateSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <JoinSpaceModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={handleJoined}
      />
      <ShareCodeModal code={shareCode} onClose={() => setShareCode(null)} />
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-slate-500 text-sm">{message}</p>
      {action}
    </div>
  );
}

function SpacesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 rounded-xl bg-slate-100 animate-pulse"
        />
      ))}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/features/spaces/components/spaces-page.tsx
git commit -m "feat(spaces): add SpacesPage root component"
```

---

### Task 10: Wire up dashboard page

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Replace dashboard stub**

```tsx
// frontend/app/dashboard/page.tsx
import { SpacesPage } from "@/features/spaces";

export default function DashboardPage() {
  return <SpacesPage />;
}
```

- [ ] **Verify build passes**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, no lint boundary violations.

- [ ] **Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "feat(spaces): wire SpacesPage into dashboard route"
```

---

### Task 11: Add missing shadcn components if needed

**Files:** none (CLI generates files)

- [ ] **Check which components are missing and add them**

```bash
cd frontend
# Check what's already there
ls components/ui/

# Add any missing ones (dialog, input, textarea are likely needed)
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add textarea
```

Expected: files appear in `frontend/components/ui/`.

- [ ] **Commit**

```bash
git add frontend/components/ui/
git commit -m "feat(spaces): add dialog, input, textarea shadcn components"
```

> **Note:** Run this task BEFORE Task 4. If dialog/input/textarea already exist, skip.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Header with user profile + "Join space with code" | Task 8 |
| My Spaces tab + Create Space button | Task 9 |
| Create Space modal (name + description) | Task 5 |
| Share code popup after creation | Task 4 |
| Space cards for owned spaces | Task 7 |
| Shared With Me tab | Task 9 |
| Join modal → optimistic inject without reload | Task 6, 9 |
| Space cards for joined spaces (owner, progress) | Task 7 |
| Empty states | Task 9 |
| Glass card visual style, emerald theme | Task 7, 8, 9 |
| Feature components in `features/spaces/` | All tasks |

**Placeholder scan:** None found. All steps have concrete code.

**Type consistency:**
- `Space` defined in Task 1, used in Tasks 2, 3, 4, 5, 6, 7, 9 — consistent.
- `onCreated(space: Space)`, `onJoined(space: Space)`, `onShareCode(code: string)` — consistent across Tasks 5/6/9.
- `owned.mutate`, `joined.mutate` from SWR — consistent with Task 3 hook shape.

**Execution order note:** Run Task 11 (shadcn components) before Task 4.
