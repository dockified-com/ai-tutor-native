# Category Node + Builder Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Page 3 (`/spaces/[space_id]/node/[node_id]`) — category content area with AI Tutor creation wizard — and Page 4 (`/builder/[component_id]`) — owner-only draft workspace with block tree + agentic sidebar chat.

**Architecture:**
- "Node" = a lesson (`lessons` table). Its content items are `blocks` (JSONB). A "component" = a course+lesson pair, but since a lesson belongs to one course, `component_id` is the `lesson.id`.
- Page 3 lists the lesson's blocks categorised as AI Tutors (all block types = the lesson itself), plus future Assessments/Resources stubs. Owner gets a creation wizard that calls the existing `POST /api/courses` pipeline.
- Page 4 is the builder: reads all blocks for a lesson, shows a tree, lets owner edit JSONB inline, and has an agentic chat sidebar that calls Claude Sonnet to propose block mutations via a new backend endpoint.
- Do NOT touch the existing tutor page at `/courses/[id]/lesson/[lesson_id]`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4 + shadcn/ui (Dialog, Sheet, Switch, Textarea, Input, Skeleton), SWR v2, Clerk v7, FastAPI + SQLAlchemy async, Anthropic Claude Sonnet via existing `anthropic_client`.

---

## File Structure

**New files:**
- `frontend/app/spaces/[space_id]/node/[node_id]/page.tsx` — server shell
- `frontend/features/spaces/components/node-page.tsx` — client root for Page 3
- `frontend/features/spaces/components/create-tutor-modal.tsx` — AI Wizard modal
- `frontend/features/spaces/hooks/use-node.ts` — SWR: GET /api/nodes/[lesson_id]
- `frontend/features/spaces/actions/create-tutor.ts` — Server Action: POST /api/courses (wraps existing pipeline)
- `frontend/app/builder/[component_id]/page.tsx` — server shell (owner-only)
- `frontend/features/builder/components/builder-page.tsx` — client root for Page 4
- `frontend/features/builder/components/block-tree.tsx` — renders JSONB block list
- `frontend/features/builder/components/block-editor.tsx` — inline JSONB editor (Dialog)
- `frontend/features/builder/components/agent-sidebar.tsx` — chat sidebar (Sheet)
- `frontend/features/builder/hooks/use-lesson-blocks.ts` — SWR: GET /api/builder/[lesson_id]
- `frontend/features/builder/actions/update-block.ts` — PATCH /api/builder/blocks/[block_id]
- `frontend/features/builder/actions/agent-edit.ts` — POST /api/builder/[lesson_id]/agent-edit
- `frontend/features/builder/actions/publish-lesson.ts` — POST /api/lessons/[lesson_id]/publish
- `frontend/features/builder/index.ts`

**New backend files:**
- `backend/app/features/builder/__init__.py`
- `backend/app/features/builder/routes.py` — GET /api/builder/{lesson_id}, PATCH /api/builder/blocks/{block_id}, POST /api/builder/{lesson_id}/agent-edit, POST /api/lessons/{lesson_id}/publish
- `backend/app/features/builder/schemas.py`
- `backend/app/features/builder/service.py`

**Modified files:**
- `frontend/features/spaces/types.ts` — add NodeLesson, TutorBlock types
- `frontend/features/spaces/index.ts` — export NodePage
- `backend/app/main.py` — register builder router

---

## Task 1: Backend builder routes (read blocks, patch block, agent-edit, publish)

**Files:**
- Create: `backend/app/features/builder/__init__.py`
- Create: `backend/app/features/builder/schemas.py`
- Create: `backend/app/features/builder/service.py`
- Create: `backend/app/features/builder/routes.py`
- Modify: `backend/app/main.py`

**Context:** Read `backend/app/main.py` to see how routers are registered. Read `backend/app/features/authoring/models.py` for Block/Lesson models. The `anthropic_client` is at `app.shared.ai.anthropic_client`. Existing `current_user` + `get_db` deps are in `app.shared.deps`.

- [ ] **Step 1: Create `__init__.py`**

```python
# backend/app/features/builder/__init__.py
```
(empty file)

- [ ] **Step 2: Create `backend/app/features/builder/schemas.py`**

