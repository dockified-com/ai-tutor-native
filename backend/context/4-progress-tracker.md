# 4 — Progress Tracker
## Backend Implementation Progress — V1

**Source:** Current codebase state as of 2026-06-04  
**Update this file after every completed task.**

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Completed and tested |
| 🔄 | In progress |
| 🔴 | Not started |
| ⚠️ | Blocked or has known issue |

---

## Week 1 — Auth Layer

| Task | Status | Notes |
|---|---|---|
| FastAPI app factory (`app/main.py`) | ✅ | Lifespan context, `/healthz`, router registration |
| Pydantic Settings (`shared/config.py`) | ✅ | Reads `.env`; Clerk + DB fields |
| Async DB session (`shared/db.py`) | ✅ | `Base`, `engine`, `SessionLocal`, `async_sessionmaker` |
| FastAPI deps (`shared/deps.py`) | ✅ | `get_db()`, `current_user()`, JWKS singleton |
| Clerk JWKS client (`auth/clerk.py`) | ✅ | Caching 300s, RS256, `ClerkJwksClient`, `ClerkVerifier` |
| User ORM model (`auth/models.py`) | ✅ | `User`, `UserRole` enum |
| Auth service (`auth/service.py`) | ✅ | `get_or_create_user()`, `update_user_from_clerk()` |
| Clerk webhook handler (`auth/webhook.py`) | ✅ | SVIX signature verification |
| Auth routes (`auth/routes.py`) | ✅ | `GET /api/me`, `POST /api/auth/clerk-webhook` |
| Auth schemas (`auth/schemas.py`) | ✅ | `AppUserOut` |
| Auth feature public API (`auth/__init__.py`) | ✅ | Exports `router` |
| Initial Alembic migration (`create_users`) | ✅ | `users` table with indexes |
| Unit test: Clerk JWT verification | ✅ | `tests/unit/test_clerk_jwt.py` |
| Unit test: config loading | ✅ | `tests/unit/test_config.py` |
| Integration test: webhook endpoint | ✅ | `tests/integration/test_clerk_webhook.py` |
| Integration test: `/api/me` endpoint | ✅ | `tests/integration/test_me_endpoint.py` |

---

## Week 2A — Full Database Schema

| Task | Status | Notes |
|---|---|---|
| `Course` ORM model (`courses/models.py`) | ✅ | `CourseStatus`, `GenerationPhase` enums |
| `Lesson` + `Block` ORM models (`authoring/models.py`) | ✅ | `LessonStatus`, `BlockType` enums; `JSONB` content |
| `Enrollment` ORM model (`enrollment/models.py`) | ✅ | Bookmark fields |
| `BlockProgress` ORM model (`progress/models.py`) | ✅ | `BlockProgressStatus` enum |
| `CodeSubmission` ORM model (`tutor/models.py`) | ✅ | `CodeVerdict` enum |
| `ConceptCheckAttempt` ORM model (`tutor/models.py`) | ✅ | |
| `UnderstandingCheckAttempt` ORM model (`tutor/models.py`) | ✅ | `UnderstandingLevel` enum |
| `Question` ORM model (`tutor/models.py`) | ✅ | `source_chunks JSONB` |
| `CourseChunk` ORM model (`authoring/models.py`) | ✅ | `VECTOR(1536)` embedding column |
| Register all models in `alembic/env.py` | ✅ | All 5 feature model modules imported |
| Alembic migration: all remaining tables | ✅ | `add_full_schema` — 10 new tables applied 2026-06-05 |
| `__init__.py` stubs for all new feature folders | ✅ | Empty init files in all 5 feature packages |

---

## Week 2B — Shared Infrastructure

