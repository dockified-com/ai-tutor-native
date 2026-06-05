# Backend Architecture Plan
# AI Native Programming Tutor — V1

**Stack:** FastAPI · Python 3.12 · Pydantic v2 · Supabase · Anthropic Claude · OpenAI TTS · Judge0  
**Last Updated:** 2026-05-30  

---

## Table of Contents

1. [Architecture Principles](#1-architecture-principles)
2. [Directory Structure](#2-directory-structure)
3. [Module Boundary Rules](#3-module-boundary-rules)
4. [Feature Modules](#4-feature-modules)
5. [Shared Infrastructure Layer](#5-shared-infrastructure-layer)
6. [Generation Pipeline](#6-generation-pipeline)
7. [Realtime AI Endpoints](#7-realtime-ai-endpoints)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Error Handling Strategy](#9-error-handling-strategy)
10. [Testing Strategy](#10-testing-strategy)
11. [Docker & Deployment](#11-docker--deployment)
12. [Observability](#12-observability)

---

## 1. Architecture Principles

### Feature-Sliced, No Cross-Feature Imports

Mirrors the frontend's structure. Each feature module (`features/X/`) is a vertical slice: routes, service, schemas, prompts. Cross-feature communication happens at the `main.py` level (router registration), never via direct import.

### Vanilla SDKs, No Framework Lock-in

No LangChain, LangGraph, or LlamaIndex in V1. Each AI call is a direct SDK call. This keeps the codebase explicit, debuggable, and fast. V2 adopts frameworks only when the vanilla implementation proves insufficient.

### Asyncio-First

All I/O — DB queries, AI calls, file uploads, Judge0 requests — is `async/await`. The FastAPI server is single-process with an asyncio task queue for background jobs. No threads. No Celery in V1.

### Pydantic at Every Boundary

All request bodies, response bodies, and LLM structured outputs use Pydantic v2 models. `model_validate()` at every entry point. No unvalidated dicts crossing module boundaries.

---

## 2. Directory Structure

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

## 3. Module Boundary Rules

```
ALLOWED:
  app/features/X/ → app/features/X/   (within same feature)
  app/features/X/ → app/shared/       (shared infra)
  app/main.py     → app/features/*/   (router registration only)

FORBIDDEN:
  app/features/X/ → app/features/Y/   (cross-feature import)
```

**Enforcement:** Code review + `ruff` import ordering rules. Python doesn't have a compile-time boundary enforcer like ESLint-boundaries, so the rule is written in `CONTRIBUTING.md` and enforced in PR review.

**Public API convention:** Each feature exposes its router via `__init__.py`:

```python
# app/features/tutor/__init__.py
from .routes import router
__all__ = ['router']
```

```python
# app/main.py
from app.features.tutor import router as tutor_router
app.include_router(tutor_router, prefix='/api')
```

---

## 4. Feature Modules

### `features/auth/`

**Responsibility:** Clerk JWT validation, lazy user-row provisioning, Clerk webhook handler.

```
features/auth/
├── routes.py          # GET /api/me, POST /api/auth/clerk-webhook
├── service.py         # get_or_create_user(), sync_from_clerk()
├── schemas.py         # UserResponse, ClerkWebhookPayload
└── __init__.py        # exports: router
```

**Clerk JWT validation (dependency):**

```python
# app/shared/deps.py
from clerk_backend_api import Clerk

async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = authorization.removeprefix("Bearer ")
    payload = Clerk().verify_token(token)  # raises on invalid
    user = await get_or_create_user(db, payload["sub"])
    return user
```

**Clerk webhook:**

```python
@router.post("/api/auth/clerk-webhook")
async def clerk_webhook(payload: ClerkWebhookPayload, db: AsyncSession = Depends(get_db)):
    if payload.type in ("user.created", "user.updated"):
        await sync_from_clerk(db, payload.data)
    return {"ok": True}
```

---

### `features/authoring/`

**Responsibility:** Course creation trigger, async generation pipeline, lesson regeneration, course publish.

```
features/authoring/
├── routes.py          # POST /api/courses/generate, GET /api/courses/{id}/status,
│                      # POST /api/courses/{id}/publish,
│                      # POST /api/lessons/{id}/regenerate
├── service.py         # Business logic: create_course(), publish_course(), regenerate_lesson()
├── pipeline.py        # Async generation: extract → embed → outline → blocks → tts
├── schemas.py         # GenerateRequest, GenerateResponse, CourseStatusResponse,
│                      # LessonOutlineSchema, BlockSchema (LLM structured output)
├── prompts.py         # Outline prompt, per-lesson block generation prompt
└── __init__.py
```

See §6 for the full pipeline breakdown.

---

### `features/courses/`

**Responsibility:** Course CRUD, listing for dashboard.

```
features/courses/
├── routes.py          # GET /api/courses (list), GET /api/courses/{id}
├── service.py         # list_courses(), get_course()
├── schemas.py         # CourseListItem, CourseDetail
└── __init__.py
```

---

### `features/enrollment/`

**Responsibility:** Enroll-by-code, /join lookup, enrollment state.

```
features/enrollment/
├── routes.py          # POST /api/enrollments (by code), GET /api/enrollments/{id}
├── service.py         # enroll_by_code(), get_enrollment()
├── schemas.py         # EnrollRequest, EnrollResponse
└── __init__.py
```

**Idempotent enrollment:**

```python
async def enroll_by_code(db, user_id, code):
    course = await db.get_course_by_code(code)
    if not course or course.status != 'published':
        raise CourseNotFoundError()
    
    existing = await db.get_enrollment(user_id, course.id)
    if existing:
        return existing  # Idempotent: return existing enrollment
    
    return await db.create_enrollment(user_id, course.id)
```

---

### `features/tutor/`

**Responsibility:** All real-time student interactions: run code, Socratic hint, Ask Anything, concept check, understanding check.

```
features/tutor/
├── routes.py          # POST /api/blocks/{id}/run
│                      # POST /api/blocks/{id}/socratic-hint (SSE)
│                      # POST /api/blocks/{id}/concept-check
│                      # POST /api/blocks/{id}/understanding-check (SSE)
│                      # POST /api/enrollments/{id}/ask (SSE)
├── service.py         # run_code(), get_socratic_hint(), evaluate_understanding(), ask_anything()
├── prompts.py         # Socratic system prompt, understanding evaluator prompt, Ask Anything prompt
├── schemas.py         # RunCodeRequest, RunCodeResponse, ConceptCheckRequest,
│                      # UnderstandingCheckRequest, UnderstandingEvaluation, AskRequest
└── __init__.py
```

See §7 for the full endpoint breakdown.

---

### `features/progress/`

**Responsibility:** Block progress writes, bookmark updates, lesson/course completion detection.

```
features/progress/
├── routes.py          # POST /api/progress/blocks/{id}/complete
│                      # PATCH /api/enrollments/{id}/bookmark
├── service.py         # mark_block_complete(), update_bookmark(), check_lesson_completion()
├── schemas.py         # BlockCompleteRequest, BookmarkUpdate
└── __init__.py
```

---

## 5. Shared Infrastructure Layer

### `shared/db/`

```python
# shared/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

**Repository pattern:** Each feature's data access lives in a `repository.py` file (or inline in `service.py` for simple queries). No raw SQL in routes.

**Migrations:** Alembic with async support. Migration files in `alembic/versions/`.

### `shared/ai/`

```python
# shared/ai/anthropic_client.py
from anthropic import AsyncAnthropic
from app.shared.config import get_settings

settings = get_settings()

# Instantiate the singleton AsyncAnthropic client
anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
```

```python
# shared/ai/openai_client.py
from openai import AsyncOpenAI
from app.shared.config import get_settings

settings = get_settings()

openai_client = AsyncOpenAI(
    api_key=settings.openai_api_key,
)
```

```python
# shared/ai/judge0_client.py
import httpx

async def execute_code(source: str, language_id: int, stdin: str = "") -> Judge0Result:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://judge0-ce.p.rapidapi.com/submissions",
            json={"source_code": source, "language_id": language_id, "stdin": stdin},
            headers={
                "X-RapidAPI-Key": settings.JUDGE0_API_KEY,
                "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            },
            params={"wait": "true"},
            timeout=10.0,
        )
        return Judge0Result.model_validate(res.json())
```

### `shared/rag/`

```python
# shared/rag/retriever.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.authoring.models import CourseChunk


from app.shared.ai.openai_client import openai_client

async def embed(text: str) -> list[float]:
    response = await openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

async def retrieve(
    query: str, 
    db: AsyncSession,
    top_k: int = 5
) -> list[CourseChunk]:
    query_embedding = await embed(query)
    
    stmt = (
        select(CourseChunk)
        .order_by(CourseChunk.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    
    result = await db.execute(stmt)
    return list(result.scalars().all())
```

### `shared/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str
    JUDGE0_API_KEY: str
    CLERK_SECRET_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    FRONTEND_URL: str
    
    model_config = {"env_file": ".env"}

settings = Settings()
```

### `shared/errors.py`

```python
from fastapi import HTTPException
from starlette import status

class APIError(HTTPException):
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        super().__init__(status_code=status_code, detail=message)

class NotFoundError(APIError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)

class ForbiddenError(APIError):
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)

class GenerationError(APIError):
    def __init__(self, message: str = "Error during generation"):
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Global handler in main.py
@app.exception_handler(APIError)
async def api_error_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
```

---

## 6. Generation Pipeline

### Trigger

```
POST /api/courses/generate
  → validates PDF exists in Storage
  → creates Course row (status='generating')
  → queues _run_generation_pipeline(course_id) as asyncio task
  → returns { course_id, status: 'generating' }
```

### Pipeline Steps

```python
# features/authoring/pipeline.py

async def run_generation_pipeline(course_id: str, db: AsyncSession):
    try:
        # Step 1: Extract PDF
        await update_status(db, course_id, 'extracting_pdf')
        text = await extract_pdf(course.source_pdf_url)
        if not text.strip():
            raise GenerationError('extracting_pdf', 'No extractable text')
        
        # Step 2: Chunk + Embed
        await update_status(db, course_id, 'embedding')
        chunks = chunk_text(text, size=1000, overlap=100)
        embeddings = await batch_embed(chunks)  # asyncio.gather with semaphore=10
        await insert_course_chunks(db, course_id, chunks, embeddings)
        
        # Step 3: Generate Outline
        await update_status(db, course_id, 'generating_outline')
        outline = await generate_outline(course, chunks[:10])  # first 10 chunks for context
        lessons = await insert_lessons(db, course_id, outline)
        
        # Step 4: Generate Blocks per Lesson
        for i, lesson in enumerate(lessons):
            await update_status(db, course_id, f'generating_lesson_{i+1}')
            top_chunks = await retrieve(lesson.objectives, course_id, db, top_k=5)
            blocks = await generate_blocks(lesson, top_chunks)
            await insert_blocks(db, lesson.id, blocks)
        
        # Step 5: Generate TTS audio
        await update_status(db, course_id, 'generating_audio')
        await generate_all_audio(db, course_id)  # asyncio.gather with semaphore=5
        
        # Done
        await update_status(db, course_id, 'ready')
        
    except GenerationError as e:
        await update_status(db, course_id, 'failed', error=str(e))
        raise
```

### LLM Structured Output — Outline

```python
# features/authoring/schemas.py

class LessonOutline(BaseModel):
    title: str
    summary: str
    objectives: list[str]  # 3-5 learning objectives

class CourseOutline(BaseModel):
    lessons: list[LessonOutline]  # 5-8 lessons

# features/authoring/pipeline.py
async def generate_outline(course, sample_chunks) -> CourseOutline:
    client = get_anthropic_client()
    response = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        tools=[{
            "name": "submit_outline",
            "description": "Submit the course outline",
            "input_schema": CourseOutline.model_json_schema(),
        }],
        tool_choice={"type": "tool", "name": "submit_outline"},
        messages=[{"role": "user", "content": build_outline_prompt(course, sample_chunks)}],
    )
    return CourseOutline.model_validate(response.content[0].input)
```

### LLM Structured Output — Blocks

```python
class BlockContent(BaseModel):
    pass

class MarkdownContent(BlockContent):
    text: str

class CodeContent(BlockContent):
    instruction: str
    language: str
    starter_code: str
    expected_match: Literal['exact', 'regex', 'ai_eval']
    expected_output: str
    hint_seed_prompt: str

class MermaidContent(BlockContent):
    instruction: str
    diagram: str

class ConceptCheckContent(BlockContent):
    question: str
    options: list[str]
    correct: str
    explanation_correct: str
    explanation_wrong: str

class UnderstandingCheckContent(BlockContent):
    prompt: str
    evaluation_rubric: str
    threshold: Literal['poor', 'fair', 'good', 'excellent']

class BlockSchema(BaseModel):
    type: Literal['markdown', 'code', 'mermaid', 'concept_check', 'understanding_check']
    content: MarkdownContent | CodeContent | MermaidContent | ConceptCheckContent | UnderstandingCheckContent

class LessonBlocks(BaseModel):
    blocks: list[BlockSchema]
    # Validation: last block must be understanding_check
    
    @model_validator(mode='after')
    def last_block_must_be_understanding_check(self):
        if self.blocks and self.blocks[-1].type != 'understanding_check':
            raise ValueError('Last block must be understanding_check')
        return self
```

### TTS Generation

```python
async def generate_all_audio(db: AsyncSession, course_id: str):
    text_blocks = await db.get_text_blocks(course_id)
    
    async with asyncio.Semaphore(5):
        tasks = [generate_audio_for_block(db, block) for block in text_blocks]
        await asyncio.gather(*tasks, return_exceptions=True)
        # return_exceptions=True: individual failures don't kill the batch
        # Blocks with failed TTS get tts_audio_url = None (graceful degradation)

async def generate_audio_for_block(db: AsyncSession, block: Block):
    text = extract_narration_text(block)
    client = get_openai_client()
    
    try:
        response = await client.audio.speech.create(
            model="tts-1", voice="alloy", input=text
        )
        url = await upload_to_storage(response.content, f"audio/{block.id}.mp3")
        await db.update_block_tts_url(block.id, url)
    except Exception:
        # Log but don't fail; tts_audio_url stays null
        logger.warning(f"TTS failed for block {block.id}")
```

---

## 7. Realtime AI Endpoints

### POST `/api/blocks/{id}/run`

```python
@router.post("/api/blocks/{block_id}/run")
async def run_code(
    block_id: str,
    body: RunCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await db.get_block(block_id)
    enrollment = await db.get_enrollment_for_user(current_user.id, block.course_id)
    if not enrollment:
        raise ForbiddenError()
    
    # Execute via Judge0
    result = await execute_code(body.code, LANGUAGE_IDS[block.content.language])
    
    # Determine verdict
    verdict = evaluate_verdict(block.content, result)
    attempt = await db.create_code_submission(enrollment.id, block_id, body.code, result, verdict)
    
    return RunCodeResponse(
        verdict=verdict,
        stdout=result.stdout,
        stderr=result.stderr,
        attempt_number=attempt.attempt_number,
    )
```

### POST `/api/blocks/{id}/socratic-hint` (SSE)

```python
@router.post("/api/blocks/{block_id}/socratic-hint")
async def socratic_hint(
    block_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await db.get_block(block_id)
    last_submission = await db.get_last_submission(current_user.id, block_id)
    attempt_count = await db.get_attempt_count(current_user.id, block_id)
    
    async def events():
        prompt = build_socratic_prompt(block, last_submission, attempt_count)
        client = get_anthropic_client()
        
        async with client.messages.stream(
            model="claude-sonnet-4-5",  # or haiku based on week 4-5 eval
            max_tokens=512,
            system=SOCRATIC_SYSTEM_PROMPT,  # "NEVER reveal answer code..."
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield {"event": "token", "data": text}
        yield {"event": "done", "data": ""}
    
    return EventSourceResponse(events())
```

**System prompt constraint (enforced):**

```python
SOCRATIC_SYSTEM_PROMPT = """
You are a Socratic programming tutor. Your job is to guide the student to the solution 
through questions and hints, NEVER by revealing the answer.

ABSOLUTE RULES:
1. NEVER write the correct solution code
2. NEVER complete the student's code for them  
3. NEVER say "here's the answer" or equivalent
4. Escalate guidance proportional to attempt_count:
   - Attempt 1-2: High-level conceptual guidance
   - Attempt 3-4: Point to the specific problematic line/concept
   - Attempt 5+: Walk through an ANALOGOUS simpler example (different problem, same concept)
5. Always end with a question that prompts the student to think
"""
```

### POST `/api/enrollments/{id}/ask` (SSE)

```python
@router.post("/api/enrollments/{enrollment_id}/ask")
async def ask_anything(
    enrollment_id: str,
    body: AskRequest,  # { question: str, block_id: str }
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    enrollment = await db.get_enrollment(enrollment_id)
    if enrollment.user_id != current_user.id:
        raise ForbiddenError()
    
    # RAG retrieval
    chunks = await retrieve(body.question, enrollment.course_id, db, top_k=5)
    active_block = await db.get_block(body.block_id)
    
    question_row = await db.create_question(enrollment_id, body.block_id, body.question)
    
    async def events():
        prompt = build_ask_prompt(body.question, active_block, chunks)
        full_response = ""
        
        async with get_anthropic_client().messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                full_response += text
                yield {"event": "token", "data": text}
        
        # Persist after stream completes
        await db.update_question_answer(question_row.id, full_response, [c.id for c in chunks])
        yield {"event": "done", "data": ""}
    
    return EventSourceResponse(events())
```

### POST `/api/blocks/{id}/understanding-check` (SSE)

```python
UNDERSTANDING_CHECK_SYSTEM_PROMPT = """
You are evaluating a student's understanding. 
Return a JSON object: {"level": "poor|fair|good|excellent", "feedback": "...", "missing_points": [...]}
- "feedback" for PASS (level >= threshold): encouraging, confirming what they got right
- "feedback" for FAIL (level < threshold): Socratic — point to gaps, ask leading questions, NEVER give the answer
"""

@router.post("/api/blocks/{block_id}/understanding-check")
async def understanding_check(block_id: str, body: UnderstandingCheckRequest, ...):
    ...
    async def events():
        eval_prompt = build_understanding_eval_prompt(block, body.response, attempt_count)
        
        # Get structured evaluation
        eval_result = await get_structured_evaluation(eval_prompt)  # UnderstandingEvaluation
        passed = LEVEL_ORDER[eval_result.level] >= LEVEL_ORDER[block.content.threshold]
        
        # Persist attempt
        await db.create_understanding_attempt(enrollment.id, block_id, body.response, eval_result, passed)
        
        # Stream feedback
        async with get_anthropic_client().messages.stream(...) as stream:
            async for text in stream.text_stream:
                yield {"event": "token", "data": text}
        
        yield {"event": "result", "data": json.dumps({"passed": passed, "level": eval_result.level})}
        yield {"event": "done", "data": ""}
    
    return EventSourceResponse(events())
```

---

## 8. Authentication & Authorization

### JWT Validation Flow

```
Request → Clerk JWT in Authorization header
  → shared/deps.py get_current_user()
    → Clerk SDK verifies JWT signature + expiry
    → Extract clerk_user_id from payload
    → Lazy-create users row if missing
    → Return User model
  → Route handler receives User
    → Service checks resource ownership
    → Raises ForbiddenError (403) if unauthorized
```

### Multi-tenancy Isolation

Every data access is scoped by the authenticated user:

```python
# ✓ CORRECT — always scope to current_user
await db.get_enrollment(enrollment_id, user_id=current_user.id)

# ✗ WRONG — never trust client-provided IDs without ownership check
await db.get_enrollment(body.enrollment_id)  # anyone could send any ID
```

---

## 9. Error Handling Strategy

### Generation Pipeline (offline)

| Failure | Behavior |
|---|---|
| PDF extraction empty (scanned) | Reject at upload; 400 "OCR not supported in V1" |
| Embedding API timeout | Retry ×3 with exponential backoff; then `course.status = 'failed'` |
| Outline LLM call fails | Retry ×2; on failure, course `failed`, creator can retry |
| Per-lesson generation fails | Mark only that `lesson.status = 'failed'`; other lessons unaffected |
| TTS API fails | `tts_audio_url = null`; course still publishable; audio degrades silently |
| Course code collision on publish | Retry with new random code (max 5×) |

**Fail-soft per-lesson, fail-hard per-stage.** A bad outline kills the run; a bad lesson is recoverable.

### Realtime Endpoints

| Failure | Behavior |
|---|---|
| Judge0 timeout / 5xx | `{verdict: 'error', ...}` — does NOT count as a failed attempt |
| Anthropic 5xx / rate-limit | SSE `{event: 'error', data: 'AI temporarily unavailable'}` — non-counted |
| RAG returns zero chunks | Continue with empty context; LLM answers with course summary only |
| User accesses wrong enrollment | 403 ForbiddenError |
| Concurrent submissions | Idempotent via `attempt_number` (SELECT FOR UPDATE) |

### Retry Utility

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

## 10. Testing Strategy

### Unit Tests (`tests/unit/`)

```
tests/unit/
├── test_verdict_logic.py          # exact/regex/ai_eval verdict evaluation
├── test_rag_retriever.py          # embed + retrieve (mocked Anthropic)
├── test_block_schemas.py          # Pydantic validation for all block content types
├── test_course_code_generator.py  # 6-char code generation, collision handling
├── test_chunk_text.py             # Text chunking with overlap
└── test_pipeline_status.py        # Status machine transitions
```

### Integration Tests (`tests/integration/`)

```python
# conftest.py — uses real test Postgres, mocked LLM/TTS
@pytest.fixture
async def client(db):
    app = create_app()
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def mock_anthropic(mocker):
    return mocker.patch('app.shared.ai.anthropic_client.get_anthropic_client')

@pytest.fixture
def mock_tts(mocker):
    return mocker.patch('app.shared.ai.openai_client.get_openai_client')
```

```
tests/integration/
├── test_generation_pipeline.py    # Full pipeline with mocked LLM/TTS, real Postgres
├── test_auth_endpoints.py         # JWT validation, role checks
├── test_multitenancy.py           # Student A cannot access Student B's enrollment
├── test_run_code.py               # Code execution + verdict (mocked Judge0)
├── test_socratic_hint.py          # Hint streaming + NO answer leak assertion
├── test_ask_anything.py           # RAG retrieval + answer streaming
├── test_understanding_check.py    # Evaluation + pass/fail routing
└── test_enrollment.py             # Enroll by code, idempotency
```

**Anti-leak test (critical):**

```python
# tests/integration/test_socratic_hint.py
async def test_socratic_hint_never_reveals_answer(client, mock_anthropic):
    # Arrange: code block with known solution
    block = create_code_block(starter="def add(a, b):\n    pass", expected="return a + b")
    mock_anthropic.return_value.stream_hint.return_value = iter(["Try thinking about ", "the return statement"])
    
    # Act: get hint
    response = await client.post(f"/api/blocks/{block.id}/socratic-hint", ...)
    hint_text = "".join(response.sse_tokens())
    
    # Assert: hint doesn't contain the solution
    assert "return a + b" not in hint_text
    assert "a + b" not in hint_text  # even partial solution
```

---

## 11. Docker & Deployment

### Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml uv.lock .
RUN pip install uv && uv sync --no-dev --frozen

# Stage 2: Runtime (~150 MB)
FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY app/ app/
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.prod.yml

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [backend]

  backend:
    image: ghcr.io/dockified/ai-tutor-backend:latest
    env_file: .env.prod
    restart: unless-stopped
    # No exposed port — Caddy proxies to backend:8000
```

### Caddyfile

```
api.tutor.dockified.com {
    reverse_proxy backend:8000
    header {
        Access-Control-Allow-Origin "https://tutor.dockified.com"
        Access-Control-Allow-Methods "GET, POST, PATCH, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Authorization, Content-Type"
    }
}
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: test }
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --dev
      - run: uv run pytest tests/ -x -q

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/dockified/ai-tutor-backend:latest
      - name: Deploy to VPS
        run: |
          ssh ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
            "cd /srv/ai-tutor && docker compose pull && docker compose up -d"
```

---

## 12. Observability

### Structured Logging

```python
import structlog

logger = structlog.get_logger()

# In generation pipeline:
logger.info("generation.phase", phase="embedding", course_id=course_id, chunks=len(chunks))
logger.info("generation.complete", course_id=course_id, duration_s=elapsed, total_blocks=n)

# In realtime endpoints:
logger.info("ask.request", enrollment_id=enrollment_id, question_length=len(question))
logger.info("ask.complete", enrollment_id=enrollment_id, tokens_used=tokens, latency_ms=latency)
```

### Sentry Integration

```python
# app/main.py
import sentry_sdk
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=0.1,  # 10% of requests
    profiles_sample_rate=0.05,
)
```

### Key Metrics to Watch

| Metric | Why it matters |
|---|---|
| `generation.success_rate` | Core product health |
| `generation.duration_p95` | Creator experience |
| `ask.latency_first_token_p95` | Student experience |
| `run_code.judge0_error_rate` | External dependency health |
| `understanding_check.pass_rate_by_block` | Which lessons need regeneration? |
| `socratic_hint.attempt_distribution` | Are students stuck on specific blocks? |