```python
import uuid as _uuid
from pydantic import BaseModel


class BlockOut(BaseModel):
    id: _uuid.UUID
    position: int
    type: str
    content: dict

    model_config = {"from_attributes": True}


class LessonDetailOut(BaseModel):
    id: _uuid.UUID
    title: str
    status: str
    course_id: _uuid.UUID
    is_owner: bool
    blocks: list[BlockOut]


class PatchBlockIn(BaseModel):
    content: dict


class AgentEditIn(BaseModel):
    message: str


class AgentEditOut(BaseModel):
    reply: str
    blocks: list[BlockOut]
```

- [ ] **Step 3: Create `backend/app/features/builder/service.py`**

Read `backend/app/shared/ai/anthropic_client.py` first to understand the client interface.

```python
import json
import uuid as _uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.features.authoring.models import Block, Lesson
from app.features.courses.models import Course
from app.shared.ai.anthropic_client import anthropic_client


async def get_lesson_detail(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID) -> dict:
    lesson = await _get_lesson_owned_or_member(db, user_id, lesson_id)
    course = (await db.execute(select(Course).where(Course.id == lesson.course_id))).scalar_one()
    blocks_result = await db.execute(
        select(Block).where(Block.lesson_id == lesson_id).order_by(Block.position)
    )
    blocks = blocks_result.scalars().all()
    return {
        "id": lesson.id,
        "title": lesson.title,
        "status": lesson.status,
        "course_id": lesson.course_id,
        "is_owner": course.creator_id == user_id,
        "blocks": [{"id": b.id, "position": b.position, "type": b.type, "content": b.content} for b in blocks],
    }


async def patch_block(db: AsyncSession, user_id: _uuid.UUID, block_id: _uuid.UUID, content: dict) -> Block:
    block = (await db.execute(select(Block).where(Block.id == block_id))).scalar_one_or_none()
    if not block:
        raise HTTPException(404, "Block not found")
    lesson = (await db.execute(select(Lesson).where(Lesson.id == block.lesson_id))).scalar_one()
    course = (await db.execute(select(Course).where(Course.id == lesson.course_id))).scalar_one()
    if course.creator_id != user_id:
        raise HTTPException(403, "Only owner can edit blocks")
    block.content = content
    await db.commit()
    await db.refresh(block)
    return block


async def agent_edit(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID, message: str) -> dict:
    lesson = await _get_lesson_owner_only(db, user_id, lesson_id)
    blocks_result = await db.execute(
        select(Block).where(Block.lesson_id == lesson_id).order_by(Block.position)
    )
    blocks = blocks_result.scalars().all()
    blocks_json = json.dumps(
        [{"id": str(b.id), "position": b.position, "type": b.type, "content": b.content} for b in blocks],
        indent=2,
    )
    response = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=(
            "You are a curriculum editor. The user will ask you to modify lesson blocks. "
            "Respond with ONLY a JSON object: {\"reply\": \"<short explanation>\", \"blocks\": [<full updated block list>]}. "
            "Each block must have: id (string, keep existing), position (int), type (string), content (object matching original schema). "
            "Do not add or remove required fields from block content."
        ),
        messages=[
            {
                "role": "user",
                "content": f"Current blocks:\n{blocks_json}\n\nInstruction: {message}",
            }
        ],
    )
    raw = response.content[0].text.strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(500, "AI response was not valid JSON")

    updated_blocks = parsed.get("blocks", [])
    for updated in updated_blocks:
        block_id = _uuid.UUID(updated["id"])
        block = next((b for b in blocks if b.id == block_id), None)
        if block:
            block.content = updated["content"]
    await db.commit()

    refreshed = (await db.execute(
        select(Block).where(Block.lesson_id == lesson_id).order_by(Block.position)
    )).scalars().all()

    return {
        "reply": parsed.get("reply", "Done."),
        "blocks": [{"id": b.id, "position": b.position, "type": b.type, "content": b.content} for b in refreshed],
    }


async def publish_lesson(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID) -> Lesson:
    lesson = await _get_lesson_owner_only(db, user_id, lesson_id)
    from app.features.authoring.models import LessonStatus
    lesson.status = LessonStatus.ready
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def _get_lesson_owned_or_member(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID) -> Lesson:
    lesson = (await db.execute(select(Lesson).where(Lesson.id == lesson_id))).scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson


async def _get_lesson_owner_only(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID) -> Lesson:
    lesson = (await db.execute(select(Lesson).where(Lesson.id == lesson_id))).scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    course = (await db.execute(select(Course).where(Course.id == lesson.course_id))).scalar_one()
    if course.creator_id != user_id:
        raise HTTPException(403, "Only owner can perform this action")
    return lesson
```

