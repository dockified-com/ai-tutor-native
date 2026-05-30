# AI Native Tutor — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the foundational project structure for both frontend and backend, with Clerk authentication working end-to-end and user records lazily provisioned in our database. Establish the feature-based folder structure with strict module boundaries enforced by ESLint.

**Architecture:** Feature-based codebase per design spec §3. Frontend uses Clerk for auth UI + JWT issuance; FastAPI backend verifies Clerk JWTs (using Clerk's JWKS public keys) and lazily creates `users` rows on first authenticated request. Local dev runs Postgres 16 + pgvector via docker-compose. Production deployment is Phase 8.

**Tech stack:**
- **Frontend** — Next.js 16, TypeScript, Tailwind v4, shadcn/ui, `@clerk/nextjs`, Zustand, ESLint with `eslint-plugin-boundaries`
- **Backend** — FastAPI, Python 3.12, `pydantic`, `pydantic-settings`, `sqlalchemy[asyncio]`, `asyncpg`, `pgvector`, `httpx`, `pyjwt[crypto]`, `alembic`, `pytest`, `pytest-asyncio`
- **Local infra** — `docker-compose` with Postgres 16 + pgvector
- **External** — Clerk Free tier (sign up at clerk.com, create a new application)

**Phase 1 deliverable (testable):**
- A user can sign up / sign in via Clerk's hosted components
- After sign-in, they land on `/dashboard` showing an empty state
- The backend's `/api/me` endpoint returns the user's app row (creating it on first hit if missing)
- A Clerk webhook keeps `email` and `display_name` in sync
- ESLint blocks any cross-feature import on the frontend
- Backend runs in Docker locally with hot-reload; tests pass

**Out of Phase 1 (deferred to later phases):** course/lesson/block CRUD, AI integration, code execution, RAG, audio, real dashboard content, deployment to a VPS.

> **Next.js 16 caveat:** `frontend/AGENTS.md` warns this Next.js may differ from training-data conventions. Before writing any route file in this plan, briefly check `frontend/node_modules/next/dist/docs/` for deprecation notices. If you find a conflict, follow the docs and adjust the step.

---

## File map

**Backend (`backend/`):**

```
backend/
├── pyproject.toml                                  Project + deps
├── alembic.ini                                     Alembic config
├── Dockerfile                                      Multi-stage runtime image
├── docker-compose.dev.yml                          Local: backend + Postgres + pgvector
├── .env.example                                    Required env vars (no secrets)
├── alembic/
│   ├── env.py                                      Alembic env (async)
│   ├── script.py.mako
│   └── versions/
│       └── 0001_create_users.py                    First migration: users table
├── app/
│   ├── __init__.py
│   ├── main.py                                     FastAPI app factory
│   ├── shared/
│   │   ├── __init__.py
│   │   ├── config.py                               Pydantic Settings
│   │   ├── db.py                                   Async SQLAlchemy engine + session
│   │   ├── deps.py                                 FastAPI deps (current_user, db_session)
│   │   ├── errors.py                               Exception classes + handlers
│   │   └── logging.py                              JSON logger
│   └── features/
│       ├── __init__.py
│       └── auth/
│           ├── __init__.py                         Public exports for the auth feature
│           ├── routes.py                           /api/me, /api/auth/clerk-webhook
│           ├── service.py                          User provisioning logic
│           ├── clerk.py                            Clerk JWT verification (JWKS)
│           ├── models.py                           SQLAlchemy User model
│           └── schemas.py                          Pydantic request/response schemas
└── tests/
    ├── __init__.py
    ├── conftest.py                                 pytest fixtures (test DB, app client)
    ├── unit/
    │   └── test_clerk_jwt.py                       JWT verification tests
    └── integration/
        ├── test_me_endpoint.py                     /api/me lazy provisioning
        └── test_clerk_webhook.py                   Webhook signature + sync
```

**Frontend (`frontend/`):**

```
frontend/
├── package.json                                    Add Clerk + boundaries plugin + zustand
├── eslint.config.mjs                               Boundaries rules
├── middleware.ts                                   Clerk middleware (project root, NOT in app/)
├── .env.local.example
├── app/
│   ├── layout.tsx                                  Wrap with <ClerkProvider>
│   ├── page.tsx                                    Landing — redirect signed-in users to /dashboard
│   ├── globals.css
│   ├── (auth)/
│   │   ├── sign-in/[[...rest]]/page.tsx            Clerk sign-in catch-all
│   │   └── sign-up/[[...rest]]/page.tsx            Clerk sign-up catch-all
│   └── dashboard/
│       └── page.tsx                                Empty-state dashboard
├── features/
│   └── auth/
│       ├── components/
│       │   └── user-menu.tsx                       Internal — re-exported via index.ts
│       ├── hooks/
│       │   └── use-app-user.ts                     Wraps Clerk's useUser + /api/me
│       └── index.ts                                Public API for the auth feature
└── shared/
    ├── api/
    │   └── client.ts                               Authenticated fetch wrapper
    ├── ui/                                         shadcn/ui re-exports (added per-component when needed)
    └── components/
        └── app-shell.tsx                           Layout with header + content slot
```

---

## Task 1.1: Backend — pyproject and scaffold

**Files:**
- Delete: `backend/requirements.txt`, `backend/venv/`
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`, `backend/app/main.py`
- Create: `backend/app/shared/__init__.py`, `backend/app/features/__init__.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/.gitignore`

- [ ] **Step 1: Remove stale Python artifacts**

```bash
cd /home/yeakkhai/Desktop/ai-tutor-native/backend
rm -rf venv requirements.txt
```

- [ ] **Step 2: Create `backend/pyproject.toml`**

```toml
[project]
name = "ai-tutor-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.118",
  "uvicorn[standard]>=0.32",
  "pydantic>=2.10",
  "pydantic-settings>=2.7",
  "sqlalchemy[asyncio]>=2.0",
  "asyncpg>=0.30",
  "pgvector>=0.3",
  "httpx>=0.28",
  "pyjwt[crypto]>=2.10",
  "alembic>=1.14",
  "python-multipart>=0.20",
  "svix>=1.40",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.4",
  "pytest-asyncio>=0.25",
  "pytest-cov>=6.0",
  "httpx>=0.28",
  "ruff>=0.9",
  "mypy>=1.14",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"
```

- [ ] **Step 3: Create `backend/.gitignore`**

```
__pycache__/
*.pyc
.venv/
.env
.env.local
.pytest_cache/
.mypy_cache/
.coverage
htmlcov/
*.egg-info/
```

- [ ] **Step 4: Create `backend/.env.example`**

```bash
# App
APP_ENV=development
LOG_LEVEL=INFO

# Database (local dev: docker-compose Postgres)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tutor

# Clerk — fill in from clerk.com dashboard
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://...clerk.accounts.dev/.well-known/jwks.json
CLERK_WEBHOOK_SECRET=whsec_...
```

- [ ] **Step 5: Create empty package files**

```bash
touch backend/app/__init__.py backend/app/shared/__init__.py backend/app/features/__init__.py backend/tests/__init__.py
```

- [ ] **Step 6: Create `backend/app/main.py` (minimal app factory)**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup hooks go here in later tasks (DB warmup, etc.)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="AI Tutor Backend", lifespan=lifespan)

    @app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    return app


app = create_app()
```

- [ ] **Step 7: Install deps and run server smoke check**

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

Expected: server boots; `curl http://localhost:8000/healthz` returns `{"status":"ok"}`. Stop the server (Ctrl+C).

- [ ] **Step 8: Commit**

```bash
git add backend/pyproject.toml backend/.env.example backend/.gitignore backend/app/ backend/tests/__init__.py
git commit -m "feat(backend): scaffold FastAPI project with feature-based layout"
```

---

## Task 1.2: Backend — shared/config (Pydantic Settings)

**Files:**
- Create: `backend/app/shared/config.py`
- Create: `backend/tests/unit/__init__.py`
- Create: `backend/tests/unit/test_config.py`

- [ ] **Step 1: Write the failing test `backend/tests/unit/test_config.py`**

```python
import os
from app.shared.config import Settings


def test_settings_loads_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test/db")
    monkeypatch.setenv("CLERK_PUBLISHABLE_KEY", "pk_test_x")
    monkeypatch.setenv("CLERK_SECRET_KEY", "sk_test_x")
    monkeypatch.setenv("CLERK_JWKS_URL", "https://example/jwks")
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", "whsec_x")

    settings = Settings()

    assert settings.database_url == "postgresql+asyncpg://test/db"
    assert settings.clerk_publishable_key == "pk_test_x"
    assert settings.clerk_jwks_url == "https://example/jwks"
    assert settings.app_env == "development"  # default
```

- [ ] **Step 2: Run the test (expect failure: module doesn't exist)**

```bash
cd backend && pytest tests/unit/test_config.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.shared.config'`.

- [ ] **Step 3: Implement `backend/app/shared/config.py`**

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str

    clerk_publishable_key: str
    clerk_secret_key: str
    clerk_jwks_url: str
    clerk_webhook_secret: str


def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
pytest tests/unit/test_config.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/shared/config.py backend/tests/unit/
git commit -m "feat(backend): add Settings via pydantic-settings"
```

---

## Task 1.3: Backend — Postgres + pgvector via docker-compose (local dev)

**Files:**
- Create: `backend/docker-compose.dev.yml`

- [ ] **Step 1: Create `backend/docker-compose.dev.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_tutor
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

- [ ] **Step 2: Start Postgres and verify pgvector is available**

```bash
cd backend
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Expected: `postgres` service is `healthy` after a few seconds.

- [ ] **Step 3: Verify pgvector extension can be created**

```bash
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -d ai_tutor -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

Expected: output includes `vector` row.

- [ ] **Step 4: Commit**

```bash
git add backend/docker-compose.dev.yml
git commit -m "infra(backend): add docker-compose for local Postgres + pgvector"
```

---

## Task 1.4: Backend — shared/db (async SQLAlchemy engine + session)

**Files:**
- Create: `backend/app/shared/db.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/integration/__init__.py`

- [ ] **Step 1: Implement `backend/app/shared/db.py`**

```python
from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.shared.config import get_settings


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


_settings = get_settings()
engine = create_async_engine(_settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
```

- [ ] **Step 2: Create `backend/tests/conftest.py`**

```python
import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Force test env BEFORE importing app
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tutor_test")
os.environ.setdefault("CLERK_PUBLISHABLE_KEY", "pk_test_x")
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_x")
os.environ.setdefault("CLERK_JWKS_URL", "https://example.invalid/jwks")
os.environ.setdefault("CLERK_WEBHOOK_SECRET", "whsec_x")

from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

- [ ] **Step 3: Create test database**

```bash
docker compose -f backend/docker-compose.dev.yml exec postgres \
  psql -U postgres -c "CREATE DATABASE ai_tutor_test;"
```

Expected: `CREATE DATABASE` (or "already exists" — fine).

- [ ] **Step 4: Smoke check — boot the app under tests**

```bash
cd backend
pytest tests/ -v
```

Expected: 1 test passes (the config test from Task 1.2). No errors importing `app.main`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/shared/db.py backend/tests/conftest.py backend/tests/integration/__init__.py
git commit -m "feat(backend): add async SQLAlchemy engine + session"
```

---

## Task 1.5: Backend — Alembic migration framework

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/.gitkeep`

- [ ] **Step 1: Initialize Alembic structure manually (since we use async)**

Create `backend/alembic.ini`:

```ini
[alembic]
script_location = alembic
file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d-%%(rev)s_%%(slug)s

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 2: Create `backend/alembic/script.py.mako`**

```python
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision: str = ${repr(up_revision)}
down_revision: str | None = ${repr(down_revision)}
branch_labels: str | Sequence[str] | None = ${repr(branch_labels)}
depends_on: str | Sequence[str] | None = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 3: Create `backend/alembic/env.py` (async-aware)**

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.shared.config import get_settings
from app.shared.db import Base
# Import all model modules so their tables register on Base.metadata.
# Add new model imports here as features are introduced.
from app.features.auth import models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


run_migrations_online()
```

- [ ] **Step 4: Create empty versions directory**

```bash
mkdir -p backend/alembic/versions
touch backend/alembic/versions/.gitkeep
```

- [ ] **Step 5: Verify Alembic loads (will fail until auth/models.py exists in Task 1.6, that's expected)**

Skip running Alembic now — we'll run it after Task 1.6 creates `app/features/auth/models.py`.

- [ ] **Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat(backend): add Alembic with async migration setup"
```

---

## Task 1.6: Backend — features/auth User model + first migration

**Files:**
- Create: `backend/app/features/auth/__init__.py`
- Create: `backend/app/features/auth/models.py`
- Create: `backend/alembic/versions/0001_create_users.py` (generated)

- [ ] **Step 1: Create the auth feature package**

```bash
touch backend/app/features/auth/__init__.py
```

- [ ] **Step 2: Implement `backend/app/features/auth/models.py`**

```python
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base


class UserRole(str, Enum):
    creator = "creator"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    clerk_user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    role: Mapped[UserRole] = mapped_column(String(16), default=UserRole.student)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 3: Generate the first migration**

```bash
cd backend
alembic revision --autogenerate -m "create users"
```

Expected: a new file appears under `backend/alembic/versions/` like `..._XXXXX_create_users.py`. Open it; verify it creates the `users` table with `clerk_user_id`, `email`, `display_name`, `role` columns.

- [ ] **Step 4: Apply the migration**

```bash
alembic upgrade head
```

Expected: `INFO [alembic.runtime.migration] Running upgrade ... -> ..., create users`. No errors.

- [ ] **Step 5: Verify the table exists**

```bash
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -d ai_tutor -c "\d users"
```

Expected: table description shows the columns.

- [ ] **Step 6: Apply migration on test DB too**

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tutor_test alembic upgrade head
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/features/auth/__init__.py backend/app/features/auth/models.py backend/alembic/versions/
git commit -m "feat(backend): add User model and create_users migration"
```

---

## Task 1.7: Backend — Clerk JWT verification

**Files:**
- Create: `backend/app/features/auth/clerk.py`
- Create: `backend/tests/unit/test_clerk_jwt.py`

- [ ] **Step 1: Write the failing test `backend/tests/unit/test_clerk_jwt.py`**

```python
import time
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import jwt as pyjwt

from app.features.auth.clerk import ClerkVerifier, ClerkAuthError


def _make_keypair():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    priv_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return priv_pem, pub_pem


def test_verifier_accepts_valid_token():
    priv, pub = _make_keypair()
    token = pyjwt.encode(
        {"sub": "user_abc", "iat": int(time.time()), "exp": int(time.time()) + 60, "iss": "https://clerk.test"},
        priv,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    verifier = ClerkVerifier(public_keys={"test-kid": pub}, expected_issuer="https://clerk.test")
    claims = verifier.verify(token)

    assert claims["sub"] == "user_abc"


def test_verifier_rejects_expired_token():
    priv, pub = _make_keypair()
    token = pyjwt.encode(
        {"sub": "user_abc", "iat": int(time.time()) - 600, "exp": int(time.time()) - 60, "iss": "https://clerk.test"},
        priv,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )

    verifier = ClerkVerifier(public_keys={"test-kid": pub}, expected_issuer="https://clerk.test")
    with pytest.raises(ClerkAuthError):
        verifier.verify(token)


def test_verifier_rejects_unknown_kid():
    priv, _ = _make_keypair()
    _, pub_other = _make_keypair()
    token = pyjwt.encode(
        {"sub": "user_abc", "iat": int(time.time()), "exp": int(time.time()) + 60, "iss": "https://clerk.test"},
        priv,
        algorithm="RS256",
        headers={"kid": "unknown-kid"},
    )

    verifier = ClerkVerifier(public_keys={"test-kid": pub_other}, expected_issuer="https://clerk.test")
    with pytest.raises(ClerkAuthError):
        verifier.verify(token)
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
cd backend && pytest tests/unit/test_clerk_jwt.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.features.auth.clerk'`.

- [ ] **Step 3: Implement `backend/app/features/auth/clerk.py`**

```python
from __future__ import annotations

import time
from dataclasses import dataclass

import httpx
import jwt as pyjwt
from jwt.algorithms import RSAAlgorithm


class ClerkAuthError(Exception):
    """Raised when a Clerk JWT cannot be verified."""


@dataclass
class ClerkVerifier:
    public_keys: dict[str, bytes]   # kid -> PEM-encoded public key
    expected_issuer: str
    leeway_seconds: int = 5

    def verify(self, token: str) -> dict:
        try:
            header = pyjwt.get_unverified_header(token)
        except pyjwt.PyJWTError as exc:
            raise ClerkAuthError(f"malformed token: {exc}") from exc

        kid = header.get("kid")
        if not kid or kid not in self.public_keys:
            raise ClerkAuthError(f"unknown key id: {kid}")

        try:
            return pyjwt.decode(
                token,
                key=self.public_keys[kid],
                algorithms=["RS256"],
                issuer=self.expected_issuer,
                options={"require": ["exp", "sub", "iss"]},
                leeway=self.leeway_seconds,
            )
        except pyjwt.PyJWTError as exc:
            raise ClerkAuthError(str(exc)) from exc


class ClerkJwksClient:
    """Fetches and caches Clerk's JWKS (key set) for verifying tokens."""

    def __init__(self, jwks_url: str, cache_seconds: int = 300):
        self._jwks_url = jwks_url
        self._cache_seconds = cache_seconds
        self._cache: tuple[float, dict[str, bytes]] | None = None

    async def get_keys(self) -> dict[str, bytes]:
        now = time.monotonic()
        if self._cache and now - self._cache[0] < self._cache_seconds:
            return self._cache[1]

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(self._jwks_url)
            resp.raise_for_status()
            jwks = resp.json()

        keys: dict[str, bytes] = {}
        for jwk in jwks.get("keys", []):
            kid = jwk["kid"]
            public_key = RSAAlgorithm.from_jwk(jwk)
            from cryptography.hazmat.primitives import serialization
            keys[kid] = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )

        self._cache = (now, keys)
        return keys
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
pytest tests/unit/test_clerk_jwt.py -v
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/features/auth/clerk.py backend/tests/unit/test_clerk_jwt.py
git commit -m "feat(backend): add Clerk JWT verifier with JWKS support"
```

---

## Task 1.8: Backend — auth dependency (current_user) + lazy provisioning

**Files:**
- Create: `backend/app/shared/deps.py`
- Create: `backend/app/features/auth/service.py`
- Create: `backend/app/features/auth/schemas.py`
- Create: `backend/app/features/auth/routes.py`
- Modify: `backend/app/main.py` — register the auth router
- Create: `backend/tests/integration/test_me_endpoint.py`

- [ ] **Step 1: Implement `backend/app/features/auth/schemas.py`**

```python
from pydantic import BaseModel, EmailStr
from app.features.auth.models import UserRole


class AppUserOut(BaseModel):
    clerk_user_id: str
    email: EmailStr
    display_name: str | None
    role: UserRole

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Implement `backend/app/features/auth/service.py`**

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User, UserRole


async def get_or_create_user(
    db: AsyncSession,
    *,
    clerk_user_id: str,
    email: str,
    display_name: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    user = User(
        clerk_user_id=clerk_user_id,
        email=email,
        display_name=display_name,
        role=UserRole.student,
    )
    db.add(user)
    await db.flush()  # populate `id` without committing
    return user


async def update_user_from_clerk(
    db: AsyncSession,
    *,
    clerk_user_id: str,
    email: str,
    display_name: str | None,
) -> User | None:
    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    user.email = email
    user.display_name = display_name
    await db.flush()
    return user
```

- [ ] **Step 3: Implement `backend/app/shared/deps.py`**

```python
from collections.abc import AsyncIterator
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.config import Settings, get_settings
from app.shared.db import SessionLocal
from app.features.auth.clerk import ClerkAuthError, ClerkJwksClient, ClerkVerifier
from app.features.auth.models import User
from app.features.auth.service import get_or_create_user


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@lru_cache
def _jwks_client_singleton() -> ClerkJwksClient:
    return ClerkJwksClient(jwks_url=get_settings().clerk_jwks_url)


async def current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    token = authorization.split(" ", 1)[1]

    keys = await _jwks_client_singleton().get_keys()
    verifier = ClerkVerifier(
        public_keys=keys,
        expected_issuer=settings.clerk_jwks_url.rsplit("/.well-known", 1)[0],
    )
    try:
        claims = verifier.verify(token)
    except ClerkAuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    clerk_user_id: str = claims["sub"]
    email = claims.get("email") or f"{clerk_user_id}@unknown.local"
    display_name = claims.get("name")

    return await get_or_create_user(
        db,
        clerk_user_id=clerk_user_id,
        email=email,
        display_name=display_name,
    )
```

- [ ] **Step 4: Implement `backend/app/features/auth/routes.py`**

```python
from fastapi import APIRouter, Depends

from app.features.auth.models import User
from app.features.auth.schemas import AppUserOut
from app.shared.deps import current_user

router = APIRouter(prefix="/api", tags=["auth"])


@router.get("/me", response_model=AppUserOut)
async def get_me(user: User = Depends(current_user)) -> AppUserOut:
    return AppUserOut.model_validate(user)
```

- [ ] **Step 5: Wire the router in `backend/app/main.py`**

Replace the existing `create_app` function with:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.features.auth.routes import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="AI Tutor Backend", lifespan=lifespan)

    @app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    app.include_router(auth_router)

    return app


app = create_app()
```

- [ ] **Step 6: Write integration test `backend/tests/integration/test_me_endpoint.py`**

```python
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.features.auth.models import User
from app.features.auth.service import get_or_create_user


@pytest.mark.asyncio
async def test_get_or_create_creates_when_missing():
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tutor_test",
        future=True,
    )
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with SessionLocal() as db:
        # clean slate
        await db.execute(User.__table__.delete().where(User.clerk_user_id == "user_test1"))
        await db.commit()

        user = await get_or_create_user(
            db,
            clerk_user_id="user_test1",
            email="t1@example.com",
            display_name="T One",
        )
        await db.commit()
        assert user.clerk_user_id == "user_test1"

        again = await get_or_create_user(
            db,
            clerk_user_id="user_test1",
            email="DIFFERENT@example.com",   # ignored on existing user
            display_name="Ignored",
        )
        assert again.id == user.id
        assert again.email == "t1@example.com"

    await engine.dispose()
```

- [ ] **Step 7: Run all backend tests**

```bash
cd backend && pytest -v
```

Expected: all tests pass (config, jwt, get_or_create).

- [ ] **Step 8: Commit**

```bash
git add backend/app/shared/deps.py backend/app/features/auth/ backend/app/main.py backend/tests/integration/test_me_endpoint.py
git commit -m "feat(backend): add /api/me with lazy user provisioning"
```

---

## Task 1.9: Backend — Clerk webhook for user.updated sync

**Files:**
- Create: `backend/app/features/auth/webhook.py`
- Modify: `backend/app/features/auth/routes.py` — register webhook route
- Create: `backend/tests/integration/test_clerk_webhook.py`

- [ ] **Step 1: Implement `backend/app/features/auth/webhook.py`**

```python
from __future__ import annotations

from fastapi import HTTPException, Request, status
from svix.webhooks import Webhook, WebhookVerificationError

from app.shared.config import get_settings


async def verify_and_parse_clerk_webhook(request: Request) -> dict:
    settings = get_settings()
    payload = await request.body()
    headers = {k: v for k, v in request.headers.items()}

    try:
        wh = Webhook(settings.clerk_webhook_secret)
        event = wh.verify(payload, headers)
    except WebhookVerificationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"invalid webhook signature: {exc}") from exc
    return event
```

- [ ] **Step 2: Add the webhook route to `backend/app/features/auth/routes.py`**

Replace the file contents with:

```python
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.auth.schemas import AppUserOut
from app.features.auth.service import update_user_from_clerk, get_or_create_user
from app.features.auth.webhook import verify_and_parse_clerk_webhook
from app.shared.deps import current_user, get_db

router = APIRouter(prefix="/api", tags=["auth"])


@router.get("/me", response_model=AppUserOut)
async def get_me(user: User = Depends(current_user)) -> AppUserOut:
    return AppUserOut.model_validate(user)


@router.post("/auth/clerk-webhook", status_code=status.HTTP_204_NO_CONTENT)
async def clerk_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> None:
    event = await verify_and_parse_clerk_webhook(request)
    event_type = event.get("type")
    data = event.get("data", {})

    clerk_user_id = data.get("id")
    if not clerk_user_id:
        return

    primary_email = next(
        (e["email_address"] for e in data.get("email_addresses", []) if e.get("id") == data.get("primary_email_address_id")),
        None,
    )
    display_name = " ".join(filter(None, [data.get("first_name"), data.get("last_name")])) or None

    if event_type == "user.created":
        await get_or_create_user(
            db,
            clerk_user_id=clerk_user_id,
            email=primary_email or f"{clerk_user_id}@unknown.local",
            display_name=display_name,
        )
    elif event_type == "user.updated":
        await update_user_from_clerk(
            db,
            clerk_user_id=clerk_user_id,
            email=primary_email or f"{clerk_user_id}@unknown.local",
            display_name=display_name,
        )
```

- [ ] **Step 3: Write integration test `backend/tests/integration/test_clerk_webhook.py`**

```python
import json
import pytest
from svix.webhooks import Webhook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.features.auth.models import User


@pytest.mark.asyncio
async def test_user_created_webhook_creates_row(client, monkeypatch):
    secret = "whsec_x" * 4
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", secret)

    payload = {
        "type": "user.created",
        "data": {
            "id": "user_hook1",
            "primary_email_address_id": "idem1",
            "email_addresses": [{"id": "idem1", "email_address": "hook1@example.com"}],
            "first_name": "Hook",
            "last_name": "One",
        },
    }
    body = json.dumps(payload).encode()
    wh = Webhook(secret)
    msg_id = "msg_test1"
    timestamp = "1700000000"
    signature = wh.sign(msg_id, int(timestamp), body)

    headers = {
        "svix-id": msg_id,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
        "content-type": "application/json",
    }
    resp = await client.post("/api/auth/clerk-webhook", content=body, headers=headers)
    assert resp.status_code == 204

    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tutor_test",
        future=True,
    )
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.clerk_user_id == "user_hook1"))
        user = result.scalar_one()
        assert user.email == "hook1@example.com"
        assert user.display_name == "Hook One"
        await db.delete(user)
        await db.commit()
    await engine.dispose()
