# Backend Architecture

## Overview

FastAPI + PostgreSQL backend. All endpoints require a Clerk JWT (`Authorization: Bearer <token>`) except the webhook. The app is a vertical-slice architecture — each feature owns its own `models`, `schemas`, `service`, and `routes`.

```
app/
├── main.py               # App factory, CORS, error handler, router registration
├── features/
│   ├── auth/             # User identity, Clerk webhook
│   ├── authoring/        # Course creation & AI generation pipeline
│   ├── courses/          # Course + lesson read access
│   ├── enrollment/       # Student enrollment by course code
│   ├── tutor/            # AI tutor interactions (SSE streams)
│   └── progress/         # Block-level progress tracking (models only)
└── shared/
    ├── config.py         # Pydantic settings (reads .env)
    ├── db.py             # Async SQLAlchemy session factory
    ├── deps.py           # FastAPI dependencies: get_db, current_user
    └── errors.py         # APIError, NotFoundError, ForbiddenError
```

---

## Request Lifecycle

```
Client
  │
  │  Authorization: Bearer <clerk_jwt>
  ▼
FastAPI Route
  │
  ├─► current_user() dep
  │     │
  │     ├─► ClerkJwksClient  ──► fetch JWKS from Clerk
  │     ├─► ClerkVerifier    ──► verify JWT signature + issuer
  │     └─► get_or_create_user() ──► upsert User row in DB
  │
  ├─► get_db() dep  ──► async SQLAlchemy session (auto commit/rollback)
  │
  └─► Service layer  ──► DB queries / external API calls
        │
        └─► Response (JSON or SSE stream)
```

---

## Features

### 1. Auth (`/api`)

Handles user identity and Clerk webhook sync.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/me` | Return the current authenticated user |
| `POST` | `/api/auth/clerk-webhook` | Receive Clerk `user.created` / `user.updated` events |

**Architecture:**
- `current_user` dependency verifies the Clerk JWT on every request and upserts the user row.
- The webhook (`POST /api/auth/clerk-webhook`) uses `svix` to verify the signature, then calls `get_or_create_user` or `update_user_from_clerk`.
- Users have a `role` field: `student` (default) or `creator`.

**DB table:** `users`

```
users
  id            UUID PK
  clerk_user_id VARCHAR(64) UNIQUE
  email         VARCHAR(254) UNIQUE
  display_name  VARCHAR(120)
  role          ENUM(student, creator)
  created_at, updated_at
```

---

### 2. Authoring (`/api`) — Creator only

Creators upload a PDF → AI pipeline generates course content.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/courses` | Create course from PDF URL + title |
| `GET` | `/api/courses/{course_id}` | Get course (creator only) |
| `POST` | `/api/courses/{course_id}/publish` | Publish course (sets 6-char code) |
| `POST` | `/api/lessons/{lesson_id}/regenerate` | Regenerate a single lesson's blocks |

**Generation pipeline** (runs synchronously on `POST /api/courses`):

```
PDF URL
  │
  ▼
1. Extract text from PDF        (pypdf)
  │
  ▼
2. Chunk text into segments     (~500 tokens each)
  │
  ▼
3. Embed chunks                 (OpenAI text-embedding-3-small → 1536 dims)
     └─► store in course_chunks (pgvector)
  │
  ▼
4. Generate course outline      (Claude — lesson titles + objectives)
  │
  ▼
5. Generate blocks per lesson   (Claude — markdown, code, mermaid,
     └─► store in blocks         concept_check, understanding_check)
  │
  ▼
6. TTS audio per text block     (OpenAI TTS → audio URL)
  │
  ▼
Course status → "ready"
```

`Course.status` tracks pipeline state: `draft → generating → ready → published` (or `failed`).  
`Course.generation_phase` tracks the current step: `extracting | chunking | embedding | outline | blocks | tts`.

**DB tables:** `courses`, `lessons`, `blocks`, `course_chunks`

```
courses
  id, creator_id(FK users), code(6-char, nullable until publish)
  title, description, source_pdf_url, custom_prompt
  status ENUM, generation_phase ENUM, generation_error
  total_lessons, total_blocks

lessons
  id, course_id(FK), position INT, title, summary
  objectives TEXT[], status ENUM(generating|ready|failed)

blocks
  id, lesson_id(FK), position INT
  type ENUM(markdown|code|mermaid|concept_check|understanding_check)
  content JSONB          -- structure varies by type
  tts_audio_url

course_chunks
  id, course_id(FK), content TEXT
  embedding Vector(1536)  -- pgvector
  chunk_index, page_number
```

---

### 3. Courses (`/api`) — Student

