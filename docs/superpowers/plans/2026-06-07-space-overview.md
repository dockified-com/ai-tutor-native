# Space Overview (Curriculum View) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/spaces/[space_id]` — a curriculum view showing ordered categories (lessons groups) for a space, with owner-only add/reorder and member accordion previews.

**Architecture:** The existing `courses` table holds space content (title, lessons). This page wraps the existing course data model under the "Space" concept: a space is a course, categories are lessons, and lesson blocks are the content items. The frontend `features/spaces/` feature slice gains a new route segment. No new DB tables are needed — we reuse `courses`, `lessons`, and `enrollments`.

**Tech Stack:** Next.js 15 App Router (server component shell + client island), TypeScript strict, Tailwind v4 + shadcn/ui, SWR v2, Clerk v7, FastAPI backend (Python), SQLAlchemy async ORM, existing `apiFetch` + `current_user` patterns.

---

## File Structure

**New files:**
- `frontend/app/spaces/[space_id]/page.tsx` — thin server shell (auth redirect + passes token)
- `frontend/features/spaces/components/space-overview-page.tsx` — client root component (owns state)
- `frontend/features/spaces/components/category-list.tsx` — renders ordered category rows with drag handle (owner) or accordion (member)
- `frontend/features/spaces/components/category-row.tsx` — single row: name, description, item count badge, expand/collapse
- `frontend/features/spaces/components/add-category-modal.tsx` — Dialog: Name + optional Description → POST
- `frontend/features/spaces/hooks/use-space-overview.ts` — SWR hook for `GET /api/spaces/{space_id}/overview`
- `frontend/features/spaces/actions/add-category.ts` — Server Action: POST `/api/spaces/{space_id}/categories`
- `frontend/features/spaces/actions/reorder-categories.ts` — Server Action: PATCH `/api/spaces/{space_id}/categories/reorder`

**Modified files:**
- `frontend/features/spaces/types.ts` — add `SpaceOverview`, `Category` types
- `frontend/features/spaces/index.ts` — export `SpaceOverviewPage`
- `backend/app/features/courses/routes.py` — add space overview endpoints
- `backend/app/features/courses/schemas.py` — add `SpaceOverviewOut`, `CategoryOut`, `AddCategoryIn`, `ReorderCategoriesIn`
- `backend/app/features/courses/service.py` — add `get_space_overview`, `add_category`, `reorder_categories`

---

## Task 1: Backend types and GET /api/spaces/{space_id}/overview

**Files:**
- Modify: `backend/app/features/courses/schemas.py`
- Modify: `backend/app/features/courses/service.py`
- Modify: `backend/app/features/courses/routes.py`

**Context:** A "space" maps to the `courses` table. A "category" maps to the `lessons` table (each lesson is a category). Blocks under a lesson are the content items. The `enrollments` table tells us if the current user is the creator (`course.creator_id == user.id`) or a member.

- [ ] **Step 1: Add schemas**

In `backend/app/features/courses/schemas.py`, append:

```python
from pydantic import BaseModel
import uuid

class CategoryOut(BaseModel):
    id: uuid.UUID
    position: int
    title: str
    description: str | None
    block_count: int

    model_config = {"from_attributes": True}

class SpaceOverviewOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    is_owner: bool
    categories: list[CategoryOut]

class AddCategoryIn(BaseModel):
    name: str
    description: str | None = None

class ReorderCategoriesIn(BaseModel):
    ordered_ids: list[uuid.UUID]
```

- [ ] **Step 2: Add service functions**

In `backend/app/features/courses/service.py`, append:

```python
from sqlalchemy import select, update
from app.features.authoring.models import Lesson, Block  # reuse existing models

async def get_space_overview(db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID) -> dict:
    course = await get_course(db, user_id, space_id)  # raises 404 if not found or no access
    lessons_result = await db.execute(
        select(Lesson).where(Lesson.course_id == space_id).order_by(Lesson.position)
    )
    lessons = lessons_result.scalars().all()
    
    categories = []
    for lesson in lessons:
        count_result = await db.execute(
            select(func.count()).select_from(Block).where(Block.lesson_id == lesson.id)
        )
        block_count = count_result.scalar_one()
        categories.append({
            "id": lesson.id,
            "position": lesson.position,
            "title": lesson.title,
            "description": lesson.summary,
            "block_count": block_count,
        })
    
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "is_owner": course.creator_id == user_id,
        "categories": categories,
    }

async def add_category(db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID, name: str, description: str | None) -> Lesson:
    course = await get_course(db, user_id, space_id)
    if course.creator_id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only owner can add categories")
    
    max_pos_result = await db.execute(
        select(func.coalesce(func.max(Lesson.position), 0)).where(Lesson.course_id == space_id)
    )
    next_pos = max_pos_result.scalar_one() + 1
    
    lesson = Lesson(course_id=space_id, position=next_pos, title=name, summary=description)
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson

async def reorder_categories(db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID, ordered_ids: list[uuid.UUID]) -> None:
    course = await get_course(db, user_id, space_id)
    if course.creator_id != user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only owner can reorder")
    
    for pos, lesson_id in enumerate(ordered_ids, start=1):
        await db.execute(
            update(Lesson).where(Lesson.id == lesson_id, Lesson.course_id == space_id).values(position=pos)
        )
    await db.commit()
```

- [ ] **Step 3: Add routes**

In `backend/app/features/courses/routes.py`, append:

```python
from .schemas import SpaceOverviewOut, AddCategoryIn, ReorderCategoriesIn, CategoryOut
from .service import get_space_overview, add_category, reorder_categories

@router.get("/spaces/{space_id}/overview", response_model=SpaceOverviewOut)
async def space_overview(
    space_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await get_space_overview(db, user.id, space_id)
    return data

@router.post("/spaces/{space_id}/categories", response_model=CategoryOut, status_code=201)
async def create_category(
    space_id: UUID,
    body: AddCategoryIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    lesson = await add_category(db, user.id, space_id, body.name, body.description)
    count = 0
    return CategoryOut(id=lesson.id, position=lesson.position, title=lesson.title, description=lesson.summary, block_count=count)

@router.patch("/spaces/{space_id}/categories/reorder", status_code=204)
async def reorder_space_categories(
    space_id: UUID,
    body: ReorderCategoriesIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await reorder_categories(db, user.id, space_id, body.ordered_ids)
```

- [ ] **Step 4: Verify backend starts without errors**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/backend
python -m uvicorn app.main:app --reload --port 8000 &
sleep 3
curl -s http://localhost:8000/openapi.json | python3 -c "import json,sys; paths=json.load(sys.stdin)['paths']; print([p for p in paths if 'spaces' in p])"
```

Expected: list includes `/api/spaces/{space_id}/overview`, `/api/spaces/{space_id}/categories`

- [ ] **Step 5: Kill test server**

```bash
pkill -f "uvicorn app.main"
```

---

## Task 2: Frontend types + SWR hook + Server Actions

**Files:**
- Modify: `frontend/features/spaces/types.ts`
- Create: `frontend/features/spaces/hooks/use-space-overview.ts`
- Create: `frontend/features/spaces/actions/add-category.ts`
- Create: `frontend/features/spaces/actions/reorder-categories.ts`

- [ ] **Step 1: Extend types.ts**

Append to `frontend/features/spaces/types.ts`:

```ts
export type Category = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  block_count: number;
};

export type SpaceOverview = {
  id: string;
  title: string;
  description: string | null;
  is_owner: boolean;
  categories: Category[];
};
```

- [ ] **Step 2: Create use-space-overview.ts**

```ts
// frontend/features/spaces/hooks/use-space-overview.ts
"use client";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";
import type { SpaceOverview } from "../types";

export function useSpaceOverview(spaceId: string) {
  const { getToken, isLoaded } = useAuth();
  const { data, error, mutate } = useSWR<SpaceOverview>(
    isLoaded ? `/api/spaces/${spaceId}/overview` : null,
    async () => {
      const token = await getToken();
      return apiFetch<SpaceOverview>(`/api/spaces/${spaceId}/overview`, { token });
    },
  );
  return { overview: data ?? null, loading: !data && !error, mutate };
}
```

- [ ] **Step 3: Create add-category.ts**

```ts
// frontend/features/spaces/actions/add-category.ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { Category } from "../types";

