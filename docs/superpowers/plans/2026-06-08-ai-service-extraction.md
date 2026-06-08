# AI Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all model inference into a standalone, stateless AI server (no database) that streams reasoning + audio directly to the browser, while Next.js (Vercel) owns data/auth/orchestration and trigger.dev runs the durable course-generation pipeline.

**Architecture:** A new FastAPI `ai_server/` app holds all provider keys and exposes a versioned `/v1` API (`/session`, `/reason`, `/speak`, `/run`, `/embed`). Two credentials secure it: a static `AI_SERVICE_SECRET` for server-to-server calls and short-lived AI-minted session-token JWTs for browser-direct streams. The AI server never touches a DB — Next persists stream results via signed result events, and trigger.dev writes pipeline output directly. Single-turn runtime now, LangGraph-swappable later.

**Tech Stack:** Python 3.12, FastAPI, `sse-starlette`, `anthropic`, `openai` (embeddings), `google-genai` (TTS), `pyjwt[crypto]`, pytest/pytest-asyncio; Next.js 16 / Clerk 7 (TypeScript); trigger.dev (TypeScript).

**Source spec:** `docs/superpowers/specs/2026-06-08-ai-service-extraction-design.md`

---

## File Structure

New standalone server (built in-repo at `ai_server/`, lifted to a fresh repo in Phase 7):

```
ai_server/
  pyproject.toml                      # deps: fastapi, anthropic, openai, google-genai, pyjwt, sse-starlette
  .env.example                        # AI_SERVICE_SECRET, SESSION_SIGNING_SECRET, provider keys
  app/
    main.py                           # create_app(), mounts /v1 router, /healthz
    config.py                         # Settings (no DB url, no clerk)
    transport/
      router.py                       # /v1 APIRouter aggregator
      session_routes.py               # POST /v1/session
      reason_routes.py                # POST /v1/reason  (SSE)
      speak_routes.py                 # POST /v1/speak   (audio stream)
      run_routes.py                   # POST /v1/run     (json)
      embed_routes.py                 # POST /v1/embed   (json, batch)
    security/
      service_secret.py               # verify static service secret (Depends)
      session_token.py                # mint + verify session JWT
      result_signing.py               # sign + verify signed result events
    agents/
      registry.py                     # AGENTS: name -> AgentDef
      definitions.py                  # system prompts moved from backend
    runtime/
      executor.py                     # single-turn run (json) + stream (text)
    providers/
      anthropic_provider.py
      openai_provider.py              # embeddings
      gemini_provider.py              # TTS
  tests/
    conftest.py
    unit/
      test_session_token.py
      test_service_secret.py
      test_result_signing.py
      test_registry.py
    integration/
      test_embed.py
      test_run.py
      test_session_and_reason.py
      test_speak.py
```

Next.js changes (existing `frontend/`):

```
frontend/
  shared/api/ai-server.ts             # NEW: server-only client for AI server (service secret)
  shared/lib/result-events.ts         # NEW: verify signed result events
  app/api/.../route.ts                # MODIFY: tutor/builder routes call AI server
  app/api/tts/stream/route.ts         # DELETE (old pre-gen audio)
```

trigger.dev (new `jobs/` workspace):

```
jobs/
  trigger.config.ts
  src/generate-course.ts              # durable pipeline; calls AI /embed + /run; writes DB
  src/db.ts                           # shared DB client
```

---

## Conventions (read before starting)

- **Tests:** `cd ai_server && pytest tests/path::test_name -v`. `asyncio_mode=auto` (no `@pytest.mark.asyncio` needed). Integration tests use `httpx.ASGITransport` against `app` (mirror `backend/tests/conftest.py`).
- **Env in tests:** set required env vars via `os.environ.setdefault(...)` in `conftest.py` BEFORE importing `app.main`.
- **Provider calls in tests:** never hit real APIs — monkeypatch the provider adapter functions.
- **Commits:** one per task (after tests pass). Memory note: commit per task group, not batched.
- **Ruff:** line-length 100, target py312.

---

## Phase 1 — AI Server Foundation (skeleton, config, security)

### Task 1: Scaffold `ai_server` package + config

**Files:**
- Create: `ai_server/pyproject.toml`
- Create: `ai_server/.env.example`
- Create: `ai_server/app/__init__.py` (empty)
- Create: `ai_server/app/config.py`
- Create: `ai_server/tests/__init__.py` (empty), `ai_server/tests/unit/__init__.py` (empty)
- Test: `ai_server/tests/unit/test_config.py`

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[project]
name = "ai-server"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.118",
  "uvicorn[standard]>=0.32",
  "pydantic>=2.10",
  "pydantic-settings>=2.7",
  "sse-starlette>=2.1",
  "httpx>=0.28",
  "pyjwt[crypto]>=2.10",
  "anthropic>=0.50",
  "openai>=1.60",
  "google-genai>=0.3",
]

[project.optional-dependencies]
dev = ["pytest>=8.4", "pytest-asyncio>=0.25", "ruff>=0.9", "mypy>=1.14"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"
```

- [ ] **Step 2: Write `.env.example`**

```
AI_SERVICE_SECRET=change-me-shared-static-secret
SESSION_SIGNING_SECRET=change-me-jwt-signing-secret
SESSION_TOKEN_TTL_SECONDS=300
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

- [ ] **Step 3: Write the failing test** — `ai_server/tests/unit/test_config.py`

```python
import os

os.environ.setdefault("AI_SERVICE_SECRET", "svc-secret")
os.environ.setdefault("SESSION_SIGNING_SECRET", "sign-secret")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("GEMINI_API_KEY", "gem-test")

from app.config import get_settings


def test_settings_load_from_env():
    s = get_settings()
    assert s.ai_service_secret == "svc-secret"
    assert s.session_signing_secret == "sign-secret"
    assert s.session_token_ttl_seconds == 300  # default
    assert s.anthropic_api_key == "sk-ant-test"
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.config'`

- [ ] **Step 5: Write `app/config.py`**

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    log_level: str = "INFO"

    ai_service_secret: str
    session_signing_secret: str
    session_token_ttl_seconds: int = 300

    anthropic_api_key: str
    openai_api_key: str
    gemini_api_key: str


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_config.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add ai_server/pyproject.toml ai_server/.env.example ai_server/app/__init__.py ai_server/app/config.py ai_server/tests/
git commit -m "feat(ai-server): scaffold package and config"
```

---

### Task 2: Session-token mint + verify

**Files:**
- Create: `ai_server/app/security/__init__.py` (empty)
- Create: `ai_server/app/security/session_token.py`
- Test: `ai_server/tests/unit/test_session_token.py`

- [ ] **Step 1: Write the failing test**

```python
import time

import pytest

from app.security.session_token import mint_session_token, verify_session_token, SessionTokenError


def test_mint_and_verify_roundtrip():
    token = mint_session_token(
        agent="ask",
        server_context={"chunks": ["a", "b"]},
        signing_secret="sign-secret",
        ttl_seconds=300,
    )
    claims = verify_session_token(token, signing_secret="sign-secret")
    assert claims["agent"] == "ask"
    assert claims["server_context"] == {"chunks": ["a", "b"]}
    assert "jti" in claims


def test_verify_rejects_wrong_secret():
    token = mint_session_token("ask", {}, signing_secret="right", ttl_seconds=300)
    with pytest.raises(SessionTokenError):
        verify_session_token(token, signing_secret="wrong")


def test_verify_rejects_expired():
    token = mint_session_token("ask", {}, signing_secret="s", ttl_seconds=-1)
    with pytest.raises(SessionTokenError):
        verify_session_token(token, signing_secret="s")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_session_token.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/security/session_token.py`**

```python
from __future__ import annotations

import datetime as _dt
import uuid

import jwt


class SessionTokenError(Exception):
    """Raised when a session token cannot be minted or verified."""


def mint_session_token(
    agent: str,
    server_context: dict,
    signing_secret: str,
    ttl_seconds: int,
) -> str:
    now = _dt.datetime.now(tz=_dt.timezone.utc)
    payload = {
        "agent": agent,
        "server_context": server_context,
        "iat": now,
        "exp": now + _dt.timedelta(seconds=ttl_seconds),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, signing_secret, algorithm="HS256")


def verify_session_token(token: str, signing_secret: str) -> dict:
    try:
        return jwt.decode(
            token,
            signing_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "agent"]},
        )
    except jwt.PyJWTError as exc:
        raise SessionTokenError(str(exc)) from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_session_token.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add ai_server/app/security/__init__.py ai_server/app/security/session_token.py ai_server/tests/unit/test_session_token.py