| Task | Status | Notes |
|---|---|---|
| `shared/errors.py` | 🔴 | `APIError`, `NotFoundError`, `ForbiddenError`, `GenerationError` |
| `shared/ai/anthropic_client.py` | 🔴 | Singleton `AsyncAnthropic` client |
| `shared/ai/openai_client.py` | 🔴 | `AsyncOpenAI` client |
| `shared/ai/judge0_client.py` | 🔴 | `execute_code()` via httpx |
| `shared/rag/retriever.py` | 🔴 | `embed()` + `retrieve()` top-k pgvector |
| `shared/utils/retry.py` | 🔴 | Async exponential backoff utility |
| Add AI/external key fields to `shared/config.py` | 🔴 | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `JUDGE0_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL` |
| Register error handler in `app/main.py` | 🔴 | `@app.exception_handler(APIError)` |
| Add CORS middleware to `app/main.py` | 🔴 | Locked to `settings.FRONTEND_URL` |

---

## Week 2C — Generation Pipeline (`features/authoring/`)

| Task | Status | Notes |
|---|---|---|
| `authoring/schemas.py` | 🔴 | `LessonOutline`, `CourseOutline`, all `BlockContent` variants, `LessonBlocks` with validator |
| `authoring/prompts.py` | 🔴 | Outline prompt, per-lesson blocks prompt |
| `authoring/pipeline.py` | 🔴 | `run_generation_pipeline()` async task |
| PDF extraction step | 🔴 | `pdfplumber.extract_text()` + empty-text rejection |
| Chunking step | 🔴 | ~1000 chars, 100 overlap |
| Embedding step | 🔴 | `asyncio.gather` with semaphore=10 |
| Outline generation step | 🔴 | Claude Sonnet structured output via `tool_choice` |
| Per-lesson block generation step | 🔴 | Per lesson; validate last block = `understanding_check` |
| TTS audio generation step | 🔴 | `asyncio.gather` with semaphore=5; fail-soft per block |
| `authoring/service.py` | 🔴 | `create_course()`, `publish_course()`, `regenerate_lesson()` |
| `authoring/routes.py` | 🔴 | `POST /api/courses/generate`, `GET /api/courses/{id}/status`, `POST /api/courses/{id}/publish`, `POST /api/lessons/{id}/regenerate` |
| Register `authoring_router` in `app/main.py` | 🔴 | |

---

## Week 3 — Course, Enrollment, Lesson Fetch

| Task | Status | Notes |
|---|---|---|
| `courses/service.py` | 🔴 | `list_courses()` (creator vs student view), `get_course()` |
| `courses/schemas.py` | 🔴 | `CourseListItem`, `CourseDetail` |
| `courses/routes.py` | 🔴 | `GET /api/courses`, `GET /api/courses/{id}` |
| `enrollment/service.py` | 🔴 | `enroll_by_code()` idempotent, `get_enrollment()` |
| `enrollment/schemas.py` | 🔴 | `EnrollRequest`, `EnrollResponse` |
| `enrollment/routes.py` | 🔴 | `POST /api/enrollments`, `GET /api/enrollments/{id}` |
| `GET /api/lessons/{id}/blocks` endpoint | 🔴 | Strips `hint_seed_prompt` + `evaluation_rubric` from response |
| Register `courses_router`, `enrollment_router` in `app/main.py` | 🔴 | |

---

## Week 4 — Code Execution & Socratic Hints (`features/tutor/`)

| Task | Status | Notes |
|---|---|---|
| `tutor/schemas.py` | 🔴 | `RunCodeRequest`, `RunCodeResponse`, `ConceptCheckRequest`, `AskRequest` |
| `tutor/service.py` — `run_code()` | 🔴 | Judge0 submit → verdict logic (exact/regex/ai_eval) |
| `tutor/routes.py` — `POST /api/blocks/{id}/run` | 🔴 | Enrollment ownership check |
| `tutor/prompts.py` — Socratic system prompt | 🔴 | Must include ABSOLUTE RULES; never reveal answer |
| `tutor/service.py` — `get_socratic_hint()` | 🔴 | Load last submission + attempt count; build prompt |
| `tutor/routes.py` — `POST /api/blocks/{id}/socratic-hint` (SSE) | 🔴 | |
| Unit test: verdict logic (exact/regex/ai_eval) | 🔴 | `tests/unit/test_verdict_logic.py` |
| Integration test: anti-leak assertion | 🔴 | `tests/integration/test_socratic_hint.py` |

---