```

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && pytest -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/features/auth/webhook.py backend/app/features/auth/routes.py backend/tests/integration/test_clerk_webhook.py
git commit -m "feat(backend): add Clerk user.created/updated webhook"
```

---

## Task 1.10: Frontend — install deps and ESLint boundaries

**Files:**
- Modify: `frontend/package.json` — add deps
- Modify: `frontend/eslint.config.mjs` — add boundaries rules
- Create: `frontend/.env.local.example`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend
npm install @clerk/nextjs zustand clsx tailwind-merge
npm install --save-dev eslint-plugin-boundaries
```

- [ ] **Step 2: Read the current `frontend/eslint.config.mjs` to know the exact replacement target**

```bash
cat frontend/eslint.config.mjs
```

- [ ] **Step 3: Replace `frontend/eslint.config.mjs` with boundary rules**

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "app/**" },
        { type: "feature", pattern: "features/*", mode: "folder" },
        { type: "shared", pattern: "shared/**" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["feature", "shared"] },
            { from: "feature", allow: ["shared"] },
            { from: "shared", allow: ["shared"] },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
```

- [ ] **Step 4: Create `frontend/.env.local.example`**

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend base URL (local dev)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

- [ ] **Step 5: Verify ESLint boots**

```bash
cd frontend && npx eslint app
```

