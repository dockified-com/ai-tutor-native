# 6 — Tech Stack
## Backend Technology Specification — V1

**Source:** `docs/superpowers/specs/2026-05-30-ai-native-tutor-design.md` · `docs/architecture/04_backend_plan.md` · `docs/architecture/05_database_schema.md`

> This is the **definitive allowed list** for the backend. Using any technology not listed here requires explicit approval and a roadmap entry.

---

## Runtime

| Technology | Version | Role |
|---|---|---|
| **Python** | 3.12 | Runtime language |
| **FastAPI** | ≥ 0.118 | Web framework — async routes, dependency injection, OpenAPI |
| **Uvicorn** | ≥ 0.32 (with `[standard]`) | ASGI server — runs FastAPI |
| **Pydantic** | v2 (`≥ 2.10`) | Request/response validation + LLM structured output schemas |
| **pydantic-settings** | ≥ 2.7 | `BaseSettings` — environment variable loading |

---

## Database

| Technology | Version | Role |
|---|---|---|
| **PostgreSQL** | 16 (via Supabase Managed) | Primary relational database |
| **pgvector** | ≥ 0.3 | `VECTOR(1536)` column + HNSW cosine similarity index for RAG |
| **SQLAlchemy** | 2.x (`[asyncio]`, ≥ 2.0) | Async ORM — models, queries, sessions |
| **asyncpg** | ≥ 0.30 | Async PostgreSQL driver (used by SQLAlchemy) |
| **Alembic** | ≥ 1.14 | Schema migrations (async mode via `alembic/env.py`) |

### Database Configuration

- **Connection:** `postgresql+asyncpg://` URL via `settings.database_url`
- **Session:** `async_sessionmaker` + `AsyncSession`
- **Base:** All ORM models inherit `app.shared.db.Base` (`DeclarativeBase`)
- **Migrations:** `alembic revision --autogenerate -m "description"` after model changes
- **Primary keys:** `UUID` (`uuid4()` in Python; `uuid_generate_v4()` in Postgres)
- **Timestamps:** `TIMESTAMPTZ NOT NULL DEFAULT NOW()` on all tables
- **Block content:** `JSONB` (shape enforced by Pydantic, not DB)
- **pgvector index:** HNSW (`vector_cosine_ops`, m=16, ef_construction=64)

### Supabase

| Service | Usage |
|---|---|
| **Supabase Postgres** | Primary database hosting (free tier in V1) |
| **Supabase Storage** | PDF uploads (`pdfs/{user_id}/{uuid}.pdf`); TTS audio (`audio/{block_id}.mp3`) |
| **Supabase Auth** | ❌ NOT USED — Clerk handles all authentication |

---

## AI Providers

| Provider | SDK | Usage |
|---|---|---|
| **Anthropic Claude Sonnet** | `anthropic` (async) | Course generation (outline + blocks), Socratic hints, Ask Anything, Understanding Check evaluation |
| **OpenAI TTS** | `openai` (async) | Pre-generated narration audio (`tts-1`, voice `alloy`) |

### Anthropic Usage Details

| Task | Model | Call Type |
|---|---|---|
| Course outline generation | `claude-sonnet-4-5` | Structured output via `tool_choice` |
| Per-lesson block generation | `claude-sonnet-4-5` | Structured output via `tool_choice` |
| Socratic hint | `claude-sonnet-4-5` (or Haiku pending Week 4-5 eval) | SSE stream |
| Ask Anything | `claude-sonnet-4-5` | SSE stream |
| Understanding check evaluation | `claude-sonnet-4-5` | Structured JSON + SSE stream |
| Code block verdict (`ai_eval`) | `claude-sonnet-4-5` | One-shot |

### Embedding Model

- **V1 default:** Anthropic `voyage-3` (via partnership) — `VECTOR(1536)`
- **Fallback:** OpenAI `text-embedding-3-small` (same dimension)
- **Decision point:** End of Week 2 (retrieval quality test)

### OpenAI TTS Details

| Setting | Value |
|---|---|
| Model | `tts-1` |
| Voice | `alloy` (single voice in V1; per-course override deferred to V2) |
| Output format | MP3 |
| Storage | Supabase Storage `audio/{block_id}.mp3` |
| Failure behavior | `tts_audio_url = null`; course still publishable; audio degrades silently |

---

## Code Execution

| Technology | Role |
|---|---|
| **Judge0 RapidAPI** | Sandboxed code execution (60+ languages) |
| **httpx** | Async HTTP client for Judge0 API calls |

### Judge0 Configuration

- **Endpoint:** `https://judge0-ce.p.rapidapi.com/submissions`
- **Mode:** `?wait=true` (synchronous result)
- **Timeout:** 10 seconds
- **Free tier:** 50 executions/day; upgrade required beyond this

### Language → Judge0 Language ID Mapping

```python
LANGUAGE_IDS = {
    'python':     71,
    'javascript': 63,
    'typescript': 74,
    'java':       62,
    'cpp':        54,
    'go':         60,
    'rust':       73,
    'c':          50,
    'bash':       46,
}
```

### Verdict Evaluation Logic

```python
LEVEL_ORDER = {'poor': 0, 'fair': 1, 'good': 2, 'excellent': 3}

# Verdict strategies
'exact'   → trimmed string compare: actual.strip() == expected.strip()
'regex'   → re.match(expected_output, actual.strip())
'ai_eval' → separate Claude call: "did this accomplish the task?"
```

---

## Auth

