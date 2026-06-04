# 2 — Code Standard
## Backend Architecture & Coding Standards — V1

**Source:** `docs/architecture/04_backend_plan.md`

---

## Architecture Principles

### 1. Feature-Sliced, No Cross-Feature Imports

Mirrors the frontend's structure. Each feature module (`features/X/`) is a vertical slice: routes, service, schemas, prompts. Cross-feature communication happens at the `main.py` level (router registration only), never via direct import.

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

**Enforcement:** Code review + `ruff` import ordering rules. The rule is written here and enforced in PR review.

### 2. Vanilla SDKs — No Framework Lock-in

No LangChain, LangGraph, or LlamaIndex in V1. Each AI call is a direct SDK call (`anthropic`, `openai`). This keeps the codebase explicit, debuggable, and fast. V2 adopts frameworks only when the vanilla implementation proves insufficient.

### 3. Asyncio-First

All I/O — DB queries, AI calls, file uploads, Judge0 requests — is `async/await`. The FastAPI server is single-process with an asyncio task queue for background jobs. No threads. No Celery in V1.

### 4. Pydantic at Every Boundary

All request bodies, response bodies, and LLM structured outputs use Pydantic v2 models. `model_validate()` at every entry point. No unvalidated dicts crossing module boundaries.

---

## Directory Structure

```
backend/
├── app/
│   ├── features/
│   │   ├── auth/                    # Clerk JWT validation, user provisioning, webhook
│   │   ├── authoring/               # Generation pipeline, regeneration, publish
│   │   ├── courses/                 # Course CRUD, dashboard listing
│   │   ├── enrollment/              # Enroll-by-code, /join logic
│   │   ├── tutor/                   # /run, /ask, /socratic-hint, /concept-check, /understanding-check
│   │   └── progress/                # Block progress, lesson completion
│   ├── shared/
│   │   ├── db/                      # SQLAlchemy async session, repositories, migrations
│   │   ├── ai/                      # Anthropic, OpenAI, Judge0 provider clients
│   │   ├── rag/                     # Embed + retrieve helpers
│   │   ├── deps.py                  # FastAPI dependencies (current_user, db_session)
│   │   ├── config.py                # Pydantic Settings
│   │   └── errors.py                # Exception handlers + custom HTTP exceptions
│   └── main.py                      # App factory, router registration, middleware
├── tests/
│   ├── unit/
│   └── integration/
├── alembic/                         # DB migrations
├── Dockerfile                       # Multi-stage build
├── docker-compose.prod.yml
├── docker-compose.dev.yml
└── pyproject.toml                   # deps (uv), ruff, mypy, pytest config
```

---

## Feature Module Template

Every new feature folder must follow this exact structure:

```
features/X/
├── __init__.py      # exports: router (and any public service functions)
├── routes.py        # FastAPI APIRouter — route handlers only, no business logic
├── service.py       # Business logic functions (all async def)
├── schemas.py       # Pydantic request/response models
├── models.py        # SQLAlchemy ORM models (if feature owns DB tables)
└── prompts.py       # AI prompt templates (only for features that call LLMs)
```

**Public API convention:**
```python
# features/X/__init__.py
from .routes import router
__all__ = ["router"]
```

```python
# app/main.py
from app.features.tutor import router as tutor_router
app.include_router(tutor_router, prefix="/api")
```

---

## Code Patterns

### Route Handler
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

### Service — Ownership Check (Multi-tenancy)
```python
# features/X/service.py
# ✓ CORRECT — always scope to current_user
async def get_resource(db, user_id, resource_id):
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise NotFoundError("Resource")
    if resource.owner_id != user_id:
        raise ForbiddenError()
    return resource

# ✗ WRONG — never trust client-provided IDs without ownership check
await db.get_enrollment(body.enrollment_id)  # anyone could send any ID
```

### SSE Streaming Pattern
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

### Error Hierarchy
```python
# shared/errors.py
class APIError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail

class NotFoundError(APIError):
    def __init__(self, resource: str):
        super().__init__(404, f"{resource} not found")

class ForbiddenError(APIError):
    def __init__(self):
        super().__init__(403, "Access denied")

class GenerationError(APIError):
    def __init__(self, phase: str, detail: str):
        super().__init__(500, f"Generation failed at {phase}: {detail}")

# Global handler registered in main.py
@app.exception_handler(APIError)
async def api_error_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
```

### Async Retry Utility
```python
# shared/utils/retry.py
async def retry_async(fn, max_attempts=3, base_delay=1.0, exceptions=(Exception,)):
    for attempt in range(max_attempts):
        try:
            return await fn()
        except exceptions as e:
            if attempt == max_attempts - 1:
                raise
            await asyncio.sleep(base_delay * (2 ** attempt))
```

---

## Database Conventions

- **All PKs:** `UUID`, default `uuid4()` in Python
- **All tables:** `created_at TIMESTAMPTZ DEFAULT NOW()`
- **Mutable tables:** `updated_at TIMESTAMPTZ DEFAULT NOW()` (+ `onupdate=func.now()`)
- **Block content:** `JSONB` — shape enforced by Pydantic at the API layer, NOT by DB constraints
- **ORM base:** All models inherit `app.shared.db.Base`
- **Alembic registration:** Every new feature with ORM models adds a line to `alembic/env.py`:
  ```python
  from app.features.X import models  # noqa: F401
  ```
- **Migrations:** `alembic revision --autogenerate -m "description"` after model changes

---

## Shared Infrastructure Patterns

### DB Session
```python
# shared/db.py
engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
```

### AI Provider Clients (singleton pattern)
```python
# shared/ai/anthropic_client.py
_client: anthropic.AsyncAnthropic | None = None

def get_anthropic_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client
```

### RAG Retrieval (V1 naive top-k)
```python
# shared/rag/retriever.py
async def retrieve(query: str, course_id: str, db: AsyncSession, top_k: int = 5):
    embedding = await embed(query)
    chunks = await db.execute(
        text("SELECT * FROM course_chunks WHERE course_id = :cid ORDER BY embedding <=> :q LIMIT :k"),
        {"cid": course_id, "q": embedding, "k": top_k},
    )
    return [CourseChunk.model_validate(row) for row in chunks]
```

---

## Formatting Rules

- **Line length:** 100 characters (configured in `pyproject.toml` via `ruff`)
- **Target Python:** 3.12
- **Linter:** `ruff` (replaces flake8 + isort + pyupgrade)
- **Type checker:** `mypy` (strict mode on shared/)
- **All functions:** typed signatures with return type annotations
- **Pydantic models:** use `model_config = {"from_attributes": True}` for ORM → schema conversion
- **Imports:** stdlib → third-party → local (enforced by ruff)

---

## Security Rules

- All protected endpoints use `Depends(current_user)` — no exceptions without explicit justification
- Never log secrets, tokens, or PII
- `hint_seed_prompt` (code blocks) and `evaluation_rubric` (understanding check blocks) are stripped server-side before returning blocks to the client
- CORS locked to `settings.FRONTEND_URL` only
- Secrets loaded exclusively from environment variables via `pydantic-settings`
