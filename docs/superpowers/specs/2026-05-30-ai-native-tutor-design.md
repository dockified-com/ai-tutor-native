# AI Native Programming Tutor — V1 Design Spec

**Date:** 2026-05-30
**Status:** Design approved — implementation plan pending
**Project:** Dockified Personalized Learning Module — V1
**Author:** yeakkhaily (with brainstorming support)

---

## 1. Executive Summary

The Dockified Personalized Learning Module V1 is a standalone "AI Native Programming Tutor" web application — the first shippable feature of the broader Dockified LMS startup.

**Shape:** one creator (the founder) + many students. The founder uploads a PDF + custom instruction prompt → an AI generates a complete static lesson script (text, code exercises, mermaid diagrams, comprehension checks, understanding checks) → the founder previews and publishes → shares a public 6-character course code with classmates. Classmates enter the code, walk through lessons block-by-block in a 2-pane interactive tutor with TTS narration. The AI re-engages live only on failed code, free-form questions, wrong concept-checks, and understanding-check evaluations.

### In V1

- Single-creator authoring (PDF upload, custom prompt, preview, regenerate-only editing)
- Public course codes (no invite-link infrastructure)
- **Tier A static pre-generated lesson scripts** (full script materialised at course-creation time)
- 5 SDUI block types: Markdown, Code+Terminal, Mermaid, ConceptCheck, UnderstandingCheck
- TTS narration pre-generated at course creation, played client-side
- 2-pane tutor with click-to-jump (no scroll-sync)
- Course Progress slide-out
- Real-time AI: Ask Anything, Run Code, Socratic Hint (no answer reveal), Understanding-Check evaluation
- **Pedagogical contract:** lessons gated by demonstrated understanding; never reveal exercise answers

### Explicitly deferred to V2+

- Engine B (Code Auto-Grader for assignments)
- Engine C (Voice Mock Interview)
- Multi-creator accounts, invite-link system
- Block-level editing (V1: regenerate whole lesson only)
- Scroll-sync time machine
- Microphone, multi-language UI, voice questions
- Notes panel (Instructor + My Notes)
- Adaptive lessons / student profiling (Tier B/C dynamic generation)
- Mobile (V1: desktop web only)
- LangGraph, LangChain, LlamaIndex (adopted in V2/V3 when each earns its keep)

---

## 2. User Roles

**Creator** (single account in V1, the founder):
- Sign in → dashboard → create course → preview → publish → share code
- Auth: **Clerk** (email + password and/or social login)
- Authorization: `users.role = 'creator'`, set via SQL on the founder's row

**Student** (everyone else):
- Sign up → enter course code (or click `/join/{code}`) → walk through lessons
- Auth: **Clerk** (email + password and/or social login)
- Default `users.role = 'student'`