- [ ] **Step 4: Create `backend/app/features/builder/routes.py`**

```python
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.shared.deps import current_user, get_db
from .schemas import LessonDetailOut, BlockOut, PatchBlockIn, AgentEditIn, AgentEditOut
from .service import get_lesson_detail, patch_block, agent_edit, publish_lesson

router = APIRouter(prefix="/api", tags=["builder"])


@router.get("/builder/{lesson_id}", response_model=LessonDetailOut)
async def get_builder(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_lesson_detail(db, user.id, lesson_id)


@router.patch("/builder/blocks/{block_id}", response_model=BlockOut)
async def patch_block_endpoint(
    block_id: UUID,
    body: PatchBlockIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await patch_block(db, user.id, block_id, body.content)
    return BlockOut(id=block.id, position=block.position, type=block.type, content=block.content)


@router.post("/builder/{lesson_id}/agent-edit", response_model=AgentEditOut)
async def agent_edit_endpoint(
    lesson_id: UUID,
    body: AgentEditIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await agent_edit(db, user.id, lesson_id, body.message)


@router.post("/lessons/{lesson_id}/publish", response_model=None, status_code=200)
async def publish_lesson_endpoint(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    lesson = await publish_lesson(db, user.id, lesson_id)
    return {"id": str(lesson.id), "status": lesson.status}
```

- [ ] **Step 5: Register router in main.py**

Read `backend/app/main.py`. Find where other routers are included (e.g. `app.include_router(authoring.router)`). Add:

```python
from app.features.builder import routes as builder
# ...
app.include_router(builder.router)
```

- [ ] **Step 6: Verify syntax**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/backend
python -m py_compile app/features/builder/routes.py app/features/builder/service.py app/features/builder/schemas.py
echo "OK"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native
git add backend/app/features/builder/ backend/app/main.py
git commit -m "feat(builder): backend routes — GET/PATCH blocks, agent-edit, publish lesson"
```

---

## Task 2: Frontend types + hooks + server actions for Node page and Builder

**Files:**
- Modify: `frontend/features/spaces/types.ts`
- Create: `frontend/features/spaces/hooks/use-node.ts`
- Create: `frontend/features/spaces/actions/create-tutor.ts`
- Create: `frontend/features/builder/` directory with `index.ts`, hooks, actions

**Context:** Read `frontend/features/spaces/hooks/use-spaces.ts` for the SWR + Clerk pattern. Read `frontend/features/authoring/actions/create-course.ts` for the Server Action pattern.

- [ ] **Step 1: Append to `frontend/features/spaces/types.ts`**

```ts
export type TutorBlock = {
  id: string;
  position: number;
  type: string;
  content: Record<string, unknown>;
};

export type NodeLesson = {
  id: string;
  title: string;
  status: string;
  course_id: string;
  is_owner: boolean;
  blocks: TutorBlock[];
};
```

- [ ] **Step 2: Create `frontend/features/spaces/hooks/use-node.ts`**

```ts
"use client";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";
import type { NodeLesson } from "../types";

export function useNode(lessonId: string) {
  const { getToken, isLoaded } = useAuth();
  const { data, error, mutate } = useSWR<NodeLesson>(
    isLoaded ? `/api/builder/${lessonId}` : null,
    async () => {
      const token = await getToken();
      return apiFetch<NodeLesson>(`/api/builder/${lessonId}`, { token });
    },
  );
  return { node: data ?? null, loading: !data && !error, mutate };
}
```

- [ ] **Step 3: Create `frontend/features/spaces/actions/create-tutor.ts`**

This calls the existing `POST /api/courses` pipeline (authoring). Read `frontend/features/authoring/actions/create-course.ts` first — it's a stub. This action will use `apiFetch` directly:

```ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";

export type CreateTutorInput = {
  title: string;
  description: string | null;
  pdfUrl: string;
  customPrompt: string | null;
};