Expected: no errors (or pre-existing template errors, but no plugin-loading errors).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/eslint.config.mjs frontend/.env.local.example
git commit -m "feat(frontend): add Clerk, zustand, and ESLint boundaries plugin"
```

---

## Task 1.11: Frontend — feature scaffolding (auth feature, shared)

**Files:**
- Create: `frontend/features/auth/index.ts`
- Create: `frontend/features/auth/components/user-menu.tsx`
- Create: `frontend/features/auth/hooks/use-app-user.ts`
- Create: `frontend/shared/api/client.ts`
- Create: `frontend/shared/components/app-shell.tsx`

- [ ] **Step 1: Create `frontend/shared/api/client.ts`**

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  return (await res.json()) as T;
}
```

- [ ] **Step 2: Create `frontend/features/auth/hooks/use-app-user.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { apiFetch } from "@/shared/api/client";

export type AppUser = {
  clerk_user_id: string;
  email: string;
  display_name: string | null;
  role: "creator" | "student";
};

export function useAppUser() {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn } = useUser();
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const me = await apiFetch<AppUser>("/api/me", { token });
        if (!cancelled) setUser(me);
      } catch (err) {
        if (!cancelled) setError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn, getToken]);

  return { user, error, loading: authLoaded && isSignedIn && user === null && error === null };
}
```