export async function addCategory(
  spaceId: string,
  name: string,
  description: string | null,
): Promise<{ category: Category }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  const category = await apiFetch<Category>(`/api/spaces/${spaceId}/categories`, {
    method: "POST",
    token,
    body: JSON.stringify({ name, description }),
  });
  return { category };
}
```

- [ ] **Step 4: Create reorder-categories.ts**

```ts
// frontend/features/spaces/actions/reorder-categories.ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";

export async function reorderCategories(spaceId: string, orderedIds: string[]): Promise<void> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  await apiFetch<void>(`/api/spaces/${spaceId}/categories/reorder`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the new files.

- [ ] **Step 6: Commit**

```bash
git add frontend/features/spaces/types.ts frontend/features/spaces/hooks/use-space-overview.ts frontend/features/spaces/actions/add-category.ts frontend/features/spaces/actions/reorder-categories.ts
git commit -m "feat(spaces): types, SWR hook, and server actions for space overview"
```

---

## Task 3: CategoryRow and CategoryList components

**Files:**
- Create: `frontend/features/spaces/components/category-row.tsx`
- Create: `frontend/features/spaces/components/category-list.tsx`

**Design:** Glass card rows matching the existing space card style (`rgba(255,255,255,0.55)`, `backdrop-blur(14px)`, green borders). Owner rows get a drag handle icon (GripVertical from lucide-react). Member rows get a ChevronDown accordion toggle that reveals block count summary.

- [ ] **Step 1: Create category-row.tsx**

```tsx
// frontend/features/spaces/components/category-row.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import type { Category } from "../types";

interface Props {
  category: Category;
  spaceId: string;
  isOwner: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

const rowStyle = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(163,209,165,0.45)",
  boxShadow: "0 2px 12px rgba(110,169,118,0.08)",
} as const;

export function CategoryRow({ category, spaceId, isOwner, dragHandleProps }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={rowStyle}>
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer"
        onClick={() => isOwner ? router.push(`/spaces/${spaceId}/categories/${category.id}`) : setOpen((v) => !v)}
      >
        {isOwner ? (
          <span {...dragHandleProps} onClick={(e) => e.stopPropagation()} className="text-[#a3d1a5] hover:text-[#6ea976] cursor-grab active:cursor-grabbing">
            <GripVertical size={18} />
          </span>
        ) : (
          <span className="text-[#6ea976] transition-transform duration-200" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>
            <ChevronDown size={18} />
          </span>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0e2114] truncate">{category.title}</p>
          {category.description && (
            <p className="text-sm mt-0.5 truncate" style={{ color: "rgba(55,89,60,0.65)" }}>{category.description}</p>
          )}
        </div>

        <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-mono"
          style={{ background: "rgba(110,169,118,0.15)", color: "#37593c", border: "1px solid rgba(110,169,118,0.3)" }}>
          {category.block_count} items
        </span>

        {isOwner && (
          <ChevronRight size={16} className="shrink-0 text-[#a3d1a5]" />
        )}
      </div>

      {/* Member accordion preview */}
      {!isOwner && open && (
        <div className="px-5 pb-4 pt-0 border-t" style={{ borderColor: "rgba(163,209,165,0.3)" }}>
          <p className="text-sm" style={{ color: "rgba(55,89,60,0.7)" }}>
            {category.block_count} interactive {category.block_count === 1 ? "lesson" : "lessons"}
          </p>
          <button
            onClick={() => router.push(`/spaces/${spaceId}/categories/${category.id}`)}
            className="mt-2 text-sm font-medium cursor-pointer transition-colors duration-150"
            style={{ color: "#37593c" }}
          >
            Enter →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create category-list.tsx (with drag-and-drop for owner)**

```tsx
// frontend/features/spaces/components/category-list.tsx
"use client";
import { useState, useRef } from "react";
import { CategoryRow } from "./category-row";
import { reorderCategories } from "../actions/reorder-categories";
import type { Category } from "../types";

interface Props {
  categories: Category[];
  spaceId: string;
  isOwner: boolean;
  onReorder: (updated: Category[]) => void;
}

export function CategoryList({ categories, spaceId, isOwner, onReorder }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const dragOver = useRef<number | null>(null);

  if (!isOwner) {
    return (
      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <CategoryRow key={cat.id} category={cat} spaceId={spaceId} isOwner={false} />
        ))}
      </div>
    );
  }

  function handleDragEnd() {
    if (dragging === null || dragOver.current === null || dragging === dragOver.current) {
      setDragging(null);
      return;
    }
    const reordered = [...categories];
    const [moved] = reordered.splice(dragging, 1);
    reordered.splice(dragOver.current, 0, moved);
    onReorder(reordered);
    reorderCategories(spaceId, reordered.map((c) => c.id)).catch(() => {});
    setDragging(null);
    dragOver.current = null;
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map((cat, idx) => (
        <div
          key={cat.id}
          draggable
          onDragStart={() => setDragging(idx)}
          onDragEnter={() => { dragOver.current = idx; }}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          style={{ opacity: dragging === idx ? 0.5 : 1, transition: "opacity 0.15s" }}
        >
          <CategoryRow
            category={cat}
            spaceId={spaceId}
            isOwner
            dragHandleProps={{ draggable: false }}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx tsc --noEmit 2>&1 | grep "category-row\|category-list" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/features/spaces/components/category-row.tsx frontend/features/spaces/components/category-list.tsx
git commit -m "feat(spaces): CategoryRow and CategoryList components with glass design"
```

---

## Task 4: AddCategoryModal component

**Files:**
- Create: `frontend/features/spaces/components/add-category-modal.tsx`

- [ ] **Step 1: Create add-category-modal.tsx**

```tsx
// frontend/features/spaces/components/add-category-modal.tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addCategory } from "../actions/add-category";
import type { Category } from "../types";

interface Props {
  spaceId: string;
  open: boolean;
  onClose: () => void;
  onAdded: (category: Category) => void;
}

export function AddCategoryModal({ spaceId, open, onClose, onAdded }: Props) {
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
      const { category } = await addCategory(spaceId, name.trim(), description.trim() || null);
      onAdded(category);
      setName("");
      setDescription("");
    } catch {
      setError("Failed to add category.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" style={{ background: "rgba(237,245,234,0.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(163,209,165,0.5)" }}>
        <DialogHeader>
          <DialogTitle className="text-[#0e2114]">Add Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week 1"
              maxLength={80}
              required
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">Description <span className="font-normal text-[#37593c]/50">(optional)</span></label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category"
              rows={2}
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976] resize-none"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors"
              style={{ color: "#37593c", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(110,169,118,0.4)" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6ea976, #37593c)", boxShadow: "0 2px 8px rgba(110,169,118,0.35)" }}>
              {loading ? "Adding…" : "Add Category"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx tsc --noEmit 2>&1 | grep "add-category-modal" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/features/spaces/components/add-category-modal.tsx
git commit -m "feat(spaces): AddCategoryModal with glass design"
```

---

## Task 5: SpaceOverviewPage root component + route

**Files:**
- Create: `frontend/features/spaces/components/space-overview-page.tsx`
- Create: `frontend/app/spaces/[space_id]/page.tsx`
- Modify: `frontend/features/spaces/index.ts`

- [ ] **Step 1: Create space-overview-page.tsx**

```tsx
// frontend/features/spaces/components/space-overview-page.tsx
"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Layout } from "lucide-react";
import { SpacesHeader } from "./spaces-header";
import { CategoryList } from "./category-list";
import { AddCategoryModal } from "./add-category-modal";
import { useSpaceOverview } from "../hooks/use-space-overview";
import type { Category } from "../types";

interface Props {
  spaceId: string;
  userMenu: ReactNode;
}

export function SpaceOverviewPage({ spaceId, userMenu }: Props) {
  const router = useRouter();
  const { overview, loading, mutate } = useSpaceOverview(spaceId);
  const [addOpen, setAddOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  function handleAdded(category: Category) {
    if (!overview) return;
    setAddOpen(false);
    mutate({ ...overview, categories: [...overview.categories, category] }, false);
  }

  function handleReorder(updated: Category[]) {
    if (!overview) return;
    mutate({ ...overview, categories: updated }, false);
  }

  const blobStyle = { position: "fixed" as const, borderRadius: "50%", pointerEvents: "none" as const };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #edf5ea 0%, #d1eace 40%, #c8e6c5 100%)" }}>
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{ ...blobStyle, top: "-8rem", left: "-8rem", width: "24rem", height: "24rem", opacity: 0.4, filter: "blur(48px)", background: "radial-gradient(circle, #a3d1a5, transparent)" }} />
        <div style={{ ...blobStyle, top: "33%", right: "-6rem", width: "20rem", height: "20rem", opacity: 0.3, filter: "blur(48px)", background: "radial-gradient(circle, #6ea976, transparent)" }} />
      </div>

      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} userMenu={userMenu} />

      <main className="relative flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {/* Back + header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm mb-5 cursor-pointer transition-colors duration-150"
            style={{ color: "rgba(55,89,60,0.7)" }}
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </button>

          {loading ? (
            <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.5)" }} />
          ) : overview ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}>
                    <Layout size={14} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-[#0e2114] leading-tight">{overview.title}</h1>
                </div>
                {overview.description && (
                  <p className="text-sm mt-1 ml-9" style={{ color: "rgba(55,89,60,0.7)" }}>{overview.description}</p>
                )}
              </div>
              {overview.is_owner && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer text-white transition-all duration-200 hover:shadow-[0_4px_16px_rgba(55,89,60,0.3)] active:scale-95"
                  style={{ background: "linear-gradient(135deg, #6ea976, #37593c)", boxShadow: "0 2px 8px rgba(110,169,118,0.35)" }}
                >
                  <Plus size={15} /> Add Category
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Categories */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(163,209,165,0.3)" }} />
            ))}
          </div>
        ) : overview?.categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(163,209,165,0.4)" }}>
            <p className="text-[#37593c]/70 text-sm font-medium mb-4">No categories yet.</p>
            {overview.is_owner && (
              <button onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}>
                <Plus size={15} /> Add first category
              </button>
            )}
          </div>
        ) : overview ? (
          <CategoryList
            categories={overview.categories}
            spaceId={spaceId}
            isOwner={overview.is_owner}
            onReorder={handleReorder}
          />
        ) : null}
      </main>

      {overview?.is_owner && (
        <AddCategoryModal
          spaceId={spaceId}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create app route**

```tsx
// frontend/app/spaces/[space_id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserMenu } from "@/features/auth";
import { SpaceOverviewPage } from "@/features/spaces";

export default async function SpaceOverviewRoute(props: { params: Promise<{ space_id: string }> }) {
  const params = await props.params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <SpaceOverviewPage spaceId={params.space_id} userMenu={<UserMenu />} />;
}
```

- [ ] **Step 3: Export from index**

Append to `frontend/features/spaces/index.ts`:

```ts
export { SpaceOverviewPage } from "./components/space-overview-page";
```

- [ ] **Step 4: Build check**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/spaces/[space_id]/page.tsx frontend/features/spaces/components/space-overview-page.tsx frontend/features/spaces/index.ts
git commit -m "feat(spaces): SpaceOverviewPage — curriculum view with owner/member modes"
```

---

## Task 6: Wire space card navigation + final ESLint check

**Files:**
- Modify: `frontend/features/spaces/components/space-card-owned.tsx` — update route from `/courses/[id]` to `/spaces/[id]`
- Modify: `frontend/features/spaces/components/space-card-joined.tsx` — same

**Context:** The existing cards navigate to `/courses/${space.id}`. The new space overview is at `/spaces/${space.id}`. Update both cards.

- [ ] **Step 1: Fix space-card-owned.tsx navigation**

In `space-card-owned.tsx`, change:
```ts
router.push(`/courses/${space.id}`)
```
to:
```ts
router.push(`/spaces/${space.id}`)
```

- [ ] **Step 2: Fix space-card-joined.tsx navigation**

In `space-card-joined.tsx`, change:
```ts
router.push(`/courses/${space.id}`)
```
to:
```ts
router.push(`/spaces/${space.id}`)
```

- [ ] **Step 3: ESLint check**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx next lint 2>&1 | grep -E "error|warning" | head -20
```

Expected: no boundary violations in new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/features/spaces/components/space-card-owned.tsx frontend/features/spaces/components/space-card-joined.tsx
git commit -m "fix(spaces): navigate to /spaces/[id] instead of /courses/[id]"
```
