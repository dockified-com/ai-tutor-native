# Database Schema
# AI Native Programming Tutor — V1

**Database:** PostgreSQL 16 via Supabase Managed  
**Extensions:** `pgvector` (for embeddings), `uuid-ossp` (for UUID generation)  
**Last Updated:** 2026-05-30  

---

## Table of Contents

1. [Design Decisions](#1-design-decisions)
2. [Schema Overview](#2-schema-overview)
3. [Table Definitions (Full DDL)](#3-table-definitions-full-ddl)
4. [Block Content JSONB Schemas](#4-block-content-jsonb-schemas)
5. [Indexes](#5-indexes)
6. [Enum Types](#6-enum-types)
7. [Relationships Diagram](#7-relationships-diagram)
8. [Row-Level Security (V2)](#8-row-level-security-v2)
9. [Migration Strategy](#9-migration-strategy)

---

## 1. Design Decisions

### Why JSONB for Block Content

Block content varies significantly by type. Alternatives considered:

| Approach | Pros | Cons |
|---|---|---|
| **Table-per-type** (5 tables) | Strong FK constraints | 5 migrations per new block type; complex JOINs |
| **JSONB content column** ✓ | Zero migrations for new block types; simple queries | No FK constraints on JSONB; shape enforced at API layer |
| **EAV (Entity-Attribute-Value)** | Flexible | Unreadable, unindexable, unmaintainable |

**Decision: JSONB.** Pydantic v2 enforces shape at the API boundary. Adding a new block type (e.g., `confidence_meter` for V3) is one ENUM addition + one Pydantic schema — zero DB migrations. Postgres stays simple.

### Why Not Supabase Auth

Auth is handled by **Clerk**, not Supabase Auth. Reasons:
- Clerk provides managed sign-in UI, social login, JWT issuance, and webhooks out of the box
- Supabase Auth would require more configuration for social login and JWT customization
- The `users` table mirrors Clerk's user records with app-specific fields (`role`, `display_name`)
- Supabase RLS is OFF in V1 — access control is at the API layer via Clerk JWT verification

### UUID Primary Keys

All tables use `uuid` (generated via `uuid_generate_v4()`) as primary keys. Reasons:
- Distributable — IDs can be generated client-side or server-side
- Non-guessable — no sequential ID enumeration attacks
- Compatible with Supabase's auto-generated APIs (if enabled later)

---

## 2. Schema Overview

```
users
  ↑ (creator_id)
courses
  ↑ (course_id)
  ├── course_chunks    (RAG embeddings)
  ├── lessons
  │     ↑ (lesson_id)
  │     └── blocks
  └── enrollments
        ↑ (enrollment_id)
        ├── block_progress
        ├── code_submissions
        ├── concept_check_attempts
        ├── understanding_check_attempts
        └── questions
```

---

## 3. Table Definitions (Full DDL)

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
```

### Enum Types

```sql
CREATE TYPE user_role AS ENUM ('creator', 'student');
CREATE TYPE course_status AS ENUM ('draft', 'generating', 'ready', 'published', 'failed');
CREATE TYPE lesson_status AS ENUM ('generating', 'ready', 'failed');
CREATE TYPE block_type AS ENUM ('markdown', 'code', 'mermaid', 'concept_check', 'understanding_check');
CREATE TYPE block_progress_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE code_verdict AS ENUM ('passed', 'failed', 'runtime_error', 'compile_error', 'error');
CREATE TYPE understanding_level AS ENUM ('poor', 'fair', 'good', 'excellent');
CREATE TYPE generation_phase AS ENUM (
  'extracting_pdf', 'embedding', 'generating_outline',
  'generating_lesson', 'generating_audio', 'ready', 'failed'
);
```

### `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id   TEXT NOT NULL UNIQUE,           -- Clerk's user ID (e.g., user_2jK...)
    email           TEXT NOT NULL UNIQUE,            -- synced from Clerk
    display_name    TEXT,                            -- synced from Clerk; user can override
    role            user_role NOT NULL DEFAULT 'student',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `courses`

```sql
CREATE TABLE courses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code                VARCHAR(6) UNIQUE,           -- null until published; 6-char alphanumeric
    title               TEXT NOT NULL,
    description         TEXT,
    default_language    TEXT NOT NULL DEFAULT 'python',
    source_pdf_url      TEXT NOT NULL,               -- Supabase Storage path
    custom_prompt       TEXT,
    status              course_status NOT NULL DEFAULT 'draft',
    generation_phase    generation_phase,             -- current pipeline phase (non-null during generating)
    generation_error    TEXT,                         -- last error message (if status = 'failed')
    total_lessons       INT NOT NULL DEFAULT 0,       -- denormalized for dashboard
    total_blocks        INT NOT NULL DEFAULT 0,       -- denormalized for dashboard
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `course_chunks`

```sql
CREATE TABLE course_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    embedding       VECTOR(1536) NOT NULL,            -- Anthropic voyage-3 / OpenAI ada-002 dimension
    chunk_index     INT NOT NULL,
    page_number     INT,                              -- from pdfplumber, null if not available
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `lessons`

```sql
CREATE TABLE lessons (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    position    INT NOT NULL,
    title       TEXT NOT NULL,
    summary     TEXT,
    objectives  TEXT[],                               -- array of learning objectives
    status      lesson_status NOT NULL DEFAULT 'generating',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (course_id, position)
);
```

### `blocks`

```sql
CREATE TABLE blocks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    position        INT NOT NULL,
    type            block_type NOT NULL,
    content         JSONB NOT NULL,                   -- type-specific payload (see §4)
    tts_audio_url   TEXT,                             -- Supabase Storage path; null = no audio
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (lesson_id, position)
);
```

### `enrollments`

```sql
CREATE TABLE enrollments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    current_lesson_id   UUID REFERENCES lessons(id) ON DELETE SET NULL,   -- bookmark
    current_block_id    UUID REFERENCES blocks(id) ON DELETE SET NULL,    -- bookmark
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,

    UNIQUE (user_id, course_id)
);
```

### `block_progress`

```sql
CREATE TABLE block_progress (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id   UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    block_id        UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    status          block_progress_status NOT NULL DEFAULT 'not_started',
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (enrollment_id, block_id)
);
```

### `code_submissions`

```sql
CREATE TABLE code_submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id   UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    block_id        UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    language        TEXT NOT NULL,
    judge0_token    TEXT,                             -- Judge0 submission token
    stdout          TEXT,
    stderr          TEXT,
    exit_code       INT,
    verdict         code_verdict NOT NULL,
    socratic_hint   TEXT,                             -- populated on failure (cached hint)
    attempt_number  INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `concept_check_attempts`

```sql
CREATE TABLE concept_check_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id   UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    block_id        UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    selected_answer TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL,
    explanation     TEXT NOT NULL,                    -- snapshot of explanation served
    attempt_number  INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `understanding_check_attempts`

```sql
CREATE TABLE understanding_check_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id   UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    block_id        UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    response        TEXT NOT NULL,                    -- student's written response
    level           understanding_level NOT NULL,
    feedback        TEXT NOT NULL,                    -- AI's streamed feedback (cached)
    passed          BOOLEAN NOT NULL,
    missing_points  TEXT[],                           -- gaps identified by evaluator
    attempt_number  INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `questions`

```sql
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id   UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    block_id        UUID REFERENCES blocks(id) ON DELETE SET NULL,  -- active block when question was asked
    question_text   TEXT NOT NULL,
    answer_text     TEXT,                             -- null while streaming; populated on completion
    source_chunks   JSONB,                            -- array of { chunk_id, relevance_score }
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Block Content JSONB Schemas

Each `blocks.content` JSONB column holds a type-specific payload. The `blocks.type` column acts as a discriminator.

### `markdown`

```jsonc
{
  "text": "Decorators are functions that take another function as an argument..."
}
```

### `code`

```jsonc
{
  "instruction": "Write a function `add(a, b)` that returns the sum of two numbers.",
  "language": "python",
  "starter_code": "def add(a, b):\n    pass",
  "expected_match": "exact",      // "exact" | "regex" | "ai_eval"
  "expected_output": "5",         // trimmed string for exact; pattern for regex
  "hint_seed_prompt": "Look at the return statement. What should the function give back?"
}
```

### `mermaid`

```jsonc
{
  "instruction": "Here's how an HTTP request flows through the middleware stack:",
  "diagram": "graph LR;\n  Client-->MW1-->MW2-->Handler"
}
```

### `concept_check`

```jsonc
{
  "question": "Is this shared counter implementation thread-safe?",
  "options": ["Yes", "No"],
  "correct": "No",
  "explanation_correct": "Correct — there is no lock protecting the counter mutation, so two threads can race.",
  "explanation_wrong": "Actually, no. Look at the counter mutation: `counter += 1`. Two threads can read the same value simultaneously, then both write back, losing one increment."
}
```

### `understanding_check`

```jsonc
{
  "prompt": "In your own words, explain what a Python decorator does and give a use case where you'd use one.",
  "evaluation_rubric": "A good answer MUST mention: (1) takes a function as argument, (2) wraps it / adds behavior, (3) returns enhanced function. A good answer SHOULD give a real use case (logging, timing, auth). A good answer MUST NOT say it 'modifies the original function' (incorrect — it wraps it).",
  "threshold": "good"             // "poor" | "fair" | "good" | "excellent"
}
```

---

## 5. Indexes

```sql
-- Users
CREATE UNIQUE INDEX idx_users_clerk_user_id ON users (clerk_user_id);
CREATE UNIQUE INDEX idx_users_email ON users (email);

-- Courses
CREATE UNIQUE INDEX idx_courses_code ON courses (code) WHERE code IS NOT NULL;
CREATE INDEX idx_courses_creator_id ON courses (creator_id);
CREATE INDEX idx_courses_status ON courses (status);

-- Course chunks (HNSW vector index for fast cosine similarity search)
CREATE INDEX idx_course_chunks_embedding ON course_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_course_chunks_course_id ON course_chunks (course_id);

-- Lessons
CREATE UNIQUE INDEX idx_lessons_course_position ON lessons (course_id, position);
CREATE INDEX idx_lessons_course_id ON lessons (course_id);

-- Blocks
CREATE UNIQUE INDEX idx_blocks_lesson_position ON blocks (lesson_id, position);
CREATE INDEX idx_blocks_lesson_id ON blocks (lesson_id);
CREATE INDEX idx_blocks_type ON blocks (type);

-- Enrollments
CREATE UNIQUE INDEX idx_enrollments_user_course ON enrollments (user_id, course_id);
CREATE INDEX idx_enrollments_user_id ON enrollments (user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments (course_id);

-- Block progress
CREATE UNIQUE INDEX idx_block_progress_enrollment_block ON block_progress (enrollment_id, block_id);
CREATE INDEX idx_block_progress_enrollment_id ON block_progress (enrollment_id);

-- Code submissions
CREATE INDEX idx_code_submissions_enrollment_block ON code_submissions (enrollment_id, block_id);

-- Understanding check attempts
CREATE INDEX idx_understanding_attempts_enrollment_block ON understanding_check_attempts (enrollment_id, block_id);

-- Questions
CREATE INDEX idx_questions_enrollment_id ON questions (enrollment_id);
```

### HNSW Index Notes

The HNSW index on `course_chunks.embedding` enables fast approximate nearest-neighbor search for RAG retrieval. Parameters:
- `m = 16` — maximum connections per node (higher = better recall, more memory)
- `ef_construction = 64` — search width during index build (higher = better quality, slower build)

At V1 scale (~500 chunks per course, ~10 courses), exact search via `ORDER BY embedding <=> :q LIMIT 5` is also acceptable. HNSW pays off at 100K+ chunks.

---

## 6. Enum Types

### Level Order (for Understanding Check threshold comparison)

```python
# Used in backend code only
LEVEL_ORDER = {
    'poor':      0,
    'fair':      1,
    'good':      2,
    'excellent': 3,
}

def passes_threshold(level: str, threshold: str) -> bool:
    return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold]
```

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

---

## 7. Relationships Diagram

```
users
├── id (PK)
├── clerk_user_id (UNIQUE)
├── email (UNIQUE)
├── display_name
└── role

  ┌───────────────────────┐
  │ courses               │
  ├───────────────────────┤
  │ id (PK)               │
  │ creator_id → users.id │
  │ code (UNIQUE nullable) │
  │ title, description    │
  │ status                │
  └──────────┬────────────┘
             │
    ┌────────┴──────────┐
    │                   │
    ▼                   ▼
course_chunks        lessons
├── id (PK)          ├── id (PK)
├── course_id        ├── course_id
├── content          ├── position
├── embedding        ├── title, summary
└── chunk_index      └── status
                          │
                          ▼
                        blocks
                        ├── id (PK)
                        ├── lesson_id
                        ├── position
                        ├── type
                        ├── content (JSONB)
                        └── tts_audio_url

enrollments
├── id (PK)
├── user_id → users.id
├── course_id → courses.id
├── current_lesson_id → lessons.id  (bookmark)
└── current_block_id → blocks.id    (bookmark)
      │
      ├── block_progress
      │     ├── enrollment_id
      │     ├── block_id
      │     └── status
      │
      ├── code_submissions
      │     ├── enrollment_id
      │     ├── block_id
      │     ├── code, verdict
      │     └── attempt_number
      │
      ├── concept_check_attempts
      │     ├── enrollment_id
      │     ├── block_id
      │     └── is_correct
      │
      ├── understanding_check_attempts
      │     ├── enrollment_id
      │     ├── block_id
      │     ├── level, passed
      │     └── attempt_number
      │
      └── questions
            ├── enrollment_id
            ├── block_id (active when asked)
            ├── question_text
            └── answer_text
```

---

## 8. Row-Level Security (V2)

RLS is **OFF in V1**. Access control is at the API layer (FastAPI `get_current_user` dependency + explicit ownership checks).

V2 will enable RLS for all tables. Policy templates:

```sql
-- Example: students can only read their own enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY enrollments_select ON enrollments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Creators can read all enrollments for their courses
CREATE POLICY enrollments_creator_select ON enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
        AND courses.creator_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text)
    )
  );
```

---

## 9. Migration Strategy

### Tooling

- **Alembic** for schema migrations (async mode via `alembic-async`)
- Migration files in `backend/alembic/versions/`
- Autogenerate from SQLAlchemy models: `alembic revision --autogenerate -m "description"`

### V1 Initial Migration

All tables are created in a single initial migration (`001_initial_schema.py`). Subsequent migrations are additive:
- Add columns (nullable or with defaults to avoid table rewrites)
- Add new tables (always additive)
- Add indexes (non-blocking with `CREATE INDEX CONCURRENTLY`)

### Zero-Downtime Migrations

For V2 with live traffic:
- Use `CREATE INDEX CONCURRENTLY` (non-blocking)
- Never drop a column in the same migration as adding its replacement
- Use `ALTER TABLE ADD COLUMN` with a default before `ALTER TABLE ALTER COLUMN SET NOT NULL`

### Rollback Strategy

Each migration has a `downgrade()` function. In V1 (single developer, single VPS), full rollback is acceptable. In V2+, forward-only migrations with feature flags are preferred.
