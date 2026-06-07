# AI Tutor Backend

FastAPI backend with PostgreSQL + pgvector.

## Requirements

- Python 3.12+
- Docker & Docker Compose

## Environment Variables

Create a `.env` file in this directory:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/ai_tutor

CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
CLERK_WEBHOOK_SECRET=whsec_...

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
JUDGE0_API_KEY=...
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

FRONTEND_URL=http://localhost:3000
```

## Option 1: Docker (recommended)

```bash
docker compose -f docker-compose.dev.yml up --build
```

This starts PostgreSQL on port `5433` and the API on port `8000`.

Run migrations inside the container after first start:

```bash
docker compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

## Option 2: Local

**Install dependencies:**

```bash
pip install -e ".[dev]"
```

**Start PostgreSQL** (requires Docker):

```bash
docker compose -f docker-compose.dev.yml up postgres -d
```

**Run migrations:**

```bash
alembic upgrade head
```

**Start the server:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API is available at `http://localhost:8000`.  
Docs at `http://localhost:8000/docs`.

## Tests

```bash
pytest
```
