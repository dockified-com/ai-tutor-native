# Backend — Local AI Context File
# AI Native Programming Tutor (Dockified V1)

> **SCOPE:** This file is the authoritative context for any AI agent working inside `backend/`.
> You MUST NOT read, write, or import anything from `frontend/`. All work is confined to `backend/`.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Product | AI Native Programming Tutor — Dockified V1 |
| Backend framework | FastAPI · Python 3.12 |
| Validation | Pydantic v2 (`model_validate` at every boundary) |
| ORM / DB | SQLAlchemy 2.x async + asyncpg → PostgreSQL 16 (Supabase) |
| Migrations | Alembic (async mode) |
| Auth | Clerk JWTs (no Supabase Auth) |
| AI provider | Anthropic Claude Sonnet (vanilla SDK — no LangChain/LangGraph) |
| TTS | OpenAI TTS (`tts-1`, voice `alloy`) |
| Code execution | Judge0 RapidAPI |
| Vector search | pgvector (`VECTOR(1536)`, HNSW index) |
| HTTP client | httpx (async) |
| SSE streaming | sse-starlette `EventSourceResponse` |
| Task queue | asyncio in-process (no Redis/Celery in V1) |

---

## 2. Absolute Constraints (Never Violate)

1. **Stay inside `backend/`** — never touch `frontend/`.
2. **No LangChain, LangGraph, LlamaIndex** in V1. Every AI call is a direct SDK call.
3. **No cross-feature imports** — `features/X/` must never import from `features/Y/`. Cross-feature logic lives in `app/` (router registration) or `shared/`.
4. **Pydantic at every boundary** — no raw dicts crossing module lines. `model_validate()` at entry points.
5. **Async-only I/O** — all DB, AI, HTTP calls use `async/await`. No blocking calls in async contexts.
6. **Never reveal exercise answers** — the socratic-hint and understanding-check prompts must contain the guardrail system prompt; tests must assert no solution code leaks.
7. **Single process** — generation pipeline uses `asyncio.Queue` + `asyncio.Task`. No threads, no Celery.

---

## 3. Directory Layout (Canonical)

```
backend/
├── CONTEXT.md                    ← YOU ARE HERE
├── pyproject.toml                ← deps (fastapi, sqlalchemy, anthropic, openai, httpx, pyjwt, svix…)
├── alembic.ini
├── alembic/
│   ├── env.py                    ← imports Base + all model modules for autogenerate
│   └── versions/                 ← migration files (one per schema change)
├── app/
│   ├── main.py                   ← App factory; include_router() calls only
│   ├── features/
│   │   ├── auth/                 ✅ DONE — Clerk JWT, user provisioning, webhook
│   │   ├── authoring/            🔴 TODO — generation pipeline, publish, regenerate
│   │   ├── courses/              🔴 TODO — course CRUD, dashboard listing
│   │   ├── enrollment/           🔴 TODO — enroll-by-code, /join logic
│   │   ├── tutor/                🔴 TODO — /run, /ask, /socratic-hint, /concept-check, /understanding-check
│   │   └── progress/             🔴 TODO — block progress, lesson completion
│   └── shared/
│       ├── config.py             ✅ DONE — Pydantic Settings (env vars)
│       ├── db.py                 ✅ DONE — async engine, SessionLocal, Base
│       ├── deps.py               ✅ DONE — get_db(), current_user() FastAPI deps
│       ├── errors.py             🔴 TODO — APIError, NotFoundError, ForbiddenError, GenerationError
│       ├── ai/                   🔴 TODO — anthropic_client.py, openai_client.py, judge0_client.py
│       ├── rag/                  🔴 TODO — retriever.py (embed + pgvector top-k)
│       └── utils/                🔴 TODO — retry.py (async exponential backoff)
└── tests/
    ├── conftest.py               ✅ DONE — AsyncClient fixture, env overrides
    ├── unit/
    │   ├── test_clerk_jwt.py     ✅ DONE
    │   └── test_config.py        ✅ DONE
    └── integration/
        ├── test_clerk_webhook.py ✅ DONE
        └── test_me_endpoint.py   ✅ DONE
```

---

## 4. Implemented Files — What Each Does