export async function createTutor(input: CreateTutorInput): Promise<{ courseId: string }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  const course = await apiFetch<{ id: string }>("/api/courses", {
    method: "POST",
    token,
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      pdf_url: input.pdfUrl,
      custom_prompt: input.customPrompt,
    }),
  });
  return { courseId: course.id };
}
```

- [ ] **Step 4: Create `frontend/features/builder/` directory structure**

Create these files:

**`frontend/features/builder/index.ts`**
```ts
export { BuilderPage } from "./components/builder-page";
```

**`frontend/features/builder/hooks/use-lesson-blocks.ts`**
```ts
"use client";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";
import type { NodeLesson } from "@/features/spaces/types";

export function useLessonBlocks(lessonId: string) {
  const { getToken, isLoaded } = useAuth();
  const { data, error, mutate } = useSWR<NodeLesson>(
    isLoaded ? `/api/builder/${lessonId}` : null,
    async () => {
      const token = await getToken();
      return apiFetch<NodeLesson>(`/api/builder/${lessonId}`, { token });
    },
  );
  return { lesson: data ?? null, loading: !data && !error, mutate };
}
```

**`frontend/features/builder/actions/update-block.ts`**
```ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { TutorBlock } from "@/features/spaces/types";

export async function updateBlock(blockId: string, content: Record<string, unknown>): Promise<TutorBlock> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<TutorBlock>(`/api/builder/blocks/${blockId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ content }),
  });
}
```

**`frontend/features/builder/actions/agent-edit.ts`**
```ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";
import type { TutorBlock } from "@/features/spaces/types";

export async function agentEdit(lessonId: string, message: string): Promise<{ reply: string; blocks: TutorBlock[] }> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  return apiFetch<{ reply: string; blocks: TutorBlock[] }>(`/api/builder/${lessonId}/agent-edit`, {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}
```

**`frontend/features/builder/actions/publish-lesson.ts`**
```ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/shared/api/client";

export async function publishLesson(lessonId: string): Promise<void> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error("Unauthorized");
  await apiFetch<void>(`/api/lessons/${lessonId}/publish`, {
    method: "POST",
    token,
  });
}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx tsc --noEmit 2>&1 | head -30
```

Fix any errors.

- [ ] **Step 6: Commit**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native
git add frontend/features/spaces/types.ts frontend/features/spaces/hooks/use-node.ts frontend/features/spaces/actions/create-tutor.ts frontend/features/builder/
git commit -m "feat(builder): frontend types, hooks, and server actions"
```

---

## Task 3: CreateTutorModal (AI Wizard) + NodePage (Page 3)

**Files:**
- Create: `frontend/features/spaces/components/create-tutor-modal.tsx`
- Create: `frontend/features/spaces/components/node-page.tsx`
- Create: `frontend/app/spaces/[space_id]/node/[node_id]/page.tsx`
- Modify: `frontend/features/spaces/index.ts`

**Context:** Read existing `create-space-modal.tsx` for modal pattern. Read `spaces-header.tsx` for header component. The wizard collects: Lesson Name, Description, PDF URL (text input for now — full file upload is out of scope), custom prompt textarea, enable web search toggle (UI only — stored in custom_prompt prefix). On submit, calls `createTutor` server action, then redirects to `/builder/${courseId}` (the new course's id will be the component_id).

Note: "Enable Web Search" is a UI toggle. When enabled, prepend `"[WEB_SEARCH_ENABLED]\n"` to the custom prompt before sending.

- [ ] **Step 1: Create `frontend/features/spaces/components/create-tutor-modal.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createTutor } from "../actions/create-tutor";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateTutorModal({ open, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pdfUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = webSearch
        ? `[WEB_SEARCH_ENABLED]\n${customPrompt.trim()}`
        : customPrompt.trim() || null;
      const { courseId } = await createTutor({
        title: name.trim(),
        description: description.trim() || null,
        pdfUrl: pdfUrl.trim(),
        customPrompt: prompt,
      });
      onClose();
      router.push(`/builder/${courseId}`);
    } catch {
      setError("Failed to start generation. Check the PDF URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        style={{
          background: "rgba(237,245,234,0.97)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(163,209,165,0.5)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#0e2114]">⚡ Create AI Tutor Native</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">Lesson Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Python Decorators"
              required
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">
              Description <span className="font-normal text-[#37593c]/50">(optional)</span>
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview"
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">PDF Source URL</label>
            <Input
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="https://example.com/material.pdf"
              type="url"
              required
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#37593c] mb-1 block">
              Custom Instructions <span className="font-normal text-[#37593c]/50">(optional)</span>
            </label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Focus on beginner-friendly explanations..."
              rows={3}
              className="border-[#a3d1a5] focus-visible:ring-[#6ea976] resize-none"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-[#37593c]">Enable Web Search</p>
              <p className="text-xs text-[#37593c]/60">Augment generation with live search</p>
            </div>
            <Switch
              checked={webSearch}
              onCheckedChange={setWebSearch}
              className="data-[state=checked]:bg-[#6ea976]"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer"
              style={{ color: "#37593c", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(110,169,118,0.4)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !pdfUrl.trim()}
              className="px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6ea976, #37593c)", boxShadow: "0 2px 8px rgba(110,169,118,0.35)" }}
            >
              {loading ? "Starting…" : "Generate"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `frontend/features/spaces/components/node-page.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, BookOpen, Play } from "lucide-react";
import { SpacesHeader } from "./spaces-header";
import { CreateTutorModal } from "./create-tutor-modal";
import { useNode } from "../hooks/use-node";

interface Props {
  spaceId: string;
  nodeId: string;
  userMenu: ReactNode;
}

const cardStyle = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(163,209,165,0.45)",
  boxShadow: "0 2px 12px rgba(110,169,118,0.08)",
} as const;

export function NodePage({ spaceId, nodeId, userMenu }: Props) {
  const router = useRouter();
  const { node, loading } = useNode(nodeId);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const isOwner = node?.is_owner ?? false;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #edf5ea 0%, #d1eace 40%, #c8e6c5 100%)" }}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: "absolute", top: "-8rem", left: "-8rem", width: "24rem", height: "24rem", borderRadius: "50%", opacity: 0.4, filter: "blur(48px)", background: "radial-gradient(circle, #a3d1a5, transparent)" }} />
        <div style={{ position: "absolute", top: "33%", right: "-6rem", width: "20rem", height: "20rem", borderRadius: "50%", opacity: 0.3, filter: "blur(48px)", background: "radial-gradient(circle, #6ea976, transparent)" }} />
      </div>

      <SpacesHeader onJoinOpen={() => setJoinOpen(true)} userMenu={userMenu} />

      <main className="relative flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "rgba(55,89,60,0.6)" }}>
          <button onClick={() => router.push("/dashboard")} className="hover:text-[#37593c] cursor-pointer transition-colors">Dashboard</button>
          <span>/</span>
          <button onClick={() => router.back()} className="hover:text-[#37593c] cursor-pointer transition-colors">
            {loading ? "…" : node?.title ?? "Space"}
          </button>
          <span>/</span>
          <span className="text-[#37593c] font-medium">{loading ? "…" : node?.title}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            {loading ? (
              <div className="h-7 w-48 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.5)" }} />
            ) : (
              <h1 className="text-2xl font-bold text-[#0e2114]">{node?.title}</h1>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => setCreateOpen(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(55,89,60,0.3)] active:scale-95"
              style={{ background: "linear-gradient(135deg, #6ea976, #37593c)", boxShadow: "0 2px 8px rgba(110,169,118,0.35)" }}
            >
              <Zap size={14} /> Create AI Tutor Native
            </button>
          )}
        </div>

        {/* AI Tutors section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#37593c] uppercase tracking-wider mb-3">AI Tutors</h2>
          {loading ? (
            <div className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(163,209,165,0.3)" }} />
          ) : node && node.blocks.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div
                className="flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(110,169,118,0.18)]"
                style={cardStyle}
                onClick={() => router.push(`/courses/${node.course_id}/lesson/${nodeId}`)}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}>
                  <Play size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0e2114]">{node.title}</p>
                  <p className="text-sm" style={{ color: "rgba(55,89,60,0.65)" }}>{node.blocks.length} blocks</p>
                </div>
                <span
                  className="shrink-0 text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: node.status === "ready" ? "rgba(110,169,118,0.18)" : "rgba(255,193,7,0.18)",
                    color: node.status === "ready" ? "#37593c" : "#856404",
                    border: `1px solid ${node.status === "ready" ? "rgba(110,169,118,0.4)" : "rgba(255,193,7,0.4)"}`,
                  }}
                >
                  {node.status}
                </span>
                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/builder/${nodeId}`); }}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all"
                    style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(110,169,118,0.4)", color: "#37593c" }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(163,209,165,0.4)" }}>
              <BookOpen size={28} className="text-[#a3d1a5] mb-3" />
              <p className="text-[#37593c]/70 text-sm">{isOwner ? "No AI Tutors yet. Create one above." : "No content published yet."}</p>
            </div>
          )}
        </section>

        {/* Assessments stub */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#37593c] uppercase tracking-wider mb-3">Assessments</h2>
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.25)", border: "1px dashed rgba(163,209,165,0.5)" }}>
            <p className="text-[#37593c]/50 text-sm">Coming soon</p>
          </div>
        </section>

        {/* Resources stub */}
        <section>
          <h2 className="text-sm font-semibold text-[#37593c] uppercase tracking-wider mb-3">Resources</h2>
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.25)", border: "1px dashed rgba(163,209,165,0.5)" }}>
            <p className="text-[#37593c]/50 text-sm">Coming soon</p>
          </div>
        </section>
      </main>

      <CreateTutorModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/app/spaces/[space_id]/node/[node_id]/page.tsx`**

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserMenu } from "@/features/auth";
import { NodePage } from "@/features/spaces";

export default async function NodeRoute(props: {
  params: Promise<{ space_id: string; node_id: string }>;
}) {
  const params = await props.params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <NodePage spaceId={params.space_id} nodeId={params.node_id} userMenu={<UserMenu />} />;
}
```