git commit -m "feat(ai-server): session token mint and verify"
```

---

### Task 3: Service-secret dependency

**Files:**
- Create: `ai_server/app/security/service_secret.py`
- Test: `ai_server/tests/unit/test_service_secret.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest
from fastapi import HTTPException

from app.security.service_secret import require_service_secret


def test_accepts_matching_secret():
    # should not raise
    require_service_secret(authorization="Bearer svc-secret", expected="svc-secret")


def test_rejects_missing_header():
    with pytest.raises(HTTPException) as exc:
        require_service_secret(authorization=None, expected="svc-secret")
    assert exc.value.status_code == 401


def test_rejects_wrong_secret():
    with pytest.raises(HTTPException) as exc:
        require_service_secret(authorization="Bearer nope", expected="svc-secret")
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_service_secret.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/security/service_secret.py`**

```python
import hmac

from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_service_secret(
    authorization: str | None,
    expected: str,
) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing service secret")
    presented = authorization.split(" ", 1)[1]
    if not hmac.compare_digest(presented, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid service secret")


async def service_secret_guard(authorization: str | None = Header(default=None)) -> None:
    require_service_secret(authorization, get_settings().ai_service_secret)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_service_secret.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add ai_server/app/security/service_secret.py ai_server/tests/unit/test_service_secret.py
git commit -m "feat(ai-server): service-secret guard with constant-time compare"
```

---

### Task 4: Signed result events (sign + verify)

**Files:**
- Create: `ai_server/app/security/result_signing.py`
- Test: `ai_server/tests/unit/test_result_signing.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest

from app.security.result_signing import sign_result, verify_result, ResultSignatureError


def test_sign_and_verify_roundtrip():
    blob = sign_result({"passed": True, "level": "good"}, signing_secret="s")
    payload = verify_result(blob, signing_secret="s")
    assert payload == {"passed": True, "level": "good"}


def test_verify_rejects_tampered_payload():
    blob = sign_result({"passed": False}, signing_secret="s")
    with pytest.raises(ResultSignatureError):
        verify_result(blob, signing_secret="wrong")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_result_signing.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/security/result_signing.py`**

```python
from __future__ import annotations

import jwt


class ResultSignatureError(Exception):
    """Raised when a signed result event fails verification."""


def sign_result(payload: dict, signing_secret: str) -> str:
    # Wrap under a claim so the whole dict is signed as one unit.
    return jwt.encode({"result": payload}, signing_secret, algorithm="HS256")


def verify_result(token: str, signing_secret: str) -> dict:
    try:
        decoded = jwt.decode(token, signing_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise ResultSignatureError(str(exc)) from exc
    return decoded["result"]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_result_signing.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add ai_server/app/security/result_signing.py ai_server/tests/unit/test_result_signing.py
git commit -m "feat(ai-server): signed result events for stream persistence"
```

---

### Task 5: App skeleton + `/healthz`

**Files:**
- Create: `ai_server/app/transport/__init__.py` (empty)
- Create: `ai_server/app/transport/router.py`
- Create: `ai_server/app/main.py`
- Create: `ai_server/tests/conftest.py`
- Create: `ai_server/tests/integration/__init__.py` (empty)
- Test: `ai_server/tests/integration/test_healthz.py`

- [ ] **Step 1: Write `tests/conftest.py`**

```python
import os

os.environ.setdefault("AI_SERVICE_SECRET", "svc-secret")
os.environ.setdefault("SESSION_SIGNING_SECRET", "sign-secret")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("GEMINI_API_KEY", "gem-test")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

- [ ] **Step 2: Write the failing test** — `tests/integration/test_healthz.py`

```python
async def test_healthz(client):
    resp = await client.get("/v1/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ai_server && pytest tests/integration/test_healthz.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`

- [ ] **Step 4: Write `app/transport/router.py`**

```python
from fastapi import APIRouter

v1 = APIRouter(prefix="/v1")


@v1.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 5: Write `app/main.py`**

```python
from fastapi import FastAPI

from app.transport.router import v1


def create_app() -> FastAPI:
    app = FastAPI(title="AI Server")
    app.include_router(v1)
    return app


app = create_app()
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd ai_server && pytest tests/integration/test_healthz.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add ai_server/app/main.py ai_server/app/transport/ ai_server/tests/conftest.py ai_server/tests/integration/
git commit -m "feat(ai-server): app skeleton with /v1/healthz"
```

---

## Phase 2 — Agent registry, providers, runtime, `/embed` + `/run`

### Task 6: Agent definitions (move prompts from backend)

**Files:**
- Create: `ai_server/app/agents/__init__.py` (empty)
- Create: `ai_server/app/agents/definitions.py`
- Reference (copy text from): `backend/app/features/tutor/prompts.py`, `backend/app/features/authoring/prompts.py`, and the inline system prompts in `backend/app/features/builder/service.py:57-62` and `backend/app/features/tutor/service.py:178`

- [ ] **Step 1: Create `app/agents/definitions.py`** — copy the exact prompt strings from the backend files referenced above into named constants.

```python
# Tutor (streaming) — copied verbatim from backend/app/features/tutor/prompts.py
SOCRATIC_SYSTEM_PROMPT = """<paste SOCRATIC_SYSTEM_PROMPT body>"""
UNDERSTANDING_CHECK_SYSTEM_PROMPT = """<paste UNDERSTANDING_CHECK_SYSTEM_PROMPT body>"""
ASK_ANYTHING_SYSTEM_PROMPT = """<paste ASK_ANYTHING_SYSTEM_PROMPT body>"""

# Authoring (json) — copied from backend/app/features/authoring/prompts.py
OUTLINE_SYSTEM_PROMPT = """<paste OUTLINE_SYSTEM_PROMPT body>"""
LESSON_BLOCKS_SYSTEM_PROMPT = """<paste LESSON_BLOCKS_SYSTEM_PROMPT body>"""

# code-eval — from backend/app/features/tutor/service.py:178
CODE_EVAL_SYSTEM_PROMPT = 'Return only JSON: {"verdict": "passed"} or {"verdict": "failed"}.'

# agent-edit — from backend/app/features/builder/service.py:57-62
AGENT_EDIT_SYSTEM_PROMPT = (
    "You are a curriculum editor. Respond with ONLY a JSON object: "
    '{"reply": "<short explanation>", "blocks": [<full updated block list>]}. '
    "Each block must have: id (string, keep existing), position (int), type (string), content (object). "
    "Do not change block IDs or add/remove required content fields."
)
```

> NOTE TO IMPLEMENTER: open each referenced backend file and paste the real multi-line prompt bodies. Do not invent prompt text.

- [ ] **Step 2: Commit**

```bash
git add ai_server/app/agents/__init__.py ai_server/app/agents/definitions.py
git commit -m "feat(ai-server): move system prompts into agent definitions"
```

---

### Task 7: Agent registry

**Files:**
- Create: `ai_server/app/agents/registry.py`
- Test: `ai_server/tests/unit/test_registry.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest

from app.agents.registry import get_agent, AgentDef, UnknownAgentError


def test_known_agent_has_fields():
    a = get_agent("socratic")
    assert isinstance(a, AgentDef)
    assert a.mode == "stream"
    assert a.model.startswith("claude")
    assert a.system_prompt


def test_run_agent_is_json_mode():
    assert get_agent("outline").mode == "json"
    assert get_agent("code-eval").mode == "json"


def test_unknown_agent_raises():
    with pytest.raises(UnknownAgentError):
        get_agent("does-not-exist")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_registry.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/agents/registry.py`**

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.agents import definitions as d


class UnknownAgentError(Exception):
    """Raised when an agent name is not in the registry."""


@dataclass(frozen=True)
class AgentDef:
    name: str
    model: str
    system_prompt: str
    mode: Literal["stream", "json"]
    max_tokens: int


AGENTS: dict[str, AgentDef] = {
    "socratic": AgentDef("socratic", "claude-sonnet-4-6", d.SOCRATIC_SYSTEM_PROMPT, "stream", 512),
    "understanding-check": AgentDef(
        "understanding-check", "claude-sonnet-4-6", d.UNDERSTANDING_CHECK_SYSTEM_PROMPT, "stream", 512
    ),
    "ask": AgentDef("ask", "claude-sonnet-4-6", d.ASK_ANYTHING_SYSTEM_PROMPT, "stream", 1024),
    "code-eval": AgentDef("code-eval", "claude-haiku-4-5-20251001", d.CODE_EVAL_SYSTEM_PROMPT, "json", 64),
    "agent-edit": AgentDef("agent-edit", "claude-sonnet-4-6", d.AGENT_EDIT_SYSTEM_PROMPT, "json", 4096),
    "outline": AgentDef("outline", "claude-opus-4-8", d.OUTLINE_SYSTEM_PROMPT, "json", 4096),
    "generate-blocks": AgentDef(
        "generate-blocks", "claude-opus-4-8", d.LESSON_BLOCKS_SYSTEM_PROMPT, "json", 4096
    ),
}


def get_agent(name: str) -> AgentDef:
    try:
        return AGENTS[name]
    except KeyError as exc:
        raise UnknownAgentError(name) from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_registry.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add ai_server/app/agents/registry.py ai_server/tests/unit/test_registry.py
git commit -m "feat(ai-server): agent registry"
```

---

### Task 8: Provider adapters (anthropic, openai-embed, gemini-tts)

**Files:**
- Create: `ai_server/app/providers/__init__.py` (empty)
- Create: `ai_server/app/providers/anthropic_provider.py`
- Create: `ai_server/app/providers/openai_provider.py`
- Create: `ai_server/app/providers/gemini_provider.py`

> These are thin wrappers over the SDK singletons. No unit test (they only construct SDK clients); they are exercised via monkeypatch in endpoint integration tests.

- [ ] **Step 1: Write `app/providers/anthropic_provider.py`**

```python
from anthropic import AsyncAnthropic

from app.config import get_settings

anthropic_client = AsyncAnthropic(api_key=get_settings().anthropic_api_key)
```

- [ ] **Step 2: Write `app/providers/openai_provider.py`**

```python
from openai import AsyncOpenAI

from app.config import get_settings

openai_client = AsyncOpenAI(api_key=get_settings().openai_api_key)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    resp = await openai_client.embeddings.create(
        input=texts,
        model="text-embedding-3-small",
    )
    return [item.embedding for item in resp.data]
```

- [ ] **Step 3: Write `app/providers/gemini_provider.py`**

```python
from google import genai

from app.config import get_settings

gemini_client = genai.Client(api_key=get_settings().gemini_api_key)
```

> NOTE: the actual TTS call signature is implemented in Task 17 (`/speak`). This task only sets up the client singleton.

- [ ] **Step 4: Commit**

```bash
git add ai_server/app/providers/
git commit -m "feat(ai-server): provider adapters for anthropic, openai-embed, gemini"
```

---

### Task 9: `/embed` endpoint (batch)

**Files:**
- Create: `ai_server/app/transport/embed_routes.py`
- Modify: `ai_server/app/transport/router.py` (include embed router)
- Test: `ai_server/tests/integration/test_embed.py`

- [ ] **Step 1: Write the failing test**

```python
import app.transport.embed_routes as embed_routes


async def test_embed_requires_service_secret(client):
    resp = await client.post("/v1/embed", json={"texts": ["hi"]})
    assert resp.status_code == 401


async def test_embed_batch(client, monkeypatch):
    async def fake_embed(texts):
        return [[0.1, 0.2] for _ in texts]

    monkeypatch.setattr(embed_routes, "embed_texts", fake_embed)
    resp = await client.post(
        "/v1/embed",
        json={"texts": ["a", "b"]},
        headers={"authorization": "Bearer svc-secret"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"vectors": [[0.1, 0.2], [0.1, 0.2]]}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/integration/test_embed.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/transport/embed_routes.py`**

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.providers.openai_provider import embed_texts
from app.security.service_secret import service_secret_guard

router = APIRouter()


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    vectors: list[list[float]]


@router.post("/embed", response_model=EmbedResponse, dependencies=[Depends(service_secret_guard)])
async def embed_endpoint(body: EmbedRequest) -> EmbedResponse:
    vectors = await embed_texts(body.texts)
    return EmbedResponse(vectors=vectors)
```

- [ ] **Step 4: Wire into `app/transport/router.py`**

```python
from fastapi import APIRouter

from app.transport.embed_routes import router as embed_router

v1 = APIRouter(prefix="/v1")


@v1.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}


v1.include_router(embed_router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ai_server && pytest tests/integration/test_embed.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add ai_server/app/transport/embed_routes.py ai_server/app/transport/router.py ai_server/tests/integration/test_embed.py
git commit -m "feat(ai-server): /v1/embed batch endpoint"
```

---

### Task 10: Runtime executor (json mode)

**Files:**
- Create: `ai_server/app/runtime/__init__.py` (empty)
- Create: `ai_server/app/runtime/executor.py`
- Test: `ai_server/tests/unit/test_executor_json.py`

- [ ] **Step 1: Write the failing test**

```python
import app.runtime.executor as executor
from app.agents.registry import get_agent


class _FakeContent:
    def __init__(self, text):
        self.text = text


class _FakeResp:
    def __init__(self, text):
        self.content = [_FakeContent(text)]


async def test_run_json_returns_text(monkeypatch):
    async def fake_create(**kwargs):
        assert kwargs["model"] == "claude-haiku-4-5-20251001"
        assert kwargs["system"]  # agent system prompt passed through
        return _FakeResp('{"verdict": "passed"}')

    monkeypatch.setattr(executor.anthropic_client.messages, "create", fake_create)
    out = await executor.run_json(get_agent("code-eval"), user_message="check this")
    assert out == '{"verdict": "passed"}'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_executor_json.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/runtime/executor.py`**

```python
from __future__ import annotations

from collections.abc import AsyncGenerator

from app.agents.registry import AgentDef
from app.providers.anthropic_provider import anthropic_client


async def run_json(agent: AgentDef, user_message: str) -> str:
    resp = await anthropic_client.messages.create(
        model=agent.model,
        max_tokens=agent.max_tokens,
        system=agent.system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return resp.content[0].text


async def run_stream(agent: AgentDef, user_message: str) -> AsyncGenerator[str, None]:
    async with anthropic_client.messages.stream(
        model=agent.model,
        max_tokens=agent.max_tokens,
        system=agent.system_prompt,
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        async for chunk in stream.text_stream:
            yield chunk
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_executor_json.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ai_server/app/runtime/ ai_server/tests/unit/test_executor_json.py
git commit -m "feat(ai-server): runtime executor (json + stream)"
```

---

### Task 11: `/run` endpoint (json agents)

**Files:**
- Create: `ai_server/app/transport/run_routes.py`
- Modify: `ai_server/app/transport/router.py` (include run router)
- Test: `ai_server/tests/integration/test_run.py`

- [ ] **Step 1: Write the failing test**

```python
import app.transport.run_routes as run_routes


async def test_run_requires_service_secret(client):
    resp = await client.post("/v1/run", json={"agent": "code-eval", "user_message": "x"})
    assert resp.status_code == 401


async def test_run_unknown_agent(client):
    resp = await client.post(
        "/v1/run",
        json={"agent": "nope", "user_message": "x"},
        headers={"authorization": "Bearer svc-secret"},
    )
    assert resp.status_code == 400


async def test_run_returns_text(client, monkeypatch):
    async def fake_run_json(agent, user_message):
        return '{"verdict": "passed"}'

    monkeypatch.setattr(run_routes, "run_json", fake_run_json)
    resp = await client.post(
        "/v1/run",
        json={"agent": "code-eval", "user_message": "check"},
        headers={"authorization": "Bearer svc-secret"},
    )
    assert resp.status_code == 200
    assert resp.json() == {"text": '{"verdict": "passed"}'}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/integration/test_run.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/transport/run_routes.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.agents.registry import UnknownAgentError, get_agent
from app.runtime.executor import run_json
from app.security.service_secret import service_secret_guard

router = APIRouter()


class RunRequest(BaseModel):
    agent: str
    user_message: str


class RunResponse(BaseModel):
    text: str


@router.post("/run", response_model=RunResponse, dependencies=[Depends(service_secret_guard)])
async def run_endpoint(body: RunRequest) -> RunResponse:
    try:
        agent = get_agent(body.agent)
    except UnknownAgentError:
        raise HTTPException(400, f"unknown agent: {body.agent}")
    if agent.mode != "json":
        raise HTTPException(400, f"agent {body.agent} is not a json agent")
    text = await run_json(agent, body.user_message)
    return RunResponse(text=text)
```

- [ ] **Step 4: Wire into `app/transport/router.py`** — add below the embed include:

```python
from app.transport.run_routes import router as run_router

v1.include_router(run_router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ai_server && pytest tests/integration/test_run.py -v`
Expected: PASS (3 passed)

- [ ] **Step 6: Commit**

```bash
git add ai_server/app/transport/run_routes.py ai_server/app/transport/router.py ai_server/tests/integration/test_run.py
git commit -m "feat(ai-server): /v1/run json-agent endpoint"
```

---

## Phase 3 — `/session`, `/reason` (streaming + signed results), `/speak`

> **SSE format note:** the existing frontend hook `frontend/features/tutor/hooks/use-sse-stream.ts` reads lines beginning `data: ` and JSON-parses the payload, appending `parsed.text`. To stay compatible, token events are emitted as `{"event": "token", "data": "<chunk>"}` via `sse-starlette` (which writes `data: <chunk>`), AND the hook is updated in Phase 4 to also recognize a `result` event carrying the signed blob. We keep `sse-starlette`'s event/data model used by the current backend (`yield {"event": "token", "data": chunk}`).

### Task 12: `/session` endpoint (mint token)

**Files:**
- Create: `ai_server/app/transport/session_routes.py`
- Modify: `ai_server/app/transport/router.py`
- Test: `ai_server/tests/integration/test_session.py`

- [ ] **Step 1: Write the failing test**

```python
from app.security.session_token import verify_session_token


async def test_session_requires_service_secret(client):
    resp = await client.post("/v1/session", json={"agent": "ask", "server_context": {}})
    assert resp.status_code == 401


async def test_session_mints_token(client):
    resp = await client.post(
        "/v1/session",
        json={"agent": "ask", "server_context": {"chunks": ["c1"]}},
        headers={"authorization": "Bearer svc-secret"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["expires_in"] == 300
    claims = verify_session_token(body["session_token"], signing_secret="sign-secret")
    assert claims["agent"] == "ask"
    assert claims["server_context"] == {"chunks": ["c1"]}


async def test_session_rejects_unknown_agent(client):
    resp = await client.post(
        "/v1/session",
        json={"agent": "nope", "server_context": {}},
        headers={"authorization": "Bearer svc-secret"},
    )
    assert resp.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/integration/test_session.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/transport/session_routes.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.agents.registry import UnknownAgentError, get_agent
from app.config import get_settings
from app.security.service_secret import service_secret_guard
from app.security.session_token import mint_session_token

router = APIRouter()


class SessionRequest(BaseModel):
    agent: str
    server_context: dict = {}


class SessionResponse(BaseModel):
    session_token: str
    expires_in: int


@router.post("/session", response_model=SessionResponse, dependencies=[Depends(service_secret_guard)])
async def session_endpoint(body: SessionRequest) -> SessionResponse:
    try:
        get_agent(body.agent)  # validate the agent exists
    except UnknownAgentError:
        raise HTTPException(400, f"unknown agent: {body.agent}")
    settings = get_settings()
    ttl = settings.session_token_ttl_seconds
    token = mint_session_token(
        agent=body.agent,
        server_context=body.server_context,
        signing_secret=settings.session_signing_secret,
        ttl_seconds=ttl,
    )
    return SessionResponse(session_token=token, expires_in=ttl)
```

- [ ] **Step 4: Wire into `app/transport/router.py`**

```python
from app.transport.session_routes import router as session_router

v1.include_router(session_router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ai_server && pytest tests/integration/test_session.py -v`
Expected: PASS (3 passed)

- [ ] **Step 6: Commit**

```bash
git add ai_server/app/transport/session_routes.py ai_server/app/transport/router.py ai_server/tests/integration/test_session.py
git commit -m "feat(ai-server): /v1/session token minting"
```

---

### Task 13: Session-token stream guard (Depends)

**Files:**
- Modify: `ai_server/app/security/session_token.py` (add FastAPI dependency)
- Test: `ai_server/tests/unit/test_session_guard.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest
from fastapi import HTTPException

from app.security.session_token import mint_session_token, require_session_claims


def test_require_session_claims_ok():
    token = mint_session_token("ask", {"x": 1}, signing_secret="sign-secret", ttl_seconds=300)
    claims = require_session_claims(authorization=f"Bearer {token}")
    assert claims["agent"] == "ask"


def test_require_session_claims_missing():
    with pytest.raises(HTTPException) as exc:
        require_session_claims(authorization=None)
    assert exc.value.status_code == 401


def test_require_session_claims_bad_token():
    with pytest.raises(HTTPException) as exc:
        require_session_claims(authorization="Bearer garbage")
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_session_guard.py -v`
Expected: FAIL — `require_session_claims` not defined.

- [ ] **Step 3: Append to `app/security/session_token.py`**

```python
from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_session_claims(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing session token")
    token = authorization.split(" ", 1)[1]
    try:
        return verify_session_token(token, get_settings().session_signing_secret)
    except SessionTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_session_guard.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add ai_server/app/security/session_token.py ai_server/tests/unit/test_session_guard.py
git commit -m "feat(ai-server): session-token stream guard dependency"
```

---

### Task 14: Reasoning builders (merge server + client context)

**Files:**
- Create: `ai_server/app/runtime/reasoning.py`
- Test: `ai_server/tests/unit/test_reasoning.py`

> These mirror the `build_*_user_message` helpers from `backend/app/features/tutor/prompts.py`. Copy the exact formatting from that file.

- [ ] **Step 1: Write the failing test**

```python
from app.runtime.reasoning import build_user_message


def test_socratic_message_uses_client_and_server_context():
    msg = build_user_message(
        agent="socratic",
        server_context={"problem_prompt": "Sum a list"},
        client_context={"student_code": "print(1)", "stdout": "1", "stderr": "", "attempt_count": 2},
    )
    assert "Sum a list" in msg
    assert "print(1)" in msg


def test_ask_message_includes_chunks():
    msg = build_user_message(
        agent="ask",
        server_context={"chunks": ["chunk-A", "chunk-B"], "block_context": None},
        client_context={"question": "what is recursion?"},
    )
    assert "chunk-A" in msg
    assert "what is recursion?" in msg
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/unit/test_reasoning.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/runtime/reasoning.py`** — port the body builders from `backend/app/features/tutor/prompts.py` (`build_socratic_user_message`, `build_understanding_check_user_message`, `build_ask_user_message`) and dispatch by agent.

```python
from __future__ import annotations


def _socratic(server: dict, client: dict) -> str:
    # Port of build_socratic_user_message — paste exact format from backend prompts.py
    return (
        f"Problem: {server.get('problem_prompt', '')}\n\n"
        f"Student code:\n```\n{client.get('student_code', '')}\n```\n\n"
        f"stdout: {client.get('stdout') or '(none)'}\n"
        f"stderr: {client.get('stderr') or '(none)'}\n"
        f"Attempt #{client.get('attempt_count', 1)}"
    )


def _understanding(server: dict, client: dict) -> str:
    # Port of build_understanding_check_user_message
    return (
        f"Rubric: {server.get('rubric', '')}\n\n"
        f"Student response: {client.get('response', '')}\n"
        f"Attempt #{client.get('attempt_number', 1)}"
    )


def _ask(server: dict, client: dict) -> str:
    # Port of build_ask_user_message
    chunks = "\n---\n".join(server.get("chunks", []))
    block_context = server.get("block_context")
    parts = [f"Context:\n{chunks}"]
    if block_context:
        parts.append(f"Current block: {block_context}")
    parts.append(f"Question: {client.get('question', '')}")
    return "\n\n".join(parts)


_BUILDERS = {
    "socratic": _socratic,
    "understanding-check": _understanding,
    "ask": _ask,
}


def build_user_message(agent: str, server_context: dict, client_context: dict) -> str:
    return _BUILDERS[agent](server_context, client_context)
```

> IMPLEMENTER: replace the placeholder bodies above with the EXACT string formats from `backend/app/features/tutor/prompts.py` so output matches current behavior. Then update the asserts only if the real format differs.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/unit/test_reasoning.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add ai_server/app/runtime/reasoning.py ai_server/tests/unit/test_reasoning.py
git commit -m "feat(ai-server): reasoning message builders"
```

---

### Task 15: `/reason` SSE endpoint — token stream

**Files:**
- Create: `ai_server/app/transport/reason_routes.py`
- Modify: `ai_server/app/transport/router.py`
- Test: `ai_server/tests/integration/test_reason.py`

- [ ] **Step 1: Write the failing test**

```python
import app.transport.reason_routes as reason_routes
from app.security.session_token import mint_session_token


def _token(agent, server_context):
    return mint_session_token(agent, server_context, signing_secret="sign-secret", ttl_seconds=300)


async def test_reason_requires_session_token(client):
    resp = await client.post("/v1/reason", json={"client_context": {}})
    assert resp.status_code == 401


async def test_reason_streams_tokens(client, monkeypatch):
    async def fake_stream(agent, user_message):
        for t in ["Hel", "lo"]:
            yield t

    monkeypatch.setattr(reason_routes, "run_stream", fake_stream)
    token = _token("socratic", {"problem_prompt": "p"})
    resp = await client.post(
        "/v1/reason",
        json={"client_context": {"student_code": "x", "stdout": "", "stderr": "", "attempt_count": 1}},
        headers={"authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.text
    assert "Hel" in body and "lo" in body
    assert "token" in body  # event name present
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/integration/test_reason.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/transport/reason_routes.py`**

```python
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.agents.registry import get_agent
from app.runtime.executor import run_stream
from app.runtime.reasoning import build_user_message
from app.security.session_token import require_session_claims

router = APIRouter()


class ReasonRequest(BaseModel):
    client_context: dict = {}


@router.post("/reason")
async def reason_endpoint(
    body: ReasonRequest,
    claims: dict = Depends(require_session_claims),
) -> EventSourceResponse:
    agent_name = claims["agent"]
    server_context = claims.get("server_context", {})
    agent = get_agent(agent_name)
    user_message = build_user_message(agent_name, server_context, body.client_context)

    async def _events() -> AsyncGenerator[dict, None]:
        try:
            async for chunk in run_stream(agent, user_message):
                yield {"event": "token", "data": chunk}
            yield {"event": "done", "data": ""}
        except Exception:
            yield {"event": "error", "data": "AI temporarily unavailable"}

    return EventSourceResponse(_events())
```

- [ ] **Step 4: Wire into `app/transport/router.py`**

```python
from app.transport.reason_routes import router as reason_router

v1.include_router(reason_router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ai_server && pytest tests/integration/test_reason.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add ai_server/app/transport/reason_routes.py ai_server/app/transport/router.py ai_server/tests/integration/test_reason.py
git commit -m "feat(ai-server): /v1/reason SSE token stream"
```

---

### Task 16: `/reason` signed result event for understanding-check & ask

**Files:**
- Modify: `ai_server/app/transport/reason_routes.py`
- Test: `ai_server/tests/integration/test_reason_result.py`

- [ ] **Step 1: Write the failing test**

```python
import json

import app.transport.reason_routes as reason_routes
from app.security.session_token import mint_session_token
from app.security.result_signing import verify_result


async def test_understanding_emits_signed_result(client, monkeypatch):
    async def fake_stream(agent, user_message):
        # Model returns a JSON first line then prose (mirrors current backend behavior)
        yield '{"level": "good", "feedback": "Nice", "missing_points": []}'

    monkeypatch.setattr(reason_routes, "run_stream", fake_stream)
    token = mint_session_token(
        "understanding-check", {"rubric": "r"}, signing_secret="sign-secret", ttl_seconds=300
    )
    resp = await client.post(
        "/v1/reason",
        json={"client_context": {"response": "answer", "attempt_number": 1}},
        headers={"authorization": f"Bearer {token}"},
    )
    text = resp.text
    # find the signed result line
    signed = None
    for line in text.splitlines():
        if line.startswith("data: ") and "." in line:  # JWT has dots
            candidate = line[len("data: "):].strip()
            try:
                payload = verify_result(candidate, signing_secret="sign-secret")
            except Exception:
                continue
            signed = payload
    assert signed is not None
    assert signed["passed"] is True
    assert signed["level"] == "good"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai_server && pytest tests/integration/test_reason_result.py -v`
Expected: FAIL — no signed result emitted yet.

- [ ] **Step 3: Update `app/transport/reason_routes.py`** to accumulate text and, for `understanding-check` and `ask`, emit a signed `result` event before `done`.

```python
import json

from app.config import get_settings
from app.security.result_signing import sign_result

LEVEL_ORDER = {"poor": 0, "fair": 1, "good": 2, "excellent": 3}
PASS_THRESHOLD = 2


def _build_result(agent_name: str, accumulated: str, client_context: dict) -> dict | None:
    if agent_name == "understanding-check":
        first_line = accumulated.strip().splitlines()[0] if accumulated.strip() else "{}"
        try:
            parsed = json.loads(first_line)
        except json.JSONDecodeError:
            parsed = {}
        level = parsed.get("level", "poor")
        level = level if level in LEVEL_ORDER else "poor"
        return {
            "level": level,
            "passed": LEVEL_ORDER[level] >= PASS_THRESHOLD,
            "feedback": parsed.get("feedback", accumulated),
            "missing_points": parsed.get("missing_points", []),
        }
    if agent_name == "ask":
        return {
            "question": client_context.get("question", ""),
            "answer": accumulated,
        }
    return None
```

Then update the `_events` generator:

```python
    async def _events() -> AsyncGenerator[dict, None]:
        accumulated = ""
        try:
            async for chunk in run_stream(agent, user_message):
                accumulated += chunk
                yield {"event": "token", "data": chunk}
            result = _build_result(agent_name, accumulated, body.client_context)
            if result is not None:
                signed = sign_result(result, get_settings().session_signing_secret)
                yield {"event": "result", "data": signed}
            yield {"event": "done", "data": ""}
        except Exception:
            yield {"event": "error", "data": "AI temporarily unavailable"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ai_server && pytest tests/integration/test_reason_result.py -v`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `cd ai_server && pytest -v`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add ai_server/app/transport/reason_routes.py ai_server/tests/integration/test_reason_result.py
git commit -m "feat(ai-server): signed result events for understanding-check and ask"
```

---

### Task 17: `/speak` endpoint (Gemini TTS audio stream)

**Files:**
- Create: `ai_server/app/transport/speak_routes.py`
- Modify: `ai_server/app/providers/gemini_provider.py` (add `synthesize_speech`)
- Modify: `ai_server/app/transport/router.py`
- Test: `ai_server/tests/integration/test_speak.py`

> CONFIRM at implementation time: the exact `google-genai` TTS call + model name from the `claude-api`/google-genai docs. The structure below isolates that call in `synthesize_speech` so only one function changes if the SDK differs.

- [ ] **Step 1: Add `synthesize_speech` to `app/providers/gemini_provider.py`**

```python
from collections.abc import AsyncGenerator


async def synthesize_speech(text: str) -> AsyncGenerator[bytes, None]:
    # IMPLEMENTER: replace with the real google-genai TTS streaming call.
    # Must yield audio byte chunks. Keep this the ONLY place SDK specifics live.
    stream = await gemini_client.aio.models.generate_content_stream(
        model="gemini-2.5-flash-preview-tts",
        contents=text,
    )
    async for part in stream:
        data = getattr(part, "audio", None)
        if data:
            yield data
```

- [ ] **Step 2: Write the failing test** — `tests/integration/test_speak.py`

```python
import app.transport.speak_routes as speak_routes
from app.security.session_token import mint_session_token


async def test_speak_requires_session_token(client):
    resp = await client.post("/v1/speak", json={"text": "hello"})
    assert resp.status_code == 401


async def test_speak_streams_audio(client, monkeypatch):
    async def fake_tts(text):
        yield b"\x00\x01"
        yield b"\x02\x03"

    monkeypatch.setattr(speak_routes, "synthesize_speech", fake_tts)
    token = mint_session_token("ask", {}, signing_secret="sign-secret", ttl_seconds=300)
    resp = await client.post(
        "/v1/speak",
        json={"text": "hello"},
        headers={"authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.content == b"\x00\x01\x02\x03"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ai_server && pytest tests/integration/test_speak.py -v`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `app/transport/speak_routes.py`**

```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.providers.gemini_provider import synthesize_speech
from app.security.session_token import require_session_claims

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str


@router.post("/speak")
async def speak_endpoint(
    body: SpeakRequest,
    claims: dict = Depends(require_session_claims),
) -> StreamingResponse:
    return StreamingResponse(synthesize_speech(body.text), media_type="audio/mpeg")
```

- [ ] **Step 5: Wire into `app/transport/router.py`**

```python
from app.transport.speak_routes import router as speak_router

v1.include_router(speak_router)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd ai_server && pytest tests/integration/test_speak.py -v`
Expected: PASS (2 passed)

- [ ] **Step 7: Commit**

```bash
git add ai_server/app/transport/speak_routes.py ai_server/app/providers/gemini_provider.py ai_server/app/transport/router.py ai_server/tests/integration/test_speak.py
git commit -m "feat(ai-server): /v1/speak Gemini TTS audio stream"
```

---

## Phase 4 — Next.js rewiring (consume the AI server)

> Next holds `AI_SERVER_URL` and `AI_SERVICE_SECRET` (server-only env, never `NEXT_PUBLIC_`). The browser calls Next routes (Clerk-authed); Next assembles context, mints a session via the AI server, returns `{ai_server_url, session_token}` to the browser; the browser opens the stream directly to the AI server.

### Task 18: Server-only AI-server client

**Files:**
- Create: `frontend/shared/api/ai-server.ts`

- [ ] **Step 1: Write `frontend/shared/api/ai-server.ts`**

```typescript
import "server-only";

const AI_SERVER_URL = process.env.AI_SERVER_URL!;
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET!;

function headers() {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${AI_SERVICE_SECRET}`,
  };
}

export async function mintSession(agent: string, serverContext: unknown): Promise<{ session_token: string; expires_in: number }> {
  const res = await fetch(`${AI_SERVER_URL}/v1/session`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ agent, server_context: serverContext }),
  });
  if (!res.ok) throw new Error(`session mint failed: ${res.status}`);
  return res.json();
}

export async function runAgent(agent: string, userMessage: string): Promise<{ text: string }> {
  const res = await fetch(`${AI_SERVER_URL}/v1/run`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ agent, user_message: userMessage }),
  });
  if (!res.ok) throw new Error(`run failed: ${res.status}`);
  return res.json();
}

export async function embedTexts(texts: string[]): Promise<{ vectors: number[][] }> {
  const res = await fetch(`${AI_SERVER_URL}/v1/embed`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status}`);
  return res.json();
}

export const aiServerPublicUrl = AI_SERVER_URL;
```

- [ ] **Step 2: Add env entries** to `frontend/.env.example` (create if missing) and your local `.env`:

```
AI_SERVER_URL=http://localhost:8001
AI_SERVICE_SECRET=change-me-shared-static-secret
```

- [ ] **Step 3: Commit**

```bash
git add frontend/shared/api/ai-server.ts frontend/.env.example
git commit -m "feat(frontend): server-only AI-server client"
```

---

### Task 19: Signed-result verifier (Next side)

**Files:**
- Create: `frontend/shared/lib/result-events.ts`

- [ ] **Step 1: Write `frontend/shared/lib/result-events.ts`** — verifies the AI server's signed result blob using the shared signing secret. Use the `jose` library (add it: `cd frontend && npm install jose`).

```typescript
import "server-only";
import { jwtVerify } from "jose";

const SIGNING_SECRET = new TextEncoder().encode(process.env.SESSION_SIGNING_SECRET!);

export async function verifyResultEvent<T = unknown>(token: string): Promise<T> {
  const { payload } = await jwtVerify(token, SIGNING_SECRET, { algorithms: ["HS256"] });
  return (payload as { result: T }).result;
}
```

- [ ] **Step 2: Add env entry** to `frontend/.env.example` and local `.env`:

```
SESSION_SIGNING_SECRET=change-me-jwt-signing-secret
```

- [ ] **Step 3: Commit**

```bash
git add frontend/shared/lib/result-events.ts frontend/package.json frontend/package-lock.json frontend/.env.example
git commit -m "feat(frontend): signed result-event verifier"
```

---

### Task 20: Rewire `run_code` AI eval to `/run`

**Files:**
- Modify: the Next route that runs code. Locate it: `cd frontend && grep -rn "judge0\|/run\|needs_ai_eval\|expected_output" app/api features --include=*.ts | head`. (Per api-audit, code execution currently routes through the backend; this task moves the AI eval hop to the AI server while keeping Judge0 in Next.)

- [ ] **Step 1: Identify the handler** that calls Judge0 and decides the verdict. Confirm where `needs_ai_eval` is determined.

- [ ] **Step 2: Replace the AI-eval call** — where the code previously asked Anthropic "is this correct?", call:

```typescript
import { runAgent } from "@/shared/api/ai-server";

// when verdict needs AI eval:
const prompt = `Problem: ${problemPrompt}\n\nStudent code:\n\`\`\`\n${code}\n\`\`\`\n\nstdout: ${stdout || "(none)"}\n\nIs this correct?`;
const { text } = await runAgent("code-eval", prompt);
let verdict: "passed" | "failed" = "failed";
try {
  verdict = JSON.parse(text).verdict === "passed" ? "passed" : "failed";
} catch {
  verdict = "failed";
}
```

- [ ] **Step 3: Verify** by running the frontend dev server and exercising a code block whose verdict needs AI eval. Confirm the verdict resolves and the submission is written to the DB.

Run: `cd frontend && npm run dev` — then exercise the code-run flow in the browser.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api frontend/features
git commit -m "feat(frontend): route code-eval through AI server /run"
```

---

### Task 21: Rewire `agent-edit` to `/run`

**Files:**
- Modify: the Next route/action handling builder agent-edit. Locate: `cd frontend && grep -rn "agent-edit\|agent_edit\|agentEdit" app features --include=*.ts --include=*.tsx | head`.

- [ ] **Step 1: Build the blocks JSON** server-side (load blocks from DB as the backend did) and call:

```typescript
import { runAgent } from "@/shared/api/ai-server";

const blocksJson = JSON.stringify(blocks.map(b => ({ id: b.id, position: b.position, type: b.type, content: b.content })), null, 2);
const { text } = await runAgent("agent-edit", `Current blocks:\n${blocksJson}\n\nInstruction: ${message}`);
const parsed = JSON.parse(text); // { reply, blocks }
// apply parsed.blocks content back to DB (only content, keep ids), then return parsed.reply + refreshed blocks
```

- [ ] **Step 2: Persist** the updated block contents to the DB in Next (the AI server does not write).

- [ ] **Step 3: Verify** in the browser: open a lesson in the builder, send an agent edit, confirm blocks update and persist.

- [ ] **Step 4: Commit**

```bash
git add frontend/app frontend/features
git commit -m "feat(frontend): route agent-edit through AI server /run"
```

---

### Task 22: Rewire tutor streams (socratic / understanding-check / ask)

**Files:**
- Create/Modify: Next route handlers for `socratic-hint`, `understanding-check`, `ask` that (1) Clerk-auth, (2) assemble server_context, (3) mint a session, (4) return `{ ai_url, session_token }` to the browser.
- Modify: `frontend/features/tutor/hooks/use-sse-stream.ts` to handle the `result` event and POST it to a Next verify endpoint.
- Modify: `frontend/features/tutor/actions/get-socratic-hint.ts` (and equivalents) to first call the Next mint route, then stream from the AI server.

- [ ] **Step 1: Write the mint route** (example for ask) — `frontend/app/api/enrollments/[id]/ask/route.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { mintSession, embedTexts, aiServerPublicUrl } from "@/shared/api/ai-server";
// ... DB imports for enrollment ownership + pgvector search

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { id: enrollmentId } = await params;
  const { question, blockId } = await req.json();

  // ownership + course scope check (DB)
  // RAG: embed question via AI server, cosine search own DB
  const { vectors } = await embedTexts([question]);
  const chunks = await searchChunks(courseId, vectors[0], 5); // pgvector cosine in Next DB
  const serverContext = { chunks: chunks.map(c => c.content), block_context: blockContext };

  const { session_token, expires_in } = await mintSession("ask", serverContext);
  return Response.json({ ai_url: `${aiServerPublicUrl}/v1/reason`, session_token, expires_in });
}
```

> Apply the same shape to socratic-hint (server_context = `{problem_prompt}` from last submission+block) and understanding-check (server_context = `{rubric}`). All secret context goes in `server_context`; nothing secret is returned to the browser.

- [ ] **Step 2: Update the SSE hook** `use-sse-stream.ts` — recognize `event: result` and surface the raw signed blob to the caller (add a `result` field to the returned state). Keep the existing `token` handling. After stream end, the caller POSTs the signed blob to a Next verify endpoint that calls `verifyResultEvent` and writes the attempt/question to the DB.

- [ ] **Step 3: Update the tutor actions** to two-step: `POST` the Next mint route → receive `{ ai_url, session_token }` → call `execute(ai_url, { method: "POST", headers: { authorization: \`Bearer ${session_token}\` }, body: JSON.stringify({ client_context }) })`.

- [ ] **Step 4: Write the verify+persist route** — `frontend/app/api/tutor/result/route.ts`: Clerk-auth, `verifyResultEvent(blob)`, then write the understanding-check attempt or question row to the DB.

- [ ] **Step 5: Verify** end-to-end in the browser for all three: socratic hint streams; understanding-check streams + persists pass/level; ask streams + persists Q&A. Confirm no secret (rubric/chunks) appears in browser network payloads except inside the opaque session token.

- [ ] **Step 6: Commit**

```bash
git add frontend/app frontend/features
git commit -m "feat(frontend): tutor streams via AI server with session tokens + signed results"
```

---

## Phase 5 — trigger.dev course-generation pipeline

### Task 23: Initialize trigger.dev workspace

**Files:**
- Create: `jobs/` workspace via the trigger.dev CLI.

- [ ] **Step 1:** Evaluate trigger.dev vs Inngest (~30 min) per spec §13, then init the chosen tool. For trigger.dev:

Run: `mkdir jobs && cd jobs && npx trigger.dev@latest init`
Follow prompts; set project ref. Confirm `jobs/trigger.config.ts` created.

- [ ] **Step 2: Add env** (`jobs/.env`): `AI_SERVER_URL`, `AI_SERVICE_SECRET`, `DATABASE_URL`. NO provider keys.

- [ ] **Step 3: Commit**

```bash
git add jobs/trigger.config.ts jobs/package.json jobs/.env.example
git commit -m "chore(jobs): initialize trigger.dev workspace"
```

---

### Task 24: DB client for jobs

**Files:**
- Create: `jobs/src/db.ts`

- [ ] **Step 1:** Set up a DB client matching the Next schema (Supabase/postgres). Mirror the connection the frontend uses. Export query helpers: `insertChunks`, `updateCoursePhase`, `insertLessons`, `insertBlocks`, `setCourseReady`, `setCourseFailed`.

> IMPLEMENTER: reuse the same ORM/driver the Next backend uses against Supabase so the schema and types match. Keep raw SQL if that is simpler and matches existing tables (`course_chunks`, `lessons`, `blocks`, `courses`).

- [ ] **Step 2: Commit**

```bash
git add jobs/src/db.ts
git commit -m "feat(jobs): DB client and write helpers"
```

---

### Task 25: `generate-course` durable task

**Files:**
- Create: `jobs/src/generate-course.ts`
- Reference: port the phases from `backend/app/features/authoring/pipeline.py` (download PDF → extract → chunk → embed → outline → blocks). **Drop the TTS phase entirely.**

- [ ] **Step 1: Implement the task** with trigger.dev's task API. Phases, each updating `generation_phase` in the DB:
  1. `extracting`: download `source_pdf_url` (fetch), extract text (use `pdf-parse` or `unpdf` in TS), fail with "OCR not supported in V1" if empty.
  2. `embedding`: chunk text (~1000 chars on word boundary, same as Python), call AI `/embed` in **batches**, `insertChunks`.
  3. `outline`: call AI `/run` agent `outline` with `pdf_text[:100000]`; parse JSON; set course title/description/total_lessons; `insertLessons`.
  4. `blocks`: for each lesson, call AI `/run` agent `generate-blocks`; parse; `insertBlocks`. Use trigger.dev concurrency controls (replaces `asyncio.Semaphore(5)`).
  5. Set `total_blocks`, then `setCourseReady`. **No `tts` phase.**
  On any failure: `setCourseFailed(error)`.

> Use trigger.dev's built-in retries for the AI `/run` and `/embed` calls (replaces `retry_async`).

- [ ] **Step 2: Enqueue from Next** — replace the old "start generation" call (`create-course` action / authoring route) with a trigger.dev task trigger. Locate: `cd frontend && grep -rn "run_generation_pipeline\|create-course\|generation" app features --include=*.ts | head`.

- [ ] **Step 3: Verify** — trigger a course generation from the browser; watch the trigger.dev run dashboard step through phases; confirm chunks/lessons/blocks land in the DB and status → ready, with no audio generated.

- [ ] **Step 4: Commit**

```bash
git add jobs/src/generate-course.ts frontend/app frontend/features
git commit -m "feat(jobs): course-generation pipeline on trigger.dev (no TTS)"
```

---

## Phase 6 — Cleanup & decommission

### Task 26: Remove old AI code + TTS from backend/frontend

**Files:**
- Delete: `frontend/app/api/tts/stream/route.ts`
- Modify/Delete: backend AI code now served by the AI server (`backend/app/features/tutor/service.py` AI parts, `builder/service.py:agent_edit`, `authoring/pipeline.py`, `shared/ai/*`, `shared/rag/retriever.py` embed). Keep DB models, Judge0 client, Clerk, and non-AI routes.

- [ ] **Step 1: Delete the old TTS route.**

```bash
git rm frontend/app/api/tts/stream/route.ts
```

- [ ] **Step 2: Remove the TTS audio hook usage** if `frontend/features/tutor/hooks/use-tts-audio.ts` points at the removed route; repoint it to the new `/speak` mint flow (mirror Task 22's mint pattern with agent context = none, server_context `{}`), or remove if not yet wired.

- [ ] **Step 3: Remove dead backend AI modules** that have been fully replaced. For anything still referenced by a live non-AI route, leave it. Verify nothing imports the deleted modules:

Run: `cd backend && grep -rn "shared.ai\|shared.rag\|authoring.pipeline" app --include=*.py`
Expected: no references from live routes (or refactor those routes to call the AI server).

- [ ] **Step 4: Remove provider keys from Next/jobs env** and confirm they exist ONLY in `ai_server/.env`. Grep:

Run: `grep -rn "ANTHROPIC_API_KEY\|OPENAI_API_KEY\|GEMINI_API_KEY" frontend jobs --include=*.ts --include=*.example 2>/dev/null`
Expected: no provider keys outside `ai_server/`.

- [ ] **Step 5: Run all test suites.**

Run: `cd ai_server && pytest -v` then `cd ../backend && pytest -v` then `cd ../frontend && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: decommission old AI code and pre-gen TTS; isolate provider keys to AI server"
```

---

### Task 27: Verify AI server has zero DB / Clerk coupling

**Files:**
- Inspect: `ai_server/`

- [ ] **Step 1: Grep for forbidden coupling.**

Run: `cd ai_server && grep -rn "sqlalchemy\|asyncpg\|clerk\|database_url\|DATABASE_URL\|SessionLocal" app`
Expected: NO matches. The AI server must not import DB or Clerk.

- [ ] **Step 2: Confirm provider keys are the only secrets** and there is no DB env in `ai_server/.env.example`.

- [ ] **Step 3: Run the full AI-server suite once more.**

Run: `cd ai_server && pytest -v`
Expected: all pass.

- [ ] **Step 4:** No code change expected; if grep finds coupling, fix it before committing. If a fix was needed:

```bash
git add ai_server
git commit -m "chore(ai-server): remove DB/Clerk coupling"
```

---

## Phase 7 — Lift to new repo

### Task 28: Extract `ai_server/` to a fresh repository

> This is an ops task, not code. No tests.

- [ ] **Step 1:** Create the new repo (e.g. `ai-service`). Decide history strategy: clean copy (simplest) or `git subtree split --prefix=ai_server` to preserve history.

- [ ] **Step 2:** Copy `ai_server/` contents to the new repo root. Add a `Dockerfile` (uvicorn entrypoint: `uvicorn app.main:app --host 0.0.0.0 --port 8001`).

- [ ] **Step 3:** Deploy to GCP Cloud Run (or AWS ECS/Fargate). Set env: `AI_SERVICE_SECRET`, `SESSION_SIGNING_SECRET`, provider keys. Confirm `/v1/healthz` responds.

- [ ] **Step 4:** Point Next `AI_SERVER_URL` and the browser stream URL at the deployed service. Update CORS on the AI server to allow the browser origin for `/v1/reason` and `/v1/speak` (add `CORSMiddleware` allowing the frontend origin; only the two stream endpoints need browser CORS).

- [ ] **Step 5:** Smoke-test all flows against the deployed AI server: code-eval, agent-edit, all three tutor streams, TTS, and a full course generation via trigger.dev.

---

## Self-Review

**Spec coverage** (spec §-by-§):
- §1 boundary → enforced by Task 27 (no DB/Clerk in AI server) + Task 26 (keys isolated). ✓
- §2 topology (3 surfaces) → AI server (Phases 1–3), Next (Phase 4), trigger.dev (Phase 5). ✓
- §3 two credentials → service secret (Task 3), session token (Tasks 2, 13). ✓
- §3 secret-context sealing → server_context in token (Task 12), merged in `/reason` (Tasks 15–16). ✓
- §4 API (`/session /reason /speak /run /embed /healthz`) → Tasks 5, 9, 11, 12, 15–17. ✓
- §5 agent registry → Tasks 6–7. ✓
- §6 layering → transport/security/agents/runtime/providers dirs across Phases 1–3. ✓
- §7 deferral (no tool loop, single-turn) → executor is single-turn (Task 10); no tool registry built. ✓
- §8 AI-never-writes → signed results (Tasks 4, 16, 19, 22), trigger.dev writes (Tasks 24–25). ✓
- §9 per-feature flows → run_code (20), agent-edit (21), tutor streams (22), TTS (17/26), pipeline (25); concept-check/lesson-blocks stay in Next (Task 26 leaves them). ✓
- §10 removals → TTS route + pre-gen (Task 26), Clerk not in AI server (Task 27). ✓
- §11 scalability (versioned, registry-as-config, adapters, batch embed) → `/v1` prefix (Task 5), registry (Task 7), providers (Task 8), batch `/embed` (Task 9). ✓
- §12 migration order → Phases map 1:1. ✓
- §13 risks → trigger.dev-vs-Inngest evaluation (Task 23), constant-time compare (Task 3 uses `hmac.compare_digest`). ✓

**Placeholder scan:** prompt bodies (Task 6), reasoning formats (Task 14), Gemini TTS call (Task 17), and DB helpers (Task 24) are explicitly marked "port exact text/signature from <source>" — these are deliberate copy-from-source instructions, not vague placeholders, each naming the exact source file. Implementer must paste real content.

**Type/name consistency:** `mint_session_token`/`verify_session_token`/`require_session_claims` (security), `run_json`/`run_stream` (executor), `build_user_message` (reasoning), `sign_result`/`verify_result` (signing), `embed_texts`/`synthesize_speech`/`anthropic_client` (providers), `get_agent`/`AgentDef`/`AGENTS` (registry) — referenced consistently across tasks. Event names `token`/`result`/`done`/`error` consistent between Task 15/16 and the Next hook (Task 22).