- [ ] **Step 3: Create `frontend/features/auth/components/user-menu.tsx`**

```tsx
"use client";

import { UserButton } from "@clerk/nextjs";
import { useAppUser } from "../hooks/use-app-user";

export function UserMenu() {
  const { user } = useAppUser();
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">
        {user ? user.display_name ?? user.email : "…"}
      </span>
      <UserButton />
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/features/auth/index.ts` (public API)**

```ts
export { UserMenu } from "./components/user-menu";
export { useAppUser } from "./hooks/use-app-user";
export type { AppUser } from "./hooks/use-app-user";
```

- [ ] **Step 5: Create `frontend/shared/components/app-shell.tsx`**

```tsx
import type { ReactNode } from "react";

export function AppShell({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold">AI Tutor</span>
        {header}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/features frontend/shared
git commit -m "feat(frontend): scaffold auth feature and shared layer"
```

---

## Task 1.12: Frontend — Clerk middleware and provider

**Files:**
- Create: `frontend/middleware.ts` (project root, sibling of `app/`)
- Modify: `frontend/app/layout.tsx` — wrap with `<ClerkProvider>`

- [ ] **Step 1: Create `frontend/middleware.ts`**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join/(.*)",
  "/api/health(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 2: Read the current `frontend/app/layout.tsx`**