- [ ] **Step 4: Export NodePage from spaces index**

Append to `frontend/features/spaces/index.ts`:
```ts
export { NodePage } from "./components/node-page";
```

- [ ] **Step 5: Update CategoryRow to navigate to node page instead of lesson page**

In `frontend/features/spaces/components/category-row.tsx`, change both navigation calls from `/courses/${spaceId}/lesson/${category.id}` to `/spaces/${spaceId}/node/${category.id}`.

- [ ] **Step 6: TypeScript check**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx tsc --noEmit 2>&1 | head -30
```

Fix errors.

- [ ] **Step 7: Commit**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native
git add frontend/features/spaces/components/create-tutor-modal.tsx frontend/features/spaces/components/node-page.tsx frontend/app/spaces/ frontend/features/spaces/index.ts frontend/features/spaces/components/category-row.tsx
git commit -m "feat(spaces): Page 3 — NodePage with AI Tutor creation wizard"
```

---

## Task 4: Builder Page 4 — BlockTree + BlockEditor + AgentSidebar

**Files:**
- Create: `frontend/features/builder/components/block-tree.tsx`
- Create: `frontend/features/builder/components/block-editor.tsx`
- Create: `frontend/features/builder/components/agent-sidebar.tsx`
- Create: `frontend/features/builder/components/builder-page.tsx`
- Create: `frontend/app/builder/[component_id]/page.tsx`