**User-row provisioning:** when a user signs in for the first time, FastAPI middleware checks for a `users` row by `clerk_user_id` and lazily creates one (synced from Clerk's user object) if missing. A Clerk webhook (`user.created` / `user.updated`) keeps email + display_name in sync going forward.

---

## 3. System Architecture

### Tech stack

**Frontend** — Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui, Zustand, `@monaco-editor/react`, `react-mermaid`, `@clerk/nextjs` (auth).

**Backend** — FastAPI, Python 3.12, **vanilla SDKs** (no LangChain/LangGraph/LlamaIndex in V1). Key libraries:
- `anthropic` — LLM + embeddings
- `pdfplumber` — PDF text extraction
- `supabase-py` — DB + Storage + Auth client
- `httpx` — Judge0 API
- `pydantic` v2 — schemas
- `sse-starlette` — SSE streaming

**External services:**
- **Anthropic Claude Sonnet** — course generation, RAG answers, code evaluation, Socratic hints, understanding-check evaluation
- **OpenAI TTS** — pre-generated audio at course creation
- **Judge0 RapidAPI** — code execution sandbox (60+ languages)

**Auth** — **Clerk** (managed sign-in/sign-up, social login, JWT issuance). Frontend uses `@clerk/nextjs`; backend verifies Clerk JWTs and resolves the app-level `users` row by `clerk_user_id`. Free tier covers ~10K MAU; $25/mo after.

**Storage / DB** — **Supabase managed**. Postgres + pgvector + Storage. (Auth is handled by Clerk, not Supabase Auth.)

### High-level system

```
[ Next.js 16 frontend on Vercel ]
        Tailwind v4 · shadcn/ui · Zustand · Monaco · Mermaid · Clerk
        │
        │ REST + SSE  (Authorization: Bearer <Clerk JWT>)
        ▼
[ FastAPI backend (Docker on VPS, behind Caddy) ]
        │  validates Clerk JWT, resolves app user by clerk_user_id
        │
        ├─→ Clerk      (token verification; user lookup webhook)
        ├─→ Supabase   (Postgres + pgvector + Storage)
        ├─→ Anthropic Claude Sonnet
        ├─→ OpenAI TTS
        └─→ Judge0 RapidAPI
```

Caddy reverse proxy in Docker on the VPS, auto-provisioning SSL certificates from Let's Encrypt.

### Module structure & boundaries

The codebase is organized into **features** with strict module boundaries. This pattern (similar to Feature-Sliced Design) prevents the cross-feature spaghetti that makes growing codebases brittle. It also makes it trivial to extract a feature later — for example, the parent Dockified LMS may eventually consume `features/tutor/` directly.

**Frontend (Next.js):**

```
frontend/
├── app/         Routes — thin pages composing features (no business logic)
├── features/    Feature modules — auth, authoring, courses, enrollment, tutor, progress
└── shared/      Cross-cutting utilities (api client, ui kit, types, layouts)
```

**Backend (FastAPI):** mirrors the same structure:

```
backend/app/
├── features/    Feature modules — auth, authoring, courses, enrollment, tutor, progress
├── shared/      Infrastructure (db, ai providers, RAG helpers, config, deps)
└── main.py      App factory; includes feature routers
```

**Boundary rule (enforced by ESLint on frontend, by code review on backend):**

- A file inside `features/X/` may import from `features/X/...` and `shared/...`
- A file inside `features/X/` **must not** import from `features/Y/...` directly
- Each feature exposes a single public API via `index.ts` (frontend) or `__init__.py` (backend)
- Cross-feature behavior happens at the **page/route level** in `app/` — pages compose features; features don't compose each other
- Code that turns out to be useful across features is **promoted** to `shared/`

**ESLint enforcement** uses `eslint-plugin-boundaries`:

```js
// eslint.config.mjs (sketch)
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
        { from: 'feature', allow: ['shared'] },   // strict: NO cross-feature
        { from: 'shared',  allow: ['shared'] }
      ]
    }]
  }
}
```

**Server actions** (Next.js) live inside their feature: e.g. `features/authoring/actions/regenerate-lesson.ts`. They authenticate via Clerk's server helpers, then call FastAPI endpoints (or hit the DB directly for simple CRUD). Heavy/long-running work — generation pipeline, AI streaming, code execution — lives in FastAPI; server actions are thin orchestration layers.

When V2 adds Engine B (Auto-Grader), it lives in `features/grading/` — fully isolated from V1 features. When V3 adds Engine C (Voice Interview), it lives in `features/interview/`. No V1 feature has to know about them.

### Architectural principle

**Static-first, real-time only where it matters.**

The lesson script is generated once and frozen. AI re-engages live only when the student does something the script can't predict:

1. Asks a free-form question in the footer
2. Submits failing code
3. Picks a wrong concept-check answer
4. Submits an understanding-check response

Everything else (markdown text, audio, starter code, expected outputs, mermaid diagrams, concept-check explanations) is pre-generated and served from the database. This keeps Continue instant, the founder's preview accurate, and per-student costs near zero.

---

## 4. Data Model

Postgres via Supabase, pgvector enabled. All tables include `id uuid pk`, `created_at`, `updated_at` unless otherwise noted.

### Core tables

**`users`** (mirrors Clerk's user records with app-specific fields)
- `clerk_user_id` TEXT UNIQUE — Clerk's user id (e.g. `user_2jK…`); source of truth for identity
- `email` UNIQUE — synced from Clerk on first sign-in / via Clerk webhook
- `display_name` — synced from Clerk; user can override
- `role` ENUM(`creator` | `student`), default `student`

**`courses`**
- `creator_id` → users.id
- `code` VARCHAR(6) UNIQUE — public 6-char alphanumeric (e.g. `BCKND1`)
- `title`, `description`, `default_language`
- `source_pdf_url` — Supabase Storage path
- `custom_prompt` TEXT
- `status` ENUM(`draft` | `generating` | `ready` | `published` | `failed`)
- `total_lessons`, `total_blocks` — denormalized for dashboard

**`course_chunks`** (RAG)
- `course_id`
- `content` TEXT
- `embedding` VECTOR(1536) — Anthropic embedding
- `chunk_index`, `page_number`
- HNSW index on `embedding`

**`lessons`**
- `course_id`
- `position` INT, UNIQUE(`course_id`, `position`)
- `title`, `summary`
- `status` ENUM(`generating` | `ready` | `failed`)

**`blocks`**
- `lesson_id`
- `position` INT, UNIQUE(`lesson_id`, `position`)
- `type` ENUM(`markdown` | `code` | `mermaid` | `concept_check` | `understanding_check`)
- `content` JSONB — type-specific payload (see below)
- `tts_audio_url` — Supabase Storage path; null where narration N/A

**`enrollments`**
- `user_id`, `course_id` (UNIQUE pair)
- `current_lesson_id`, `current_block_id` — bookmark
- `started_at`, `completed_at`

**`block_progress`**
- `enrollment_id`, `block_id` (UNIQUE pair)
- `status` ENUM(`not_started` | `in_progress` | `completed`)
- `completed_at`

**`code_submissions`**
- `enrollment_id`, `block_id`
- `code` TEXT, `language`
- `judge0_token`
- `stdout`, `stderr`, `exit_code`
- `verdict` ENUM(`passed` | `failed` | `runtime_error` | `compile_error` | `error`)
- `socratic_hint` TEXT — populated only on failure
- `attempt_number` INT

**`concept_check_attempts`**
- `enrollment_id`, `block_id`
- `selected_answer`
- `is_correct` BOOL
- `explanation` TEXT — snapshot of explanation served
- `attempt_number` INT

**`understanding_check_attempts`**
- `enrollment_id`, `block_id`
- `response` TEXT
- `level` ENUM(`poor` | `fair` | `good` | `excellent`)
- `feedback` TEXT
- `passed` BOOL
- `attempt_number` INT

**`questions`** (Ask-Anything log)
- `enrollment_id`
- `block_id` — context (which block was active when asked)
- `question_text`, `answer_text`
- `source_chunks` JSONB — array of chunk IDs used in RAG (for citation/debug)

### Block content shapes (JSONB)

```jsonc
// markdown
{ "text": "Decorators are functions that..." }

// code
{
  "instruction": "Write a function that returns a + b",
  "language": "python",
  "starter_code": "def add(a, b):\n    pass",
  "expected_match": "exact",          // exact | regex | ai_eval
  "expected_output": "5",
  "hint_seed_prompt": "Look at the return statement..."
}

// mermaid
{
  "instruction": "Here's how a request flows:",
  "diagram": "graph LR; Client-->MW1-->Handler"
}

// concept_check
{
  "question": "Is this code thread-safe?",
  "options": ["Yes", "No"],
  "correct": "No",
  "explanation_correct": "Right — no lock on the shared counter.",
  "explanation_wrong": "Look at the counter mutation; two threads can race."
}

// understanding_check
{
  "prompt": "In your own words, what does a decorator do?",
  "evaluation_rubric": "Should mention: takes function as arg, wraps it, returns enhanced version. Should NOT say it modifies the original function.",
  "threshold": "good"                  // poor | fair | good | excellent
}
```

### Why JSONB content (not table-per-type)

Adding a new block type (e.g. `confidence_meter` for the future Voice Interview engine) is one ENUM addition + one Pydantic schema, **zero migrations**. Pydantic enforces shape at the API boundary; Postgres stays simple.

### Indexes

- `users.email` UNIQUE
- `courses.code` UNIQUE
- `courses.creator_id`
- `course_chunks.embedding` HNSW
- `blocks(lesson_id, position)` UNIQUE
- `enrollments(user_id, course_id)` UNIQUE
- `block_progress(enrollment_id, block_id)` UNIQUE

---

## 5. Authoring Flow (Creator)

### Pages

| Path | Component | Who |
|---|---|---|
| `/sign-in/[[...rest]]`, `/sign-up/[[...rest]]` | Clerk sign-in / sign-up (catch-all routes for Clerk's components) | Both |
| `/dashboard` | Courses list (creator: own + "Create"; student: enrolled + "Join with Code") | Both |
| `/courses/new` | 3-step creation wizard | Creator |
| `/courses/{id}` | Course detail with status, lessons, action bar | Both (different views) |
| `/courses/{id}/preview` | Tutor view in preview mode (no progress saved) | Creator |
| `/join/{code}` | Public auto-enroll URL (signs up via Clerk if needed, then enrolls + redirects) | Both |

### Three-step wizard (`/courses/new`)

State held in Zustand (survives refresh).

**Step 1 — Upload PDF**
- Drag/drop or file picker; ≤10 MB; `.pdf` only
- Stored at Supabase Storage `pdfs/{user_id}/{uuid}.pdf`
- Reject if first-page text extraction is empty (likely scanned; OCR is V2)

**Step 2 — Configure**
- Title (required)
- Description (optional)
- Default language dropdown (Python / JS / TS / Java / C++ / Go / Rust / …)
- Custom prompt textarea ("Make it beginner-friendly", "Use real-world examples", etc.)

**Step 3 — Generate**
- `POST /api/courses/generate` returns `{course_id, status: 'generating'}` and kicks off async work
- Client redirects to `/courses/{id}` and polls `/api/courses/{id}/status` every 3s
- Pipeline phases: `extracting_pdf` → `embedding` → `generating_outline` → `generating_lesson_{n}` → `generating_audio` → `ready`
- Total: ~3–8 minutes for a 30-page PDF, ~5 lessons × ~10 blocks each

### Preview mode

When `status='ready'`, creator opens `/courses/{id}/preview`:
- Same UI as student tutor view
- `?preview=true` flag tells backend NOT to write `block_progress`, `code_submissions`, `concept_check_attempts`, or `understanding_check_attempts`
- Banner: "PREVIEW MODE — interactions not saved. [Exit Preview]"
- "Regenerate this lesson" modal at any block re-runs lesson generation with optional refined prompt

### Publish

From `/courses/{id}`:
- Validates `status == 'ready'`
- Generates 6-char alphanumeric course code; retries on collision (max 5×)
- Sets `status = 'published'`
- Surfaces shareable link: `https://{app}/join/{code}`

### Regenerate (V1: lesson-level only)

"Regenerate Lesson N" → modal asks for refined prompt → backend deletes the lesson's blocks + audio + progress (cascade) → re-runs per-lesson generation pipeline only.

**Explicitly NOT in V1:** editing individual blocks, reordering blocks, manual content edits, partial-block regen.

### Background job model

V1 (single creator, low traffic): generation runs as an in-process **asyncio** task on the FastAPI server. Single process, no Redis/Celery. Job is one async function; queue is `asyncio.Queue`. Swap to RQ + Redis when concurrent generation becomes real (V2 multi-creator).

---

## 6. Tutor Experience (Student)

### Pages

- `/dashboard` — enrolled courses with progress
- `/courses/{id}` — student-side course detail (lesson list + completion %)
- `/courses/{id}/lesson/{lesson_id}` — **the tutor view** (the moat)

### Tutor layout

```
┌────────────────────────────────────────────────────┬──┐
│ ◀ Course · Lesson title       │ ▶ play  Auto▢  ⨯ exit  │▮ │
├────────────────────────┬───────────────────────────┤▯ │  ← edge nav
│ Left (~38%)             │ Right (~62%)                  │▯ │
│                         │                               │  │
│ [chat-like feed of      │ [dynamic workspace]           │  │
│  revealed blocks;       │  · markdown / mermaid SVG /   │  │
│  active block           │    Monaco editor + terminal / │  │
│  highlighted]           │    empty default              │  │
│                         │                               │  │
│ ▼ [Continue (3)]        │                               │  │
├─────────────────────────┴───────────────────────────┤  │
│ Ask anything about this lesson…                     ▶ │  │
└─────────────────────────────────────────────────────┴──┘
```

Edge nav strip: Course Progress slide-out · Audio settings · Exit.

### Block-by-block reveal

Page server-fetches the entire lesson (blocks + audio URLs + progress). Initial state: blocks revealed up to the bookmark; active block is the bookmark itself.

Click **Continue**:
- Next block reveals in left pane (chat-like fade-in)
- TTS audio for that block auto-plays
- Right pane updates **only** if block is `code` or `mermaid` (markdown / concept-check / understanding-check don't disturb the workspace)
- Bookmark advances; `block_progress` row written

### Block rendering rules

| Type | Left pane | Right pane effect | Continue gating |
|---|---|---|---|
| `markdown` | Rendered markdown text | (no change) | Auto-enables; auto-advances if "Auto Continue" on |
| `code` | `instruction` + "Code Exercise" badge | Sets workspace to Monaco + terminal | **Pass-only.** Socratic on failure; never reveal answer |
| `mermaid` | `instruction` text | Sets workspace to rendered Mermaid SVG | Auto-enables |
| `concept_check` | Question + Yes/No buttons | (no change) | Enables after answer (one-shot) |
| `understanding_check` | Prompt + textarea | (no change) | **Threshold-only.** Socratic dialogue until rubric threshold met |

### Code block flow

1. Monaco editor pre-filled with `starter_code`, language set
2. Student edits, clicks **Run** (or `Ctrl+Enter`) → `POST /api/blocks/{id}/run`
3. Backend submits to Judge0 → returns stdout/stderr + verdict
4. **Pass:** green check in terminal, Continue enables
5. **Fail:** red X; frontend immediately calls `/api/blocks/{id}/socratic-hint`; hint streams inline below the failure
6. After 3+ fails: hints offer analogous *simpler* example to walk through together — **never this exercise's answer**
7. Student is never trapped — can ask in footer, click past blocks, take a break (progress saves) — but cannot bypass

### Concept-check flow

1. Student picks Yes/No → `POST /api/blocks/{id}/concept-check`
2. Backend returns pre-generated explanation matching answer correctness
3. Renders in chat feed below the question
4. **One-shot pedagogy:** correct or wrong, Continue enables. No retry loop.

### Understanding-check flow

1. Student types response in textarea → `POST /api/blocks/{id}/understanding-check`
2. Backend LLM evaluates against rubric → `{level, feedback, passed}`
3. **`level ≥ threshold`** → AI replies encouragingly; "Next Lesson" enables
4. **`level < threshold`** → AI gives Socratic feedback (gaps, leading questions, NEVER the answer); student revises
5. Loop continues until threshold met
6. **No skip. No give-up.** Lesson gated by demonstrated understanding.

### Click-to-jump (no scroll-sync)

Past blocks remain in the feed. Click a past block:
- It becomes `active_block_id`
- Right pane re-derives from active block
- Below-active blocks fade to ~60% opacity
- "Return to current" pill appears top-right

Pure Zustand state. No scroll listeners. No memoization. Right pane is a derivation of `active_block_id`.

### TTS audio

Each narration-eligible block has `tts_audio_url`. On block-becomes-active:
- HTML5 `<audio>` preloads URL
- Auto-plays (browser autoplay policy: requires one prior user interaction)

Header controls: play/pause, scrub, speed 0.5×–1.5×, volume. **Auto Continue** toggle: audio-end → auto-Continue (DataCamp paradigm).

### "Ask anything" footer

Sticky input at bottom of left pane:
1. Student types, submits → question appears as a styled bubble in the feed (visually distinct from lesson blocks)
2. `POST /api/enrollments/{id}/ask` with `{question, block_id}`
3. Backend: RAG over `course_chunks` (top-5) + LLM call with retrieved context + current-block context
4. Response streams via SSE → renders below the question bubble
5. **Lesson flow not interrupted** — student can keep clicking Continue while the answer streams

### Course Progress slide-out

From edge nav. Curriculum tree:
- Course title
- List of lessons, each with progress bar (% blocks completed)
- Current lesson highlighted
- Click any lesson → navigate

### Lesson completion

When the final block — always an `understanding_check` — is passed:
- AI gives a closing message acknowledging what was learned
- "Lesson Complete" card renders in feed
- "Next Lesson" button enables (or "Course Complete" celebration if it's the final lesson)

### Frontend state (Zustand)

```ts
TutorStore {
  blocks: Block[]                  // pre-fetched on page load
  revealed_block_ids: string[]     // ordered
  active_block_id: string          // drives right pane
  audio: { url, playing, speed, autoContinue }
  pending_answers: AskAnswer[]     // SSE-streaming Ask responses
  socratic_hint: string | null     // current block's failure hint
}
```

---

## 7. AI Pipelines & Realtime APIs

### Two surfaces

1. **Offline pipeline** — course generation: founder-triggered, async, runs once, produces all static content
2. **Realtime endpoints** — bounded LLM calls triggered by specific student actions

### Offline pipeline: course generation

Triggered by `POST /api/courses/generate`. Runs as a single asyncio task.

```
PDF upload
  → pdfplumber.extract_text()           [status = extracting_pdf]
  → chunk(~1000 chars, 100 overlap)
  → anthropic.embeddings (batched)      [status = embedding]
  → INSERT course_chunks
  → llm.outline_lessons(...)            [status = generating_outline]
       structured: [{title, summary, objectives}, ...]
  → INSERT lessons
  → for each lesson:                    [status = generating_lesson_{n}]
       top5 = retrieve(lesson.objectives, course_chunks)
       blocks = llm.generate_blocks(...)
            structured: ordered typed blocks
            CONSTRAINT: last block MUST be understanding_check
       INSERT blocks
  → for each text-bearing block:        [status = generating_audio]
       audio = openai.tts(text)
       upload to Storage
       UPDATE blocks SET tts_audio_url
  →                                     [status = ready]
```

**Prompt sketches:**

- **Outline** — "Given source material + instructions, produce 5–8 lessons covering the topic, each one cohesive concept, sequenced foundational→advanced. Strict JSON output."
- **Per-lesson** — "Generate 8–15 ordered blocks teaching `{lesson.title}`. Use `markdown` for explanation, `code` for practice (with starter, expected_output, hint_seed_prompt), `mermaid` for diagrams, `concept_check` for quick comprehension checks, `understanding_check` for the FINAL block. **The final block MUST be `understanding_check` with a rubric.**"

Both calls use Claude Sonnet with `tool_choice` forced to a Pydantic structured-output schema.

### Realtime endpoints

All authenticated via JWT; scoped to user's own enrollments.

#### `POST /api/enrollments/{id}/ask` — SSE stream

1. Embed question
2. Vector top-5 from `course_chunks` filtered to enrollment's course
3. Build prompt: course context + current-block summary + retrieved chunks + question
4. Stream Claude answer via SSE
5. Persist `questions` row with `source_chunks`

#### `POST /api/blocks/{id}/run` — one-shot

1. Submit to Judge0 (`POST /submissions?wait=true` with source, language_id)
2. Receive `{stdout, stderr, exit_code}`
3. Verdict per `block.content.expected_match`:
   - `exact` → trimmed string compare
   - `regex` → `re.match(expected, actual)`
   - `ai_eval` → separate Claude call: "did this accomplish the task?" given instruction + actual output
4. Persist `code_submissions` with verdict + attempt_number
5. Return `{verdict, stdout, stderr, attempt_number}`
6. **No hint generation here** — frontend separately calls `/socratic-hint` on failure

#### `POST /api/blocks/{id}/socratic-hint` — SSE stream

1. Load submission + block + prior attempts count
2. Build Socratic prompt: instruction + starter + student code + actual output + attempt number + `hint_seed_prompt`
3. **System prompt asserts: "Never reveal answer code. Never complete the code for them. Escalate guidance proportional to attempt count."**
4. Stream hint via SSE

#### `POST /api/blocks/{id}/concept-check` — one-shot

1. Compare `selected_answer` to `block.content.correct`
2. Return pre-generated `explanation_correct` or `explanation_wrong`
3. Persist `concept_check_attempts`
4. **No live LLM call** — explanations were generated at course creation. Saves cost + latency.

#### `POST /api/blocks/{id}/understanding-check` — SSE stream

1. Build evaluator prompt: question + rubric + response + threshold
2. Claude returns structured JSON: `{level: poor|fair|good|excellent, feedback, missing_points}`
3. **`level ≥ threshold`** → stream encouraging confirmation; mark passed
4. **`level < threshold`** → stream Socratic feedback (gaps, leading questions, NEVER the answer); block stays unpassed
5. Persist `understanding_check_attempts`

### RAG retrieval (V1 naive top-k)

```python
embedding = anthropic.embed(query)
chunks = db.execute(
  "SELECT * FROM course_chunks "
  "WHERE course_id = :cid "
  "ORDER BY embedding <=> :q LIMIT 5",
  {"cid": course_id, "q": embedding}
)
```

V2 swap: LlamaIndex hierarchical retrieval, query rewriting, hybrid BM25+vector. Embeddings stay in pgvector; only retrieval logic in the endpoint changes.

### SSE streaming pattern

```python
from sse_starlette.sse import EventSourceResponse

async def stream_hint(...):
    async def events():
        async with claude.messages.stream(...) as stream:
            async for chunk in stream.text_stream:
                yield {"event": "token", "data": chunk}
        yield {"event": "done", "data": ""}
    return EventSourceResponse(events())
```

```ts
const es = new EventSource(`/api/blocks/${id}/socratic-hint`);
es.addEventListener('token', e => append(e.data));
es.addEventListener('done', () => es.close());
```

### Cost & latency budget (~30-page PDF, ~5-lesson course)

| Operation | Cost |
|---|---|
| Course generation (one-time, founder pays) | ~$0.80 (LLM ~$0.30 + TTS ~$0.50) |
| Ask Anything | ~$0.006/question |
| Socratic hint | ~$0.003/failure |
| Concept-check | $0 (precomputed) |
| Understanding-check | ~$0.005/evaluation |
| Judge0 execution | $0 within free tier (50/day), $0.0005 after |
| **Per student per course** | **~$0.10–0.15** |

Latency targets:
- Course generation: 3–8 min (acceptable as bg job)
- Ask first token: < 2 s
- Code Run verdict: < 3 s
- Socratic hint first token: < 2 s
- Understanding-check verdict: < 3 s

---

## 8. Pedagogical Principles

These principles shape prompts and gating logic. Violating them is a bug, not a feature request.

### Principle 1 — Lessons gated by demonstrated understanding

- Every lesson ends with an `understanding_check` block (enforced by the generation prompt)
- "Next Lesson" only enables when the student passes the rubric threshold
- Loop continues with Socratic feedback until threshold met
- **No skip. No give-up.** Progress saves; student returns when ready.

### Principle 2 — Never reveal exercise answers

- Code-block failures generate Socratic hints that:
  - Explain the *way*, not the destination
  - Escalate guidance proportional to attempt count (high-level → localized → trace → analogous simpler example)
  - **Never** show the correct code
- Enforced by the system prompt of `/socratic-hint` and `/understanding-check`
- Tests verify no hint contains substantive solution code

### Principle 3 — Real-time only when the script can't predict

- Static lesson content is generated once and frozen
- AI re-engages live only on:
  1. Free-form student questions (footer)
  2. Failed code submissions
  3. Wrong concept-checks
  4. Understanding-check responses

---

## 9. Error Handling, Testing & Deployment

### Error handling — by surface

#### Course generation pipeline (offline)

| Failure | Behavior |
|---|---|
| PDF extraction empty (scanned/corrupt) | Reject at upload; "OCR not supported in V1" |
| Embedding API timeout | Retry ×3 with backoff; `course.status = 'failed'` if exhausted |
| Outline LLM call fails | Retry ×2; on failure, course marked failed, creator can retry |
| Per-lesson generation fails | Mark only that `lesson.status = 'failed'`; other lessons still ready; creator regenerates |
| TTS API fails | `tts_audio_url = null`; course publishable; audio falls back silently |
| Course code collision on publish | Retry with new random code (max 5×) |

**Fail-soft per-lesson, fail-hard per-stage.** A bad outline kills the run; a bad lesson is recoverable.

#### Realtime endpoints

| Failure | Behavior |
|---|---|
| Judge0 timeout / 5xx | `{verdict: 'error', message: 'Execution unavailable, retry'}`; **does not count as a failed attempt** |
| Anthropic 5xx / rate-limit | SSE emits `{event: 'error'}`; frontend shows "AI temporarily unavailable, retry"; non-counted |
| RAG returns zero chunks | Continue with empty context; LLM still answers but with weaker grounding |
| User accesses unenrolled course / another user's enrollment | 403 |
| Concurrent submissions | Idempotent via `attempt_number` |

#### Frontend

| Failure | Behavior |
|---|---|
| Audio file 404 | Silent fail; lesson continues text-only |
| Mermaid invalid syntax | Error placeholder; log `block_id` for backend repair |
| Monaco load fails | Fallback to `<textarea>` |
| SSE connection drops mid-stream | "Connection lost — retry" button restarts the request |
| Stale tab after idle | Re-fetch lesson state on `visibilitychange` |

### Testing

| Layer | Tool | What to test |
|---|---|---|
| Backend unit | `pytest` | Verdict logic, RAG query builder, block-content schemas, course-code generator |
| Backend integration | `pytest` + `pytest-asyncio` + `httpx` | Generation pipeline (mocked LLM/TTS, real Postgres), endpoint auth, multi-tenancy isolation |
| Frontend unit | Vitest | Zustand store transitions, block-rendering rules, active-block derivation |
| E2E | Playwright | Full creator + student flows |

LLM calls in tests are mocked or replayed (VCR.py). **Don't burn API budget in CI.**

#### Critical paths the test suite MUST cover

1. Founder creates and publishes a course end-to-end
2. Student joins via code, completes a lesson with markdown + code + understanding_check
3. Student fails code → Socratic hint streams → retries successfully (verify NO answer leak in any hint)
4. Student asks question → SSE-streamed answer with chunk citations
5. Audio plays + Auto-Continue advances

**Skipped in V1:** load tests, cross-browser, visual regression, formal a11y audits.

### Deployment

| Layer | V1 choice | Cost |
|---|---|---|
| Frontend | Vercel (Hobby) | $0 |
| Backend | FastAPI in Docker on VPS (Hetzner CX22 or DO Basic) | $5–10/mo |
| Reverse proxy + SSL | Caddy in Docker (auto Let's Encrypt) | $0 |
| Container registry | GitHub Container Registry (GHCR) | $0 |
| **Auth** | **Clerk (Free tier, ~10K MAU)** | **$0** (then $25/mo) |
| DB + Storage | Supabase (Free tier) | $0 |
| CI/CD | GitHub Actions: build → push GHCR → SSH-pull on VPS | $0 |
| Error tracking | Sentry (Developer tier) | $0 |
| Anthropic API | Pay-as-you-go | $10–20/mo |
| OpenAI TTS | Pay-as-you-go | $5/mo |
| Judge0 RapidAPI | Basic (50/day free) | $0 |
| Domain | Subdomain of `dockified.com` | (already owned) |

**Total V1 hosting: ~$25–50/mo.**

#### Docker layout

- `Dockerfile` (multi-stage: build → runtime, ~150 MB final image)
- `docker-compose.prod.yml` on VPS: `caddy` + `backend` + optional `redis` (V2 task queue)
- `docker-compose.dev.yml` locally: same backend + local Postgres + pgvector
- Deploy flow: push `main` → GitHub Actions builds → pushes GHCR → SSH/webhook pull on VPS → `docker compose pull && up -d`
- Caddy auto-provisions SSL certs from Let's Encrypt on first request to your domain

Secrets via Railway/Vercel env vars (never in repo). CORS locked to frontend domain.

### Observability

V1 minimum:
- Platform logs (Docker, Vercel)
- Sentry for unhandled exceptions
- Custom JSON logger emitting: generation duration, per-endpoint latency, LLM token use, Judge0 success rate

Eyeball metrics:
- Generation success rate (per stage)
- Per-endpoint p50/p95 latency
- Per-block failure rates (which exercises are too hard?)
- Lesson + course completion rate

Aggregated dashboards (Grafana / PostHog) → V2.

---

## 10. V1 Timeline & Milestones (~8 weeks solo, full-time)

| Week | Milestone |
|---|---|
| 1 | Auth, dashboard, course-creation wizard, Supabase wiring, Docker + Caddy on VPS |
| 2 | Generation pipeline (extract → embed → outline → blocks → TTS) |
| 3 | Tutor UI shell — 2-pane, block rendering for markdown + mermaid + concept_check |
| 4 | Monaco + Judge0 + `/run` + `/socratic-hint` (verify no answer leak) |
| 5 | `/ask` (RAG + SSE) + `/understanding-check` + lesson gating |
| 6 | TTS audio playback + Auto-Continue + Course Progress slide-out |
| 7 | Preview mode + Publish + `/join/{code}` + polish |
| 8 | Test pass + production deploy + onboard first classmate |

Compresses to 5–6 weeks with focus and the right shortcuts (shadcn/ui saves days on form/dialog/dropdown UI).

---

## 11. Scaling Roadmap (V2/V3 — additive, not disruptive)

| Future feature | How it slots in | V1 changes needed |
|---|---|---|
| Engine B (Auto-Grader) | New `assignments` table; reuses Judge0 + AI-eval | None |
| Engine C (Voice Interview) | New `interviews` table; reuses TTS + Anthropic; adds Whisper for STT | None |
| Multi-creator + invite-links | Lift "single creator" assertion; schema already has `creator_id` | None |
| LangGraph adaptive Socratic | Swaps implementation **inside** `/socratic-hint`; multi-step state machine | None outside that module |
| LlamaIndex richer RAG | Swaps retrieval **inside** `/ask`; embeddings stay in pgvector | None outside that module |
| Tier B JIT block generation | Adds "realize this block" endpoint; same schema, lazy population | None to SDUI/frontend |
| Mobile | Responsive Next.js frontend; backend unchanged | None |
| Adaptive student profiles | New `student_profiles` table; generation prompts augmented | Generation pipeline gets new context input |
| Microphone / STT for tutor | Browser ASR or OpenAI Whisper; new endpoint | Frontend ask-input gains mic mode |
| Block-level editing | New CRUD endpoints + drag-and-drop UI | Authoring pages extended |
| Multi-language UI | i18n strings + translation pipeline | Generation prompt augmented |
| Notes panel (Instructor + My Notes) | New `notes` table + auto-generated cheat sheet | Tutor edge nav extended |

The seams that matter — backend module boundaries, JSONB block schema, SDUI block types, single-Supabase backbone — are all extensible by design. **No V1 code needs to be rewritten** to land any of these.

---

## 12. Open Implementation Questions

To be resolved during implementation:

1. **Concrete LLM model selection per task** — Sonnet for generation/eval; cheaper Haiku for high-frequency calls like Socratic hints? Decide based on quality measurements during weeks 4–5.
2. **TTS voice selection** — single voice for V1 or per-course override? V1 default to one neutral voice (e.g., OpenAI's `alloy`); per-course override is V2.
3. **Custom prompt template structure** — fully free-form string or structured fields ("audience", "difficulty", "examples to favor")? Start free-form; structure if patterns emerge.
4. **Mermaid syntax validation** — server-side at generation time (catches bad output before student sees it) and client-side at render-time as fallback.
5. **Audio pre-generation parallelism** — TTS calls in batched parallel (`asyncio.gather` with semaphore=5) to keep `generating_audio` phase under ~2 minutes.
6. **Concept-check explanation freshness** — pre-generated at creation; if creator updates the rubric in V2, block edits regenerate explanations.
7. **`questions` log retention** — keep all forever for analytics, or TTL after 90 days? V1: keep all.
8. **Embedding model choice** — Anthropic's `voyage-3` via partnership, or fall back to OpenAI `text-embedding-3-small`. Decide based on retrieval-quality test at end of week 2.

---

## Appendix A — Reference Material

- **DataCamp's AI Native experience** is the primary UX reference. Key product traits we adopt:
  - 2-pane layout (chat left + dynamic workspace right)
  - Block-by-block reveal with Continue (N) counter
  - "Ask anything" footer for free-form questions
  - TTS narration with speed/auto-continue controls
  - Course Progress slide-out
- **DataCamp's full dynamic generation** (per-block LLM calls per Continue) is **NOT** adopted in V1 — too expensive, too slow, harder to preview. We adopt their UX, not their generation model. Tier B/C dynamic generation are roadmapped for V2/V3 when we have student-usage data showing where static lessons fall short.

## Appendix B — File Structure (Implementation Sketch)

The codebase follows a **feature-based** layout with strict module boundaries (see §3 "Module structure & boundaries"). Each feature is a self-contained module: components, server actions, hooks, stores, helpers — all internal — with a single public API exposed via `index.ts` (frontend) or `__init__.py` (backend).

### Frontend (Next.js 16)

```
frontend/
├── app/                                   Routes — thin pages composing features
│   ├── (auth)/
│   │   ├── sign-in/[[...rest]]/page.tsx   Clerk sign-in catch-all
│   │   └── sign-up/[[...rest]]/page.tsx   Clerk sign-up catch-all
│   ├── dashboard/page.tsx
│   ├── courses/
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── preview/page.tsx
│   │       └── lesson/[lesson_id]/page.tsx
│   ├── join/[code]/page.tsx
│   └── layout.tsx                         Root layout with <ClerkProvider>
├── middleware.ts                          Clerk auth middleware (protects /dashboard, /courses, …)
├── features/
│   ├── auth/                              Profile display, role checks
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── index.ts                       PUBLIC API (only these exports are importable elsewhere)
│   ├── authoring/                         Course-creation wizard, regenerate, preview banner
│   │   ├── components/
│   │   ├── actions/                       Server actions (e.g. createCourse, regenerateLesson)
│   │   ├── hooks/
│   │   ├── stores/                        Zustand wizard state
│   │   ├── lib/
│   │   └── index.ts
│   ├── courses/                           Course list, detail, dashboard cards
│   ├── enrollment/                        Course-code input, /join handler logic
│   ├── tutor/                             The moat — block renderers, layout, audio, Ask
│   │   ├── components/
│   │   │   ├── tutor-layout.tsx
│   │   │   ├── lesson-feed.tsx
│   │   │   ├── markdown-block.tsx
│   │   │   ├── code-block.tsx
│   │   │   ├── mermaid-block.tsx
│   │   │   ├── concept-check-block.tsx
│   │   │   ├── understanding-check-block.tsx
│   │   │   ├── ask-footer.tsx
│   │   │   └── audio-controls.tsx
│   │   ├── actions/                       runCode, askQuestion, submitConceptCheck, …
│   │   ├── hooks/
│   │   ├── stores/                        tutor-store.ts (Zustand)
│   │   ├── lib/                           derive-active-block, sse helpers
│   │   └── index.ts
│   └── progress/                          Course-progress slide-out, completion logic
├── shared/                                Cross-cutting (importable from anywhere)
│   ├── api/                               Backend API client + SSE wrapper
│   ├── components/                        App layout, headers, error boundaries
│   ├── lib/                               Generic utils (date, format)
│   ├── types/                             Cross-cutting types (Block envelopes, ApiError)
│   └── ui/                                shadcn/ui re-exports
├── eslint.config.mjs                      Includes `eslint-plugin-boundaries` rules
├── tailwind.config.js
├── next.config.ts
└── package.json
```

### Backend (FastAPI)

```
backend/
├── app/
│   ├── features/
│   │   ├── auth/                          Clerk JWT validation + lazy user-row provisioning
│   │   │   ├── routes.py                  /api/me, /api/auth/clerk-webhook
│   │   │   ├── service.py
│   │   │   └── __init__.py
│   │   ├── authoring/                     Generation pipeline, regenerate, publish
│   │   │   ├── routes.py
│   │   │   ├── service.py
│   │   │   ├── pipeline.py                Async generation: extract → embed → outline → blocks → tts
│   │   │   ├── schemas.py                 Pydantic structured-output schemas
│   │   │   └── prompts.py                 Course-gen prompt templates
│   │   ├── courses/                       Course CRUD, dashboard listing
│   │   ├── enrollment/                    Enroll-by-code, /join logic
│   │   ├── tutor/                         /run, /ask, /socratic-hint, /concept-check, /understanding-check
│   │   │   ├── routes.py
│   │   │   ├── service.py
│   │   │   └── prompts.py                 Socratic + understanding-eval prompts
│   │   └── progress/                      Block progress, lesson completion
│   ├── shared/
│   │   ├── db/                            SQL session, repositories, migrations
│   │   ├── ai/                            Provider clients (anthropic, openai, judge0)
│   │   ├── rag/                           Embed + retrieve helpers
│   │   ├── deps.py                        FastAPI dependencies (current_user, db_session)
│   │   ├── config.py                      Pydantic Settings
│   │   └── errors.py                      Exception handlers
│   └── main.py                            App factory, includes feature routers
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile                             Multi-stage build → ~150 MB runtime image
├── docker-compose.prod.yml                On VPS: caddy + backend (+ redis later)
├── docker-compose.dev.yml                 Local: backend + Postgres + pgvector
└── pyproject.toml                         deps + dev tools (ruff, mypy, pytest)
```

### Boundary contract

**Allowed imports:**
- `app/` → may import from `features/*` (via index.ts/__init__.py only) and `shared/`
- `features/X/` → may import from `features/X/...` and `shared/`
- `shared/` → may import from `shared/`

**Forbidden imports:**
- `features/X/` importing from `features/Y/` (cross-feature) — EVER
- Anything importing internals of another feature, bypassing its public API

When a feature truly needs another feature's behavior, the right move is one of:
1. Promote the shared piece to `shared/` (most common)
2. Coordinate at the page level in `app/` (if it's a UX composition concern)
3. Re-evaluate whether they should be one feature (rare, but possible if mis-sliced initially)

---

**End of design spec.** Implementation plan to be written next via `superpowers:writing-plans`.