### `app/main.py`
- Creates FastAPI app with `lifespan` context manager
- Registers `auth_router` at `/api`
- Exposes `GET /healthz`
- **Pattern:** every new feature router is added here via `app.include_router()`

### `app/shared/config.py`
- `Settings(BaseSettings)` — reads `.env`
- Fields: `database_url`, `clerk_publishable_key`, `clerk_secret_key`, `clerk_jwks_url`, `clerk_webhook_secret`
- **TODO fields to add when implementing Week 2B:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `JUDGE0_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`

### `app/shared/db.py`
- `Base` — shared SQLAlchemy `DeclarativeBase` (all ORM models inherit this)
- `engine` — async engine from `settings.database_url`
- `SessionLocal` — `async_sessionmaker`

### `app/shared/deps.py`
- `get_db()` — yields `AsyncSession`; auto-commits on success, rolls back on exception
- `current_user()` — validates Clerk JWT via JWKS, calls `get_or_create_user`, returns `User`
- `_jwks_client_singleton()` — `@lru_cache` singleton of `ClerkJwksClient`

### `app/features/auth/clerk.py`
- `ClerkJwksClient` — fetches + caches JWKS for 300s; extracts PEM public keys by `kid`
- `ClerkVerifier` — verifies RS256 JWT; checks `exp`, `sub`, `iss`, `leeway=5s`
- `ClerkAuthError` — raised on any verification failure

### `app/features/auth/models.py`
- `UserRole` enum: `creator | student`
- `User` ORM model — `id (UUID PK)`, `clerk_user_id`, `email`, `display_name`, `role`, `created_at`, `updated_at`

### `app/features/auth/service.py`
- `get_or_create_user(db, *, clerk_user_id, email, display_name)` — idempotent upsert; `flush()` not `commit()`
- `update_user_from_clerk(db, *, ...)` — syncs email + display_name from webhook

### `app/features/auth/webhook.py`
- `verify_and_parse_clerk_webhook(request)` — uses `svix.Webhook` + `clerk_webhook_secret`; raises 400 on bad signature

### `app/features/auth/routes.py`
- `GET /api/me` → returns `AppUserOut`
- `POST /api/auth/clerk-webhook` → handles `user.created` / `user.updated`

### `app/features/auth/schemas.py`
- `AppUserOut` — `clerk_user_id`, `email`, `display_name`, `role`; `from_attributes=True`

### `alembic/env.py`
- Imports `Base` + all model modules so Alembic autogenerate sees the full schema
- **When adding a new feature's models:** add `from app.features.X import models  # noqa: F401`

---

## 5. Module Boundary Rules (Enforced in PR Review)

```
ALLOWED:
  app/main.py          → features/X/__init__.py   (router import ONLY)
  features/X/          → features/X/              (within same feature)
  features/X/          → shared/                  (shared infra)
  shared/              → shared/                  (within shared)

FORBIDDEN:
  features/X/          → features/Y/              (cross-feature import — EVER)
  features/X/ internal → another feature internal (bypass __init__.py)
```

**Public API convention per feature:**
```python
# features/X/__init__.py
from .routes import router
__all__ = ["router"]
```

---

## 6. Feature Module Template

Every new feature folder must contain:

```
features/X/
├── __init__.py      # exports: router  (and any public service functions)
├── routes.py        # FastAPI APIRouter — route handlers only, no business logic
├── service.py       # business logic functions (async def)
├── schemas.py       # Pydantic request/response models
├── models.py        # SQLAlchemy ORM models (if feature owns DB tables)
└── prompts.py       # AI prompt templates (only for features that call LLMs)
```

---

## 7. Key Code Patterns

### Route handler pattern
```python
# features/X/routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.auth.models import User
from app.shared.deps import current_user, get_db

router = APIRouter(prefix="/api", tags=["X"])

@router.post("/X/{id}/action")
async def do_action(
    id: str,
    body: ActionRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> ActionResponse:
    result = await X_service.do_action(db, user, id, body)
    return ActionResponse.model_validate(result)
```

### Service pattern (ownership check)
```python
# features/X/service.py
async def get_resource(db, user_id, resource_id):
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise NotFoundError("Resource")
    if resource.owner_id != user_id:
        raise ForbiddenError()
    return resource
```

