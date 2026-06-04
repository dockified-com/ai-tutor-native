# 5 — Roadmap
## Backend Step-by-Step Execution Plan — V1

**Source:** `docs/product/02_roadmap.md` · `docs/architecture/04_backend_plan.md`

> **Rule:** Execute tasks atomic step by atomic step in the order listed.
> Never skip ahead. Complete the current step fully (including tests) before moving to the next.

---

## Current Position: Week 2A — Full Database Schema

Week 1 (Auth Layer) is **complete**. The next atomic step is building all ORM models and the Alembic migration for the remaining 10 database tables.

---

## Phase 1 — Week 1: Auth Layer ✅ COMPLETE

All tasks done. Auth layer is production-ready.

**Delivered:**
- FastAPI app factory with lifespan
- Pydantic Settings, async DB session, FastAPI dependencies
- Clerk JWT JWKS verification (RS256, caching)
- `User` ORM model + `UserRole` enum
- `get_or_create_user()` + `update_user_from_clerk()` services
- `GET /api/me` + `POST /api/auth/clerk-webhook` routes
- Alembic `users` table migration
- Unit + integration tests (JWT, webhook, `/api/me`)

---

## Phase 2 — Week 2A: Full Database Schema 🎯 CURRENT

**Goal:** Create all ORM models for the remaining 10 tables and generate one Alembic migration.

### Atomic steps (execute in order):

**Step 2A-1:** Create `app/features/courses/models.py`
```
- Course (ORM model)
  - id: UUID PK
  - creator_id: UUID FK → users.id CASCADE
  - code: VARCHAR(6) UNIQUE nullable
  - title: TEXT NOT NULL
  - description: TEXT nullable
  - default_language: TEXT DEFAULT 'python'
  - source_pdf_url: TEXT NOT NULL
  - custom_prompt: TEXT nullable
  - status: CourseStatus enum ('draft','generating','ready','published','failed') DEFAULT 'draft'
  - generation_phase: GenerationPhase enum nullable
  - generation_error: TEXT nullable
  - total_lessons: INT DEFAULT 0
  - total_blocks: INT DEFAULT 0
  - created_at: TIMESTAMPTZ DEFAULT NOW()
  - updated_at: TIMESTAMPTZ DEFAULT NOW()
- CourseStatus (Python str enum)
- GenerationPhase (Python str enum)
```

**Step 2A-2:** Create `app/features/authoring/models.py`
```
- Lesson (ORM model)
  - id: UUID PK
  - course_id: UUID FK → courses.id CASCADE
  - position: INT NOT NULL
  - title: TEXT NOT NULL
  - summary: TEXT nullable
  - objectives: ARRAY(TEXT) nullable
  - status: LessonStatus enum ('generating','ready','failed') DEFAULT 'generating'
  - created_at / updated_at: TIMESTAMPTZ
  - UNIQUE (course_id, position)

- Block (ORM model)
  - id: UUID PK
  - lesson_id: UUID FK → lessons.id CASCADE
  - position: INT NOT NULL
  - type: BlockType enum ('markdown','code','mermaid','concept_check','understanding_check')
  - content: JSONB NOT NULL
  - tts_audio_url: TEXT nullable
  - created_at / updated_at: TIMESTAMPTZ
  - UNIQUE (lesson_id, position)

- CourseChunk (ORM model)
  - id: UUID PK
  - course_id: UUID FK → courses.id CASCADE
  - content: TEXT NOT NULL
  - embedding: VECTOR(1536) NOT NULL  [requires pgvector]
  - chunk_index: INT NOT NULL
  - page_number: INT nullable
  - created_at: TIMESTAMPTZ

- LessonStatus (str enum)
- BlockType (str enum)
```

**Step 2A-3:** Create `app/features/enrollment/models.py`
```
- Enrollment (ORM model)
  - id: UUID PK
  - user_id: UUID FK → users.id CASCADE
  - course_id: UUID FK → courses.id CASCADE
  - current_lesson_id: UUID FK → lessons.id SET NULL nullable
  - current_block_id: UUID FK → blocks.id SET NULL nullable
  - started_at: TIMESTAMPTZ DEFAULT NOW()
  - completed_at: TIMESTAMPTZ nullable
  - UNIQUE (user_id, course_id)
```