**Context:** 
- `BlockTree` renders the list of blocks as a vertical tree. Each block shows: position badge, type label, a short content preview, and an "Edit" button.
- `BlockEditor` is a Dialog containing a `<Textarea>` pre-filled with `JSON.stringify(block.content, null, 2)`. On save it calls `updateBlock` and calls `onSaved(updatedBlock)`.
- `AgentSidebar` is a Sheet (right side). It has a chat input at the bottom. Each user message is sent via `agentEdit`. The AI reply + updated blocks are returned. The sidebar shows the conversation history and calls `onBlocksUpdated(blocks)` to refresh the tree.
- `BuilderPage` composes all three. Top bar: "Preview" button (links to `/courses/${lesson.course_id}/lesson/${lessonId}`) and "Publish" button (calls `publishLesson`, then shows "Published ✓").
- The builder route is owner-only. Read `backend/app/features/builder/service.py` — `get_lesson_detail` returns `is_owner`. If `!is_owner`, show a 403 message.

Read the existing `Sheet` component usage (it's in `frontend/components/ui/sheet.tsx`) before writing AgentSidebar.

- [ ] **Step 1: Create `frontend/features/builder/components/block-tree.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { TutorBlock } from "@/features/spaces/types";
import { BlockEditor } from "./block-editor";

interface Props {
  blocks: TutorBlock[];
  isOwner: boolean;
  onBlockSaved: (block: TutorBlock) => void;
}

const BLOCK_TYPE_COLORS: Record<string, string> = {
  markdown: "#6ea976",
  code: "#37593c",
  mermaid: "#a3d1a5",
  concept_check: "#6ea976",
  understanding_check: "#0e2114",
};

export function BlockTree({ blocks, isOwner, onBlockSaved }: Props) {
  const [editing, setEditing] = useState<TutorBlock | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="flex items-start gap-3 px-5 py-4 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(163,209,165,0.45)",
            boxShadow: "0 2px 8px rgba(110,169,118,0.07)",
          }}
        >
          <span
            className="shrink-0 mt-0.5 text-xs font-mono px-2 py-0.5 rounded-full text-white"
            style={{ background: BLOCK_TYPE_COLORS[block.type] ?? "#6ea976" }}
          >
            {block.position}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#37593c] uppercase tracking-wide mb-1">{block.type.replace(/_/g, " ")}</p>
            <p className="text-sm text-[#0e2114] truncate">
              {typeof block.content === "object"
                ? Object.values(block.content)[0]?.toString().slice(0, 80) ?? ""
                : ""}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setEditing(block)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(110,169,118,0.4)", color: "#37593c" }}
            >
              Edit
            </button>
          )}
        </div>
      ))}

      {editing && (
        <BlockEditor
          block={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            onBlockSaved(updated);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/features/builder/components/block-editor.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateBlock } from "../actions/update-block";
import type { TutorBlock } from "@/features/spaces/types";

interface Props {
  block: TutorBlock;
  onClose: () => void;
  onSaved: (block: TutorBlock) => void;
}

export function BlockEditor({ block, onClose, onSaved }: Props) {
  const [value, setValue] = useState(() => JSON.stringify(block.content, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(value);
    } catch {
      setError("Invalid JSON.");
      return;
    }
    setLoading(true);
    try {
      const updated = await updateBlock(block.id, parsed);
      onSaved(updated);
    } catch {
      setError("Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        style={{ background: "rgba(237,245,234,0.97)", backdropFilter: "blur(16px)", border: "1px solid rgba(163,209,165,0.5)" }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#0e2114]">Edit Block ({block.type})</DialogTitle>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={12}
          className="font-mono text-xs border-[#a3d1a5] focus-visible:ring-[#6ea976] resize-none"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer"
            style={{ color: "#37593c", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(110,169,118,0.4)" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 rounded-full text-sm font-medium text-white cursor-pointer disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `frontend/features/builder/components/agent-sidebar.tsx`**

Read `frontend/components/ui/sheet.tsx` first to confirm the import names.

```tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { agentEdit } from "../actions/agent-edit";
import type { TutorBlock } from "@/features/spaces/types";
import { Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  onBlocksUpdated: (blocks: TutorBlock[]) => void;
}

export function AgentSidebar({ open, onClose, lessonId, onBlocksUpdated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const { reply, blocks } = await agentEdit(lessonId, text);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      onBlocksUpdated(blocks);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        className="flex flex-col gap-0 p-0 w-[380px]"
        style={{ background: "rgba(237,245,234,0.97)", backdropFilter: "blur(16px)", borderLeft: "1px solid rgba(163,209,165,0.5)" }}
      >
        <SheetHeader className="px-5 py-4 border-b" style={{ borderColor: "rgba(163,209,165,0.3)" }}>
          <SheetTitle className="text-[#0e2114] text-sm">AI Curriculum Editor</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-sm text-center" style={{ color: "rgba(55,89,60,0.5)" }}>
              Describe changes to make to the curriculum blocks.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm"
                style={
                  m.role === "user"
                    ? { background: "linear-gradient(135deg, #6ea976, #37593c)", color: "white" }
                    : { background: "rgba(255,255,255,0.7)", color: "#0e2114", border: "1px solid rgba(163,209,165,0.4)" }
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2.5 rounded-2xl text-sm" style={{ background: "rgba(255,255,255,0.7)", color: "#6ea976", border: "1px solid rgba(163,209,165,0.4)" }}>
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-4 border-t flex gap-2" style={{ borderColor: "rgba(163,209,165,0.3)" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="e.g. Add a code exercise about list comprehensions"
            className="flex-1 px-4 py-2 rounded-full text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(163,209,165,0.5)", color: "#0e2114" }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Create `frontend/features/builder/components/builder-page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Eye, CheckCircle } from "lucide-react";
import { BlockTree } from "./block-tree";
import { AgentSidebar } from "./agent-sidebar";
import { useLessonBlocks } from "../hooks/use-lesson-blocks";
import { publishLesson } from "../actions/publish-lesson";
import type { TutorBlock } from "@/features/spaces/types";

interface Props {
  lessonId: string;
}

export function BuilderPage({ lessonId }: Props) {
  const router = useRouter();
  const { lesson, loading, mutate } = useLessonBlocks(lessonId);
  const [agentOpen, setAgentOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function handleBlockSaved(updated: TutorBlock) {
    if (!lesson) return;
    mutate({
      ...lesson,
      blocks: lesson.blocks.map((b) => (b.id === updated.id ? updated : b)),
    }, false);
  }

  function handleBlocksUpdated(blocks: TutorBlock[]) {
    if (!lesson) return;
    mutate({ ...lesson, blocks }, false);
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await publishLesson(lessonId);
      setPublished(true);
    } catch {
      // ignore — button stays enabled
    } finally {
      setPublishing(false);
    }
  }

  if (!loading && lesson && !lesson.is_owner) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #edf5ea, #d1eace)" }}>
        <p className="text-[#37593c] font-medium">Access denied — owner only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #edf5ea 0%, #d1eace 40%, #c8e6c5 100%)" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 h-14 px-6 flex items-center justify-between"
        style={{ background: "rgba(237,245,234,0.8)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(163,209,165,0.4)" }}
      >
        <div>
          <p className="text-xs text-[#37593c]/60 uppercase tracking-wider">Draft Mode</p>
          {lesson && <p className="text-sm font-semibold text-[#0e2114] -mt-0.5">{lesson.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          {lesson && (
            <button
              onClick={() => router.push(`/courses/${lesson.course_id}/lesson/${lessonId}`)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(110,169,118,0.4)", color: "#37593c" }}
            >
              <Eye size={13} /> Preview
            </button>
          )}
          <button
            onClick={() => setAgentOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer text-white transition-all"
            style={{ background: "linear-gradient(135deg, #6ea976, #37593c)" }}
          >
            <Bot size={13} /> AI Editor
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || published}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer disabled:opacity-60 transition-all"
            style={{
              background: published ? "rgba(110,169,118,0.2)" : "rgba(255,255,255,0.6)",
              border: "1px solid rgba(110,169,118,0.5)",
              color: "#37593c",
            }}
          >
            <CheckCircle size={13} />
            {published ? "Published ✓" : publishing ? "Publishing…" : "Publish to Space"}
          </button>
        </div>
      </header>

      <main className="relative flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.4)", border: "1px solid rgba(163,209,165,0.3)" }} />
            ))}
          </div>
        ) : lesson && lesson.blocks.length > 0 ? (
          <BlockTree blocks={lesson.blocks} isOwner onBlockSaved={handleBlockSaved} />
        ) : (
          <div className="flex items-center justify-center py-24 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(163,209,165,0.4)" }}>
            <p className="text-[#37593c]/60 text-sm">No blocks yet — generation may still be in progress.</p>
          </div>
        )}
      </main>

      {lesson && (
        <AgentSidebar
          open={agentOpen}
          onClose={() => setAgentOpen(false)}
          lessonId={lessonId}
          onBlocksUpdated={handleBlocksUpdated}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/app/builder/[component_id]/page.tsx`**

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BuilderPage } from "@/features/builder";

export default async function BuilderRoute(props: {
  params: Promise<{ component_id: string }>;
}) {
  const params = await props.params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <BuilderPage lessonId={params.component_id} />;
}
```

- [ ] **Step 6: TypeScript check + ESLint**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/frontend
npx tsc --noEmit 2>&1 | head -40
npx next lint 2>&1 | grep -i error | head -20
```

Fix all errors.

- [ ] **Step 7: Commit**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native
git add frontend/features/builder/components/ frontend/app/builder/
git commit -m "feat(builder): Page 4 — BuilderPage with block tree, inline editor, and AI agent sidebar"
```