```bash
cat frontend/app/layout.tsx
```

- [ ] **Step 3: Modify `frontend/app/layout.tsx` to wrap with ClerkProvider**

Replace the file contents (keep any existing font imports and metadata you find, then wrap the body):

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "AI Native Programming Tutor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

Expected: build succeeds. (If it fails for missing env, copy `.env.local.example` to `.env.local` and fill in your actual Clerk test keys from clerk.com first.)

- [ ] **Step 5: Commit**

```bash
git add frontend/middleware.ts frontend/app/layout.tsx
git commit -m "feat(frontend): add Clerk middleware and provider"
```

---

## Task 1.13: Frontend — Sign-in / sign-up pages

**Files:**
- Create: `frontend/app/(auth)/sign-in/[[...rest]]/page.tsx`
- Create: `frontend/app/(auth)/sign-up/[[...rest]]/page.tsx`

- [ ] **Step 1: Create `frontend/app/(auth)/sign-in/[[...rest]]/page.tsx`**

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn />
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/app/(auth)/sign-up/[[...rest]]/page.tsx`**

```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 3: Smoke test the dev server**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/sign-in` in a browser. Expected: Clerk's sign-in widget renders. (If you don't have valid Clerk keys yet, the widget will say so — fill in `.env.local` with real test keys to proceed.)

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add 'frontend/app/(auth)'
git commit -m "feat(frontend): add Clerk sign-in and sign-up pages"
```