**Step 2A-4:** Create `app/features/progress/models.py`
```
- BlockProgress (ORM model)
  - id: UUID PK
  - enrollment_id: UUID FK → enrollments.id CASCADE
  - block_id: UUID FK → blocks.id CASCADE
  - status: BlockProgressStatus enum ('not_started','in_progress','completed') DEFAULT 'not_started'
  - completed_at: TIMESTAMPTZ nullable
  - created_at / updated_at: TIMESTAMPTZ
  - UNIQUE (enrollment_id, block_id)

- BlockProgressStatus (str enum)
```

**Step 2A-5:** Create `app/features/tutor/models.py`
```
- CodeSubmission (ORM model)
  - id: UUID PK
  - enrollment_id: UUID FK → enrollments.id CASCADE
  - block_id: UUID FK → blocks.id CASCADE
  - code: TEXT NOT NULL
  - language: TEXT NOT NULL
  - judge0_token: TEXT nullable
  - stdout: TEXT nullable
  - stderr: TEXT nullable
  - exit_code: INT nullable
  - verdict: CodeVerdict enum ('passed','failed','runtime_error','compile_error','error')
  - socratic_hint: TEXT nullable
  - attempt_number: INT DEFAULT 1
  - created_at: TIMESTAMPTZ

- ConceptCheckAttempt (ORM model)
  - id: UUID PK
  - enrollment_id / block_id: UUID FK
  - selected_answer: TEXT NOT NULL
  - is_correct: BOOL NOT NULL
  - explanation: TEXT NOT NULL
  - attempt_number: INT DEFAULT 1
  - created_at: TIMESTAMPTZ

- UnderstandingCheckAttempt (ORM model)
  - id: UUID PK
  - enrollment_id / block_id: UUID FK
  - response: TEXT NOT NULL
  - level: UnderstandingLevel enum ('poor','fair','good','excellent')
  - feedback: TEXT NOT NULL
  - passed: BOOL NOT NULL
  - missing_points: ARRAY(TEXT) nullable
  - attempt_number: INT DEFAULT 1
  - created_at: TIMESTAMPTZ

- Question (ORM model)
  - id: UUID PK
  - enrollment_id: UUID FK → enrollments.id CASCADE
  - block_id: UUID FK → blocks.id SET NULL nullable
  - question_text: TEXT NOT NULL
  - answer_text: TEXT nullable
  - source_chunks: JSONB nullable
  - created_at / updated_at: TIMESTAMPTZ

- CodeVerdict (str enum)
- UnderstandingLevel (str enum)
```

**Step 2A-6:** Create `__init__.py` stubs for all new feature folders
```
- app/features/courses/__init__.py
- app/features/authoring/__init__.py
- app/features/enrollment/__init__.py
- app/features/progress/__init__.py
- app/features/tutor/__init__.py
```

**Step 2A-7:** Register all new model modules in `alembic/env.py`
```python
from app.features.courses import models    # noqa: F401
from app.features.authoring import models  # noqa: F401
from app.features.enrollment import models # noqa: F401
from app.features.progress import models   # noqa: F401
from app.features.tutor import models      # noqa: F401
```

**Step 2A-8:** Run `alembic revision --autogenerate -m "add full schema"` and verify the generated migration covers all 10 new tables with correct FK constraints and indexes.

---

## Phase 3 — Week 2B: Shared Infrastructure

After 2A is merged, implement in this order:

1. `shared/errors.py` — `APIError`, `NotFoundError`, `ForbiddenError`, `GenerationError` + register handler in `main.py`
2. `shared/config.py` — add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `JUDGE0_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`
3. `shared/ai/anthropic_client.py` — singleton `AsyncAnthropic` client
4. `shared/ai/openai_client.py` — `AsyncOpenAI` client
5. `shared/ai/judge0_client.py` — `execute_code()` via httpx + `Judge0Result` Pydantic model + `LANGUAGE_IDS` map
6. `shared/rag/retriever.py` — `embed()` + `retrieve()` pgvector top-k
7. `shared/utils/retry.py` — `retry_async()` with exponential backoff
8. Add CORS middleware to `app/main.py`

---

