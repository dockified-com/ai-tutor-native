# Local Development Setup
# AI Native Programming Tutor — V1

**Prerequisites:** Docker, Node.js 22+, Python 3.12+, uv  
**Time to first run:** ~10 minutes  
**Last Updated:** 2026-05-30  

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [Environment Variables](#3-environment-variables)
4. [Backend Setup](#4-backend-setup)
5. [Frontend Setup](#5-frontend-setup)
6. [Database Setup](#6-database-setup)
7. [External Services](#7-external-services)
8. [Running the Full Stack](#8-running-the-full-stack)
9. [Development Workflow](#9-development-workflow)
10. [Common Issues](#10-common-issues)

---

## 1. Prerequisites

Install these tools before starting:

| Tool | Version | Install |
|---|---|---|
| Docker + Docker Compose | Latest | [docker.com/get-started](https://docker.com/get-started) |
| Node.js | 22+ | `nvm install 22` |
| Python | 3.12+ | [python.org](https://python.org) or `pyenv install 3.12` |
| `uv` (Python package manager) | Latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Git | Any | Pre-installed on most systems |

Verify installs:

```bash
docker --version           # Docker version 25+
node --version             # v22+
python3 --version          # Python 3.12+
uv --version               # uv 0.4+
```

---

## 2. Repository Structure

```
ai-tutor-native/
├── backend/               # FastAPI Python backend
│   ├── app/
│   ├── tests/
│   ├── docker-compose.dev.yml
│   └── pyproject.toml
├── frontend/              # Next.js 16 frontend
│   ├── app/
│   ├── features/
│   ├── shared/
│   └── package.json
└── docs/                  # You are here
    ├── product/
    ├── architecture/
    ├── api/
    └── setup/
```

---

## 3. Environment Variables

### Backend (`backend/.env`)

Create `backend/.env` by copying the template:

```bash
cp backend/.env.example backend/.env
```

Fill in all values:

```env
# ─── Database ───────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_tutor
# ^ For local Docker Postgres. In production, use Supabase connection string.

# ─── Auth (Clerk) ───────────────────────────────────────────
CLERK_SECRET_KEY=sk_test_...
# Get from: https://dashboard.clerk.com → API Keys

CLERK_WEBHOOK_SECRET=whsec_...
# Get from: https://dashboard.clerk.com → Webhooks → your endpoint → Signing Secret

# ─── AI Providers ───────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
# Get from: https://console.anthropic.com → API Keys

OPENAI_API_KEY=sk-...
# Get from: https://platform.openai.com → API Keys

JUDGE0_API_KEY=...
# Get from: https://rapidapi.com/judge0-official/api/judge0-ce → Subscribe → API Key

# ─── Supabase Storage ───────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Get from: Supabase Dashboard → Project Settings → API

# ─── App Config ─────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
SENTRY_DSN=                    # Leave empty for local development
```

> **Never commit `.env` files.** They are git-ignored by default.

### Frontend (`frontend/.env.local`)

```bash
cp frontend/.env.example frontend/.env.local
```

Fill in:

```env
# ─── Clerk (Frontend) ───────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# Same Clerk app as backend

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ─── Backend API ────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 4. Backend Setup

### Option A: Docker (Recommended)

The development Docker Compose includes Postgres + pgvector. No local Python install needed.

```bash
cd backend

# Start Postgres + backend API
docker compose -f docker-compose.dev.yml up --build

# API is now running at http://localhost:8000
# Postgres is at localhost:5432
```

### Option B: Local Python (Faster for active development)

```bash
cd backend

# Create virtual environment and install deps
uv sync

# Start Postgres only (still uses Docker)
docker compose -f docker-compose.dev.yml up postgres -d

# Run migrations
uv run alembic upgrade head

# Start FastAPI dev server (with auto-reload)
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Verify Backend

```bash
curl http://localhost:8000/api/health
# → { "status": "ok", "version": "1.0.0" }
```

---

## 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Frontend is now at http://localhost:3000
```

### Verify Frontend

Open [http://localhost:3000](http://localhost:3000) — you should see the sign-in page.

---

## 6. Database Setup

### Starting the Dev Database

```bash
cd backend
docker compose -f docker-compose.dev.yml up postgres -d
```

This starts Postgres 16 with `pgvector` pre-installed.

**Connection details (local only):**

```
Host:     localhost
Port:     5432
Database: ai_tutor
User:     postgres
Password: postgres
```

### Running Migrations

```bash
cd backend

# Run all migrations (creates all tables)
uv run alembic upgrade head

# Check current revision
uv run alembic current

# Roll back one migration
uv run alembic downgrade -1
```

### Seeding Test Data (Optional)

```bash
cd backend
uv run python scripts/seed_dev.py

# Creates:
# - 1 creator user (email: creator@dev.local)
# - 1 student user (email: student@dev.local)
# - 1 sample course (status: published, code: DEV001)
# - 1 sample lesson with all 5 block types
```

### Connecting with a DB Client

Use any Postgres GUI (TablePlus, DBeaver, pgAdmin):

```
postgresql://postgres:postgres@localhost:5432/ai_tutor
```

---

## 7. External Services

### Clerk (Auth)

1. Create a free account at [clerk.com](https://clerk.com)
2. Create a new application
3. Enable **Email + Password** and **Google** sign-in methods
4. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
5. Set up a webhook:
   - Go to **Webhooks** → **Add Endpoint**
   - URL: `http://localhost:8000/api/auth/clerk-webhook` (use ngrok for local testing)
   - Events: `user.created`, `user.updated`
   - Copy the Signing Secret as `CLERK_WEBHOOK_SECRET`

**Setting creator role:**

After signing in for the first time, run:

```sql
-- In your DB client or psql:
UPDATE users SET role = 'creator' WHERE email = 'your@email.com';
```

### Supabase (Storage)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Storage** → Create two buckets:
   - `pdfs` (private)
   - `audio` (public)
3. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**

> **Note:** We use Supabase for Storage only. Postgres runs locally in Docker.

### Anthropic (LLM + Embeddings)

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys** → Create a new key
3. Copy as `ANTHROPIC_API_KEY`

**Budget warning:** Generation costs ~$0.30 per course. Set a spending limit in the Anthropic console.

### OpenAI (TTS)

1. Create an account at [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys** → Create a new key
3. Copy as `OPENAI_API_KEY`

**Budget warning:** TTS costs ~$0.50 per 30-page course. Set a spending limit.

### Judge0 RapidAPI (Code Execution)

1. Create an account at [rapidapi.com](https://rapidapi.com)
2. Search for **Judge0 CE**
3. Subscribe to the **Basic** plan (50 free executions/day)
4. Copy your **X-RapidAPI-Key** as `JUDGE0_API_KEY`

---

## 8. Running the Full Stack

With everything set up, start the full development environment:

### Terminal 1 — Database

```bash
cd backend
docker compose -f docker-compose.dev.yml up postgres -d
```

### Terminal 2 — Backend

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

### Terminal 3 — Frontend

```bash
cd frontend
npm run dev
```

### Quick verification checklist

- [ ] `http://localhost:8000/api/health` → `{ "status": "ok" }`
- [ ] `http://localhost:3000` → Sign-in page loads
- [ ] Sign in with Clerk → redirects to `/dashboard`
- [ ] Dashboard shows "No courses yet"

---

## 9. Development Workflow

### Running Tests

**Backend unit tests:**

```bash
cd backend
uv run pytest tests/unit/ -v
```

**Backend integration tests (requires DB):**

```bash
cd backend
# Make sure Postgres is running
uv run pytest tests/integration/ -v
```

**Frontend type checking:**

```bash
cd frontend
npm run type-check
```

**Frontend linting (includes boundary rules):**

```bash
cd frontend
npm run lint
```

**Frontend unit tests:**

```bash
cd frontend
npm run test:unit
```

### Making a New Migration

```bash
cd backend
# After modifying a SQLAlchemy model:
uv run alembic revision --autogenerate -m "add_notes_table"
# Review the generated file in alembic/versions/
uv run alembic upgrade head
```

### Adding a New Backend Dependency

```bash
cd backend
uv add <package>
# This updates pyproject.toml and uv.lock
```

### Adding a New Frontend Dependency

```bash
cd frontend
npm install <package>
```

### Adding a shadcn/ui Component

```bash
cd frontend
npx shadcn@latest add <component>
# e.g.: npx shadcn@latest add sheet
```

### Code Formatting

**Backend (ruff):**

```bash
cd backend
uv run ruff format .
uv run ruff check . --fix
```

**Frontend (prettier + eslint):**

```bash
cd frontend
npm run format
npm run lint:fix
```

### Creating a Clerk Webhook Tunnel (for local dev)

Clerk webhooks need a public URL. Use ngrok:

```bash
ngrok http 8000
# Copy the https URL (e.g., https://abc123.ngrok.io)
# Set in Clerk Dashboard → Webhooks as:
# https://abc123.ngrok.io/api/auth/clerk-webhook
```

---

## 10. Common Issues

### `pgvector` extension not found

```
ERROR: extension "vector" not found
```

**Fix:** Make sure you're using the `pgvector/pgvector:pg16` Docker image (specified in `docker-compose.dev.yml`), not the plain `postgres:16` image.

```bash
# Stop and remove the old container
docker compose -f docker-compose.dev.yml down -v

# Rebuild with correct image
docker compose -f docker-compose.dev.yml up postgres -d
```

---

### Clerk JWT validation fails

```
401 Unauthorized: Invalid JWT
```

**Fixes:**
1. Verify `CLERK_SECRET_KEY` matches your Clerk app (not another project)
2. Check that the JWT is being sent as `Authorization: Bearer <token>` (not `Token` or other prefix)
3. Ensure Clerk is configured for the same domain — development keys have `pk_test_` prefix; production keys have `pk_live_`

---

### CORS error in browser

```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Fix:** Verify `FRONTEND_URL=http://localhost:3000` is set in `backend/.env`. The backend reads this to configure CORS.

---

### `uv sync` fails with Python version error

```
error: The requested Python version (3.12) is not installed
```

**Fix:**

```bash
# Install Python 3.12 via pyenv
pyenv install 3.12
pyenv local 3.12

# Then retry
uv sync
```

---

### Supabase Storage upload fails

```
StorageApiError: Bucket not found
```

**Fix:** Create the `pdfs` and `audio` buckets in your Supabase dashboard (Storage → Create Bucket). Make `pdfs` private and `audio` public.

---

### Judge0 returns `400` or `language_id` error

**Fix:** Verify the `JUDGE0_API_KEY` is the `X-RapidAPI-Key` (not the RapidAPI app key). Check that your RapidAPI subscription to Judge0 CE is active.

---

### Monaco editor doesn't load

```
Failed to load resource: monaco-editor
```

**Fix:** Monaco requires Web Workers. Ensure `next.config.ts` has:

```ts
const config: NextConfig = {
  webpack: (config) => {
    config.resolve.alias['monaco-editor'] = path.resolve(
      __dirname,
      'node_modules/monaco-editor/esm/vs/editor/editor.api.js'
    );
    return config;
  },
};
```

Or use `@monaco-editor/react` (already configured) which handles Web Workers automatically.

---

### Port already in use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:**

```bash
# Find and kill the process using the port
lsof -ti:3000 | xargs kill -9    # Frontend
lsof -ti:8000 | xargs kill -9    # Backend
lsof -ti:5432 | xargs kill -9    # Postgres (or stop Docker)
```

---

## Appendix: Docker Compose Dev File

```yaml
# backend/docker-compose.dev.yml
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
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: .
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/ai_tutor
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./app:/app/app    # hot reload in dev
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

volumes:
  pgdata:
```