---

## Task 1.14: Frontend — Dashboard with empty state

**Files:**
- Create: `frontend/app/dashboard/page.tsx`
- Modify: `frontend/app/page.tsx` — redirect signed-in users to `/dashboard`

- [ ] **Step 1: Create `frontend/app/dashboard/page.tsx`**

```tsx
import { UserMenu } from "@/features/auth";
import { AppShell } from "@/shared/components/app-shell";

export default function DashboardPage() {
  return (
    <AppShell header={<UserMenu />}>
      <div className="px-6 py-12 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">My courses</h1>
        <p className="text-gray-600 mb-8">
          Create your first course or join one with a code.
        </p>

        <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center">
          <p className="text-gray-500">No courses yet.</p>
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Modify `frontend/app/page.tsx` to redirect signed-in users**

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-3">AI Tutor</h1>
      <p className="text-gray-600 mb-8">An AI-native programming tutor.</p>
      <div className="flex gap-3">
        <a href="/sign-in" className="px-4 py-2 rounded-lg bg-gray-900 text-white">
          Sign in
        </a>
        <a href="/sign-up" className="px-4 py-2 rounded-lg border border-gray-300">
          Sign up
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify @-import alias resolves**

Open `frontend/tsconfig.json`. If `compilerOptions.paths` does not already define `@/*`, add it:

```jsonc
{
  "compilerOptions": {
    // ... keep existing options
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

- [ ] **Step 4: Smoke test end-to-end**

Make sure both servers are running:

```bash
# terminal 1
cd backend && uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend && npm run dev
```

Then in a browser:
1. Visit `http://localhost:3000/` → see landing page with "Sign up"
2. Click "Sign up" → Clerk sign-up flow → create an account
3. After sign-up, redirected to `/dashboard` → see "My courses" + "No courses yet"
4. Open browser DevTools → Network → filter for `/api/me`. The request should succeed with the new user's `clerk_user_id`, `email`, `display_name`, `role: "student"`.

Verify in DB:

```bash
docker compose -f backend/docker-compose.dev.yml exec postgres \
  psql -U postgres -d ai_tutor -c "SELECT clerk_user_id, email, role FROM users;"
```

Expected: one row with your new account.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard frontend/app/page.tsx frontend/tsconfig.json
git commit -m "feat(frontend): add dashboard with empty state and signed-in redirect"
```

---

## Task 1.15: Backend — Dockerfile + minimal docker-compose entry

**Files:**
- Create: `backend/Dockerfile`
- Modify: `backend/docker-compose.dev.yml` — add backend service

- [ ] **Step 1: Create `backend/Dockerfile` (multi-stage)**

```dockerfile
# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install --prefix=/install '.[dev]' .

FROM base AS runtime
WORKDIR /app
COPY --from=builder /install /usr/local
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Update `backend/docker-compose.dev.yml`**

Replace the file contents:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_tutor
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/ai_tutor
      CLERK_PUBLISHABLE_KEY: ${CLERK_PUBLISHABLE_KEY}
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
      CLERK_JWKS_URL: ${CLERK_JWKS_URL}
      CLERK_WEBHOOK_SECRET: ${CLERK_WEBHOOK_SECRET}
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    volumes:
      - ./app:/app/app
      - ./alembic:/app/alembic
      - ./alembic.ini:/app/alembic.ini
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

- [ ] **Step 3: Build and run via compose**

```bash
cd backend
cp .env.example .env  # fill in real Clerk values before running
docker compose -f docker-compose.dev.yml --env-file .env up --build -d
docker compose -f docker-compose.dev.yml ps
curl http://localhost:8000/healthz
```

Expected: services up; `/healthz` returns `{"status":"ok"}`.

- [ ] **Step 4: Apply migrations inside the container**

```bash
docker compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

Expected: `INFO ... Running upgrade ... -> ..., create users`.

- [ ] **Step 5: Tear down**

```bash
docker compose -f docker-compose.dev.yml down
```

- [ ] **Step 6: Commit**

```bash
git add backend/Dockerfile backend/docker-compose.dev.yml
git commit -m "infra(backend): add Dockerfile and full local docker-compose"
```

---

## Task 1.16: Boundary verification + Phase 1 completion check

**Files:**
- Create: `frontend/features/_test_cross_feature_import.ts` (intentional violation, then remove)

- [ ] **Step 1: Confirm ESLint blocks cross-feature imports**

Create a temporary file `frontend/features/_test_cross_feature_import.ts`:

```ts
// This MUST fail eslint — features cannot import from other features.
// Once we add a second feature in Phase 2, replace this with:
//   import { something } from "@/features/courses";
//
// For Phase 1 we only have `auth`, so simulate by importing through a fake path:
import { useAppUser } from "@/features/auth";

export const x = useAppUser;
```

Run ESLint:

```bash
cd frontend && npx eslint features/_test_cross_feature_import.ts
```

Expected: NO error yet (since this file lives at `features/`, not inside another feature). The point is: the rule is *configured*; we'll verify it fires the first time we add a second feature in Phase 2. Delete the test file:

```bash
rm frontend/features/_test_cross_feature_import.ts
```

- [ ] **Step 2: Run all backend tests one more time**

```bash
cd backend && pytest -v
```

Expected: all PASS.

- [ ] **Step 3: Run a final E2E smoke test**

1. `docker compose -f backend/docker-compose.dev.yml up -d`
2. `cd frontend && npm run dev`
3. Browser: open `http://localhost:3000/`, sign up, land on dashboard, see your name in the header
4. DB: `docker compose ... psql -c "SELECT * FROM users;"` — see your row

If all four steps work, **Phase 1 is complete.**

- [ ] **Step 4: Final commit (if any small fixes were made)**

```bash
git status
git add -A
git commit -m "chore: Phase 1 foundation complete" --allow-empty
```

---

## Phase 1 done — what's next

When Phase 1 is complete, come back and ask for **Phase 2: Generation Pipeline**. Phase 2 will cover:

- Migrations for `courses`, `course_chunks`, `lessons`, `blocks`
- The `authoring` feature: `/api/courses/generate` + the async pipeline (extract → embed → outline → blocks → TTS)
- The course-creation wizard on the frontend (3 steps + status polling)
- Anthropic client setup, OpenAI TTS client setup, structured-output prompts
- Tests covering the full generation happy path with mocked LLM/TTS

Each subsequent phase plan will be written in the same TDD detail.