## Phase 4 — Week 2C: Generation Pipeline

Implement `features/authoring/` in this order:

1. `authoring/schemas.py` — all block content models + `LessonBlocks` with `@model_validator` (last block = `understanding_check`)
2. `authoring/prompts.py` — outline prompt + per-lesson blocks prompt
3. `authoring/pipeline.py` — `run_generation_pipeline()` full async pipeline
4. `authoring/service.py` — `create_course()`, `publish_course()`, `regenerate_lesson()`
5. `authoring/routes.py` — all 4 authoring endpoints
6. Register router in `app/main.py`

---

## Phase 5 — Week 3: Courses & Enrollment

1. `courses/` — `service.py`, `schemas.py`, `routes.py` → `GET /api/courses`, `GET /api/courses/{id}`
2. `enrollment/` — `service.py`, `schemas.py`, `routes.py` → `POST /api/enrollments`, `GET /api/enrollments/{id}`
3. `GET /api/lessons/{id}/blocks` endpoint (in `tutor/routes.py`) — strip sensitive fields before response
4. Register routers in `app/main.py`

---

## Phase 6 — Week 4: Code Execution & Socratic Hints

1. `tutor/schemas.py` — `RunCodeRequest`, `RunCodeResponse`
2. `tutor/service.py` — `run_code()` with Judge0 + verdict evaluation
3. `tutor/prompts.py` — Socratic system prompt with ABSOLUTE RULES
4. `tutor/service.py` — `get_socratic_hint()` SSE generator
5. `tutor/routes.py` — `POST /api/blocks/{id}/run`, `POST /api/blocks/{id}/socratic-hint` (SSE)
6. Unit test: verdict logic; Integration test: anti-leak assertion

---

## Phase 7 — Week 5: Ask Anything, Understanding Check, Concept Check

1. `tutor/prompts.py` — understanding check evaluator system prompt
2. `tutor/service.py` — `evaluate_understanding()` with `LEVEL_ORDER` comparison
3. `tutor/routes.py` — `POST /api/blocks/{id}/understanding-check` (SSE) + `result` event
4. `tutor/service.py` — `ask_anything()` RAG + Claude SSE
5. `tutor/routes.py` — `POST /api/enrollments/{id}/ask` (SSE)
6. `tutor/routes.py` — `POST /api/blocks/{id}/concept-check` (no LLM call)

---

## Phase 8 — Week 6: Progress & Completion

1. `progress/service.py` — `mark_block_complete()`, `update_bookmark()`, `check_lesson_completion()`
2. `progress/schemas.py` — `BlockCompleteRequest`, `BookmarkUpdate`
3. `progress/routes.py` — `POST /api/progress/blocks/{id}/complete`, `PATCH /api/enrollments/{id}/bookmark`
4. Register router in `app/main.py`

---

## Phase 9 — Week 7: Preview Mode, Observability, Tests

1. Preview mode: `?preview=true` suppresses writes across all tutor + progress endpoints
2. Structured logging with `structlog`
3. Sentry integration in `app/main.py`
4. Integration tests: generation pipeline, multitenancy, enrollment, ask, understanding check

---

## Phase 10 — Week 8: Production Deploy

1. Verify Dockerfile multi-stage build (~150 MB final image)
2. Verify `docker-compose.prod.yml` (caddy + backend)
3. GitHub Actions CI/CD: test → build → push GHCR → SSH deploy
4. VPS deployment: Hetzner CX22, Caddy + Let's Encrypt
5. Onboard first student end-to-end

---

## V2 Roadmap (Post-V1, Not Started)

**Trigger:** 3+ creators interested OR first cohort shows >60% completion rate.

| Feature | Module |
|---|---|
| Multi-creator accounts | `features/auth/` |
| RQ + Redis task queue | Replace asyncio.Queue |
| LlamaIndex richer RAG | Replace retrieval inside `/ask` |
| LangGraph Socratic state machine | Replace single-shot hint |
| Engine B — Code Auto-Grader | `features/grading/` (new, isolated) |
| Block-level editing | `features/authoring/` extension |
| Supabase RLS | Enable on all tables |

---

*Reference: `docs/product/02_roadmap.md` for full V2/V3 feature list.*