| Technology | Role |
|---|---|
| **Clerk** | Managed sign-in/sign-up, JWT issuance, social login (Google) |
| **pyjwt[crypto]** | RS256 JWT verification (`≥ 2.10`) |
| **svix** | Clerk webhook signature verification (`≥ 1.40`) |
| **httpx** | JWKS endpoint fetching (in `ClerkJwksClient`) |

### Clerk JWT Flow

```
Request → Authorization: Bearer <Clerk JWT>
  → ClerkJwksClient.get_keys()  (cached 300s)
  → ClerkVerifier.verify(token)  (RS256, checks exp/sub/iss, leeway=5s)
  → Extract clerk_user_id from claims["sub"]
  → get_or_create_user(db, clerk_user_id, ...)
  → Return User ORM object to route handler
```

### Clerk Webhook Events Handled

| Event | Action |
|---|---|
| `user.created` | `get_or_create_user()` |
| `user.updated` | `update_user_from_clerk()` |

---

## HTTP & Streaming

| Technology | Role |
|---|---|
| **httpx** | Async HTTP client (Judge0, JWKS fetch) |
| **sse-starlette** | `EventSourceResponse` for SSE streaming endpoints |
| **python-multipart** | `multipart/form-data` PDF upload parsing |

### SSE Streaming Pattern

```python
from sse_starlette.sse import EventSourceResponse

async def stream_endpoint(...):
    async def events():
        async with client.messages.stream(...) as stream:
            async for text in stream.text_stream:
                yield {"event": "token", "data": text}
        yield {"event": "done", "data": ""}
    return EventSourceResponse(events())
```

### SSE Event Types

| Event | Data | Used In |
|---|---|---|
| `token` | Plaintext string chunk | All streaming endpoints |
| `result` | JSON string | `understanding-check` |
| `error` | Error message string | All streaming endpoints (on AI failure) |
| `done` | `""` (empty) | All streaming endpoints |

---

## Email Validation

| Technology | Role |
|---|---|
| **email-validator** | ≥ 2.2 — used by Pydantic `EmailStr` type in `AppUserOut` |

---

## Concurrency

| Pattern | Usage |
|---|---|
| `asyncio.gather` with `asyncio.Semaphore(10)` | Batch embedding during generation |
| `asyncio.gather` with `asyncio.Semaphore(5)` | Batch TTS audio generation |
| `asyncio.create_task()` | Background generation pipeline (fire-and-forget from route handler) |
| **No threading** | All I/O is async; no `concurrent.futures.ThreadPoolExecutor` |
| **No Celery / Redis** | V1 uses in-process asyncio only |

---

## Deployment Infrastructure

| Component | Technology | Cost |
|---|---|---|
| **Backend host** | FastAPI in Docker, Hetzner CX22 VPS | $5–10/mo |
| **Reverse proxy + SSL** | Caddy 2 (auto Let's Encrypt) | $0 |
| **Container registry** | GitHub Container Registry (GHCR) | $0 |
| **CI/CD** | GitHub Actions | $0 |
| **Error tracking** | Sentry (Developer tier) | $0 |
| **Auth** | Clerk (Free tier, ~10K MAU) | $0 → $25/mo |
| **Database** | Supabase (Free tier) | $0 |
| **LLM** | Anthropic Claude Sonnet pay-as-you-go | ~$10–20/mo |
| **TTS** | OpenAI TTS pay-as-you-go | ~$5/mo |
| **Code execution** | Judge0 RapidAPI Basic | $0 (50/day free) |
| **Frontend** | Next.js on Vercel (NOT backend's concern) | $0 |

### Docker Configuration

```dockerfile
# Multi-stage build (~150 MB final image)
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml uv.lock .
RUN pip install uv && uv sync --no-dev --frozen

FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY app/ app/
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Development Tools

| Tool | Version | Purpose |
|---|---|---|
| **ruff** | ≥ 0.9 | Linter + formatter (replaces flake8, isort, pyupgrade) |
| **mypy** | ≥ 1.14 | Static type checker |
| **pytest** | ≥ 8.4 | Test runner |
| **pytest-asyncio** | ≥ 0.25 | Async test support (`asyncio_mode = "auto"`) |
| **pytest-cov** | ≥ 6.0 | Coverage reporting |
| **httpx** | ≥ 0.28 | `AsyncClient` + `ASGITransport` for integration tests |

### pyproject.toml Configuration

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"
```

---

## Observability

| Tool | Usage |
|---|---|
| **structlog** | Structured JSON logging — generation duration, per-endpoint latency, LLM token use |
| **Sentry** | Unhandled exception capture (`traces_sample_rate=0.1`) |

### Key Metrics (V1 Minimum)

| Metric | Source |
|---|---|
| `generation.success_rate` | Pipeline status transitions |
| `generation.duration_p95` | Elapsed time from trigger to `ready` |
| `ask.latency_first_token_p95` | SSE first token timestamp |
| `run_code.judge0_error_rate` | Verdict = `error` count |
| `understanding_check.pass_rate_by_block` | `passed = true` rate per block |
| `socratic_hint.attempt_distribution` | `attempt_number` distribution |

---

## Technologies NOT Allowed in V1

| Technology | Reason | Available In |
|---|---|---|
| LangChain | Framework lock-in; vanilla SDK sufficient | V2/V3 |
| LangGraph | Overkill for V1 Socratic flow | V2 |
| LlamaIndex | Overkill for V1 naive top-k RAG | V2 |
| Celery | No concurrent generation in V1 | V2 |
| Redis | No task queue needed in V1 | V2 |
| Supabase Auth | Clerk handles all auth | Never |
| Supabase RLS | API-layer access control in V1 | V2 |
| Whisper / STT | No voice input in V1 | V2 |
| Any threading | All I/O is async | Never |