Read access to published courses.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/courses` | List courses the current user has access to |
| `GET` | `/api/courses/{course_id}` | Get a single course with lessons |

---

### 4. Enrollment (`/api`)

Students join a course by its 6-character code.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/enrollments` | Enroll in a course by `{ "code": "ABCD12" }` |
| `GET` | `/api/enrollments/{enrollment_id}` | Get enrollment details |

**DB table:** `enrollments`

```
enrollments
  id, user_id(FK), course_id(FK)   UNIQUE(user_id, course_id)
  current_lesson_id(FK nullable)
  current_block_id(FK nullable)
  started_at, completed_at
```

---

### 5. Tutor (`/api`) — AI interactions

All AI responses stream as **Server-Sent Events (SSE)** except `run` and `concept-check`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/lessons/{lesson_id}/blocks` | List all blocks for a lesson |
| `POST` | `/api/blocks/{block_id}/run` | Run code via Judge0 |
| `POST` | `/api/blocks/{block_id}/socratic-hint` | Stream Socratic hint (SSE) |
| `POST` | `/api/blocks/{block_id}/understanding-check` | Stream understanding evaluation (SSE) |
| `POST` | `/api/enrollments/{enrollment_id}/ask` | Stream answer to free question (SSE) |
| `POST` | `/api/blocks/{block_id}/concept-check` | Check MCQ answer (JSON) |

**Code execution flow:**
```
POST /blocks/{id}/run
  │
  └─► Judge0 API  ──► poll until done ──► CodeSubmission row saved
        stdout / stderr / verdict returned as JSON
```

**Socratic hint flow:**
```
POST /blocks/{id}/socratic-hint
  │
  └─► fetch block content + last code submission
  └─► Claude stream  ──► SSE chunks to client
  └─► final text saved to CodeSubmission.socratic_hint
```

**Ask anything flow (RAG):**
```
POST /enrollments/{id}/ask  { question, block_id? }
  │
  └─► embed question  (OpenAI)
  └─► vector search   course_chunks by cosine similarity (pgvector)
  └─► Claude stream   (question + top-k chunks as context)  ──► SSE
  └─► save Question row with answer + source_chunks
```

**DB tables:** `code_submissions`, `concept_check_attempts`, `understanding_check_attempts`, `questions`, `block_progress`

```
code_submissions
  id, enrollment_id(FK), block_id(FK)
  code, language, judge0_token
  stdout, stderr, exit_code
  verdict ENUM(passed|failed|runtime_error|compile_error|error)
  socratic_hint, attempt_number

concept_check_attempts
  id, enrollment_id(FK), block_id(FK)
  selected_answer, is_correct, explanation, attempt_number

understanding_check_attempts
  id, enrollment_id(FK), block_id(FK)
  response, level ENUM(poor|fair|good|excellent)
  feedback, passed, missing_points TEXT[], attempt_number

questions
  id, enrollment_id(FK), block_id(FK nullable)
  question_text, answer_text, source_chunks JSONB

block_progress
  id, enrollment_id(FK), block_id(FK)   UNIQUE(enrollment_id, block_id)
  status ENUM(not_started|in_progress|completed)
  completed_at
```

---

## Full Data Model Diagram

```
users ──────────────────────────────────────────────────────────────────┐
  │                                                                      │
  │ creator_id                                                           │ user_id
  ▼                                                                      ▼
courses ──────────────────────────────────────────────────────────── enrollments
  │                                                  code(6-char) ──► (join by code)
  │ course_id                                                            │
  ▼                                                                      │ enrollment_id
lessons                                                                  │
  │                                                                      ├─► code_submissions
  │ lesson_id                                                            ├─► concept_check_attempts
  ▼                                                                      ├─► understanding_check_attempts
blocks ◄──────────────────────────────────────────────────────────────  ├─► questions
  │                                                  block_id ──────────  └─► block_progress
  │ course_id
  ▼
course_chunks (embeddings)
```

---

## External Services

| Service | Used for |
|---------|----------|
| **Clerk** | JWT auth, JWKS endpoint, webhook for user sync |
| **Anthropic Claude** | Course outline generation, block generation, Socratic hints, understanding checks, ask-anything RAG |
| **OpenAI** | Text embeddings (`text-embedding-3-small`), TTS audio |
| **Judge0** | Sandboxed code execution |
| **Supabase** | File/audio storage (PDF source, TTS audio URLs) |

---

## Error Handling

All errors extend `APIError(HTTPException)` and return `{"detail": "message"}`.

| Class | HTTP Status |
|-------|-------------|
| `NotFoundError` | 404 |
| `ForbiddenError` | 403 |
| `GenerationError` | 500 |

The app-level `exception_handler` in `main.py` catches all `APIError` subclasses.

---

## Health Check

`GET /healthz` — returns `{"status": "ok"}`, no auth required.