### SSE streaming pattern
```python
from sse_starlette.sse import EventSourceResponse

async def stream_endpoint(...):
    async def events():
        async with claude.messages.stream(...) as stream:
            async for text in stream.text_stream:
                yield {"event": "token", "data": text}
        yield {"event": "done", "data": ""}
    return EventSourceResponse(events())
```

### Alembic model registration
```python
# alembic/env.py — add one line per new feature with ORM models
from app.features.auth import models      # noqa: F401  ✅ done
from app.features.courses import models   # noqa: F401  🔴 add when creating courses models
from app.features.authoring import models # noqa: F401  🔴 add when creating authoring models
# ... etc
```

---

## 8. Database Tables — Implementation Status

| Table | ORM Model | Migration |
|---|---|---|
| `users` | ✅ `features/auth/models.py` | ✅ `2026_05_30_…_create_users.py` |
| `courses` | 🔴 missing | 🔴 missing |
| `course_chunks` | 🔴 missing | 🔴 missing |
| `lessons` | 🔴 missing | 🔴 missing |
| `blocks` | 🔴 missing | 🔴 missing |
| `enrollments` | 🔴 missing | 🔴 missing |
| `block_progress` | 🔴 missing | 🔴 missing |
| `code_submissions` | 🔴 missing | 🔴 missing |
| `concept_check_attempts` | 🔴 missing | 🔴 missing |
| `understanding_check_attempts` | 🔴 missing | 🔴 missing |
| `questions` | 🔴 missing | 🔴 missing |

**Key schema facts:**
- All PKs are `UUID`, default `uuid4()` in Python / `uuid_generate_v4()` in Postgres
- All tables have `created_at TIMESTAMPTZ DEFAULT NOW()`
- `blocks.content` is `JSONB` — shape enforced by Pydantic, NOT by DB constraints
- `course_chunks.embedding` is `VECTOR(1536)` with HNSW index (`vector_cosine_ops`)
- Block types: `markdown | code | mermaid | concept_check | understanding_check`
- Course statuses: `draft | generating | ready | published | failed`
- Lesson statuses: `generating | ready | failed`

---

## 9. Block Content Shapes (JSONB, enforced by Pydantic)

```python
# markdown
{"text": "..."}

# code
{"instruction": "...", "language": "python", "starter_code": "...",
 "expected_match": "exact|regex|ai_eval", "expected_output": "...",
 "hint_seed_prompt": "..."}

# mermaid
{"instruction": "...", "diagram": "graph LR; A-->B"}

# concept_check
{"question": "...", "options": ["Yes", "No"], "correct": "No",
 "explanation_correct": "...", "explanation_wrong": "..."}

# understanding_check
{"prompt": "...", "evaluation_rubric": "...",
 "threshold": "poor|fair|good|excellent"}
```

---

## 10. API Endpoints — Implementation Status

| Endpoint | Feature | Status |
|---|---|---|
| `GET /healthz` | main.py | ✅ Done |
| `GET /api/me` | auth | ✅ Done |
| `POST /api/auth/clerk-webhook` | auth | ✅ Done |
| `POST /api/courses/generate` | authoring | 🔴 TODO |
| `GET /api/courses/{id}/status` | authoring | 🔴 TODO |
| `POST /api/courses/{id}/publish` | authoring | 🔴 TODO |
| `POST /api/lessons/{id}/regenerate` | authoring | 🔴 TODO |
| `GET /api/courses` | courses | 🔴 TODO |
| `GET /api/courses/{id}` | courses | 🔴 TODO |
| `POST /api/enrollments` | enrollment | 🔴 TODO |
| `GET /api/enrollments/{id}` | enrollment | 🔴 TODO |
| `POST /api/blocks/{id}/run` | tutor | 🔴 TODO |
| `POST /api/blocks/{id}/socratic-hint` (SSE) | tutor | 🔴 TODO |
| `POST /api/blocks/{id}/concept-check` | tutor | 🔴 TODO |
| `POST /api/blocks/{id}/understanding-check` (SSE) | tutor | 🔴 TODO |
| `POST /api/enrollments/{id}/ask` (SSE) | tutor | 🔴 TODO |
| `POST /api/progress/blocks/{id}/complete` | progress | 🔴 TODO |
| `PATCH /api/enrollments/{id}/bookmark` | progress | 🔴 TODO |

---

## 11. Shared Infrastructure — Implementation Status