## Week 5 — Ask Anything, Understanding Check, Lesson Gating

| Task | Status | Notes |
|---|---|---|
| `tutor/prompts.py` — understanding check system prompt | 🔴 | Structured JSON output; Socratic on fail |
| `tutor/service.py` — `evaluate_understanding()` | 🔴 | Structured eval + `LEVEL_ORDER` comparison |
| `tutor/routes.py` — `POST /api/blocks/{id}/understanding-check` (SSE) | 🔴 | Emit `result` event with `{passed, level}` |
| `tutor/service.py` — `ask_anything()` | 🔴 | RAG top-5 + active block context + stream |
| `tutor/routes.py` — `POST /api/enrollments/{id}/ask` (SSE) | 🔴 | Persist `questions` row after stream |
| `tutor/routes.py` — `POST /api/blocks/{id}/concept-check` | 🔴 | Pre-generated explanation; no LLM call |
| Register `tutor_router` in `app/main.py` | 🔴 | |

---

## Week 6 — Progress & Completion (`features/progress/`)

| Task | Status | Notes |
|---|---|---|
| `progress/service.py` | 🔴 | `mark_block_complete()`, `update_bookmark()`, `check_lesson_completion()` |
| `progress/schemas.py` | 🔴 | `BlockCompleteRequest`, `BookmarkUpdate` |
| `progress/routes.py` | 🔴 | `POST /api/progress/blocks/{id}/complete`, `PATCH /api/enrollments/{id}/bookmark` |
| Register `progress_router` in `app/main.py` | 🔴 | |

---

## Week 7 — Preview Mode, Polish, Integration Tests

| Task | Status | Notes |
|---|---|---|
| Preview mode: `?preview=true` suppresses writes | 🔴 | In `/run`, `/concept-check`, `/understanding-check`, `/progress` |
| Integration test: full generation pipeline (mocked LLM/TTS) | 🔴 | `tests/integration/test_generation_pipeline.py` |
| Integration test: multitenancy isolation | 🔴 | `tests/integration/test_multitenancy.py` |
| Integration test: enrollment flow | 🔴 | `tests/integration/test_enrollment.py` |
| Integration test: ask anything | 🔴 | `tests/integration/test_ask_anything.py` |
| Integration test: understanding check pass/fail | 🔴 | `tests/integration/test_understanding_check.py` |
| Structured logging (`structlog`) | 🔴 | Per-endpoint latency + generation duration |
| Sentry integration | 🔴 | `sentry_sdk.init()` in `app/main.py` |

---

## Week 8 — Production Deploy

| Task | Status | Notes |
|---|---|---|
| All unit tests passing | 🔴 | |
| All integration tests passing | 🔴 | |
| Dockerfile multi-stage build verified | 🔴 | ~150 MB final image |
| `docker-compose.prod.yml` verified | 🔴 | caddy + backend |
| GitHub Actions CI/CD pipeline | 🔴 | test → build → push GHCR → SSH deploy |
| VPS deployment (Hetzner CX22) | 🔴 | Caddy + Let's Encrypt SSL |
| First student enrolled end-to-end | 🔴 | |

---

## Summary Dashboard

| Week | Theme | Done | Total | % |
|---|---|---|---|---|
| Week 1 | Auth Layer | 16 | 16 | 100% |
| Week 2A | DB Schema | 12 | 12 | 100% |
| Week 2B | Shared Infra | 0 | 9 | 0% |
| Week 2C | Generation Pipeline | 0 | 13 | 0% |
| Week 3 | Courses / Enrollment | 0 | 8 | 0% |
| Week 4 | Code Execution + Hints | 0 | 8 | 0% |
| Week 5 | Ask / Understanding | 0 | 7 | 0% |
| Week 6 | Progress | 0 | 4 | 0% |
| Week 7 | Preview + Tests | 0 | 8 | 0% |
| Week 8 | Deploy | 0 | 8 | 0% |
| **Total** | | **28** | **93** | **30%** |

---

*Last updated: 2026-06-05. Week 2A complete — all 10 ORM models + Alembic migration applied.*