| Module | File | Status |
|---|---|---|
| Settings | `shared/config.py` | ✅ Done (needs AI key fields added) |
| DB session | `shared/db.py` | ✅ Done |
| FastAPI deps | `shared/deps.py` | ✅ Done |
| Error hierarchy | `shared/errors.py` | 🔴 TODO |
| Anthropic client | `shared/ai/anthropic_client.py` | 🔴 TODO |
| OpenAI client | `shared/ai/openai_client.py` | 🔴 TODO |
| Judge0 client | `shared/ai/judge0_client.py` | 🔴 TODO |
| RAG retriever | `shared/rag/retriever.py` | 🔴 TODO |
| Async retry util | `shared/utils/retry.py` | 🔴 TODO |

---

## 12. SDD Execution Workflow (for this backend)

When implementing any task in `backend/`, follow these steps **atomically**:

### Step 1 — Confirm scope
- Identify which feature module owns this task
- Confirm the endpoint/table is listed in §10 or §8 of this file
- Check §2 constraints — no cross-feature imports, async-only

### Step 2 — Check roadmap order
**Do not skip ahead.** Current phase order:

1. ✅ Week 1: Auth layer (complete)
2. 🎯 Week 2A: Remaining DB ORM models + Alembic migration
3. Week 2B: `shared/errors.py`, `shared/ai/`, `shared/rag/`, `shared/utils/`
4. Week 2C: `features/authoring/` pipeline (extract → embed → outline → blocks → TTS)
5. Week 3: `features/courses/`, `features/enrollment/`, tutor UI shell endpoints
6. Week 4: `features/tutor/` — `/run`, `/socratic-hint`
7. Week 5: `/ask`, `/understanding-check`, lesson gating
8. Week 6: TTS + audio endpoints
9. Week 7: Preview mode, publish, `/join/{code}`, polish
10. Week 8: Test suite pass + production deploy

### Step 3 — Plan before writing code
Output a brief plan listing:
- Files to create or modify
- ORM models needed (if any table changes)
- Whether an Alembic migration is required
- Whether `alembic/env.py` model imports need updating

### Step 4 — Implement
- Create/edit files following patterns in §6 and §7
- All service functions are `async def`
- All route handlers use `Depends(current_user)` and `Depends(get_db)` unless explicitly public
- Pydantic schemas use `model_config = {"from_attributes": True}` for ORM → schema conversion

### Step 5 — Update registrations
After creating a new feature:
- Add router to `app/main.py`: `app.include_router(X_router, prefix="/api")`
- Add model import to `alembic/env.py`: `from app.features.X import models  # noqa: F401`
- Generate migration: `alembic revision --autogenerate -m "description"`

### Step 6 — Update this file
After completing a task, update §3, §8, §10, §11 status from 🔴 TODO → ✅ Done.

---

## 13. Testing Conventions

- Test files: `tests/unit/test_<module>.py`, `tests/integration/test_<endpoint>.py`
- All LLM / TTS / Judge0 calls are **mocked** in tests — never burn API budget in CI
- Use `pytest-asyncio` with `asyncio_mode = "auto"` (already in `pyproject.toml`)
- Integration tests: `httpx.AsyncClient` + `ASGITransport(app=app)` (see `tests/conftest.py`)
- **Critical anti-leak test:** every socratic-hint test must assert the solution code is NOT in the hint

---

## 14. Environment Variables (`.env`)

```env
# Already configured
DATABASE_URL=postgresql+asyncpg://...
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_JWKS_URL=https://.../.well-known/jwks.json
CLERK_WEBHOOK_SECRET=whsec_...

# To add when implementing Week 2B
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
JUDGE0_API_KEY=...
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
FRONTEND_URL=http://localhost:3000
```

---

## 15. Running Locally

```bash
# From backend/ directory
cd backend

# Start Postgres + pgvector
docker compose -f docker-compose.dev.yml up -d

# Run migrations
.venv/bin/alembic upgrade head

# Start dev server
.venv/bin/uvicorn app.main:app --reload --port 8000

# Run tests
.venv/bin/pytest tests/ -v
```

---

*This file is the single source of truth for any AI agent working on the backend.*
*Always read it first. Never act on guesses — reference §8, §10, §11 before writing any code.*
