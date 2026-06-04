# Phase 2 (Week 2A) Task Breakdown for Multiple Agents

This document breaks down the work for Phase 2 (Full Database Schema) into atomic tasks that can be assigned to multiple agents.

## Goal
Implement the full ORM schema as defined in `docs/architecture/04_backend_plan.md` and `docs/product/02_roadmap.md`, generating the Alembic migration.

## Execution Rules
- **Task independence**: Tasks within a phase can be executed in parallel.
- **Dependencies**: Tasks in Phase 2B depend on ALL tasks in Phase 2A being completed. Phase 2C depends on Phase 2B.
- **Base model**: All models must inherit from `app.shared.db.Base`.

---

## Task Group A: Database Model Implementations (Parallelizable)

These tasks can be assigned to different agents to execute simultaneously. They involve writing Pydantic and SQLAlchemy ORM models.

### Task A1: Courses Module
- **Agent Assignment:** Agent 1
- **File:** `backend/app/features/courses/models.py`
- **Responsibilities:**
  - Create `CourseStatus` enum (`draft`, `generating`, `ready`, `published`, `failed`).
  - Create `GenerationPhase` enum.
  - Create `Course` ORM model.
    - `id` (UUID PK)
    - `creator_id` (UUID FK to `users.id` with CASCADE)
    - `code` (VARCHAR(6) UNIQUE nullable)
    - `title` (TEXT NOT NULL)
    - `description` (TEXT nullable)
    - `default_language` (TEXT DEFAULT 'python')
    - `source_pdf_url` (TEXT NOT NULL)
    - `custom_prompt` (TEXT nullable)
    - `status` (CourseStatus enum)
    - `generation_phase` (GenerationPhase enum nullable)
    - `generation_error` (TEXT nullable)
    - `total_lessons` (INT DEFAULT 0)
    - `total_blocks` (INT DEFAULT 0)
    - `created_at` (TIMESTAMPTZ DEFAULT NOW())
    - `updated_at` (TIMESTAMPTZ DEFAULT NOW())
- **Definition of Done:** `models.py` is created with valid SQLAlchemy models.

### Task A2: Authoring Module
- **Agent Assignment:** Agent 2
- **File:** `backend/app/features/authoring/models.py`
- **Responsibilities:**
  - Create `LessonStatus` enum (`generating`, `ready`, `failed`).
  - Create `BlockType` enum (`markdown`, `code`, `mermaid`, `concept_check`, `understanding_check`).
  - Create `Lesson` ORM model.
    - `id` (UUID PK)
    - `course_id` (UUID FK to `courses.id` CASCADE)
    - `position` (INT NOT NULL)
    - `title` (TEXT NOT NULL)
    - `summary` (TEXT nullable)
    - `objectives` (ARRAY of TEXT nullable)
    - `status` (LessonStatus enum DEFAULT 'generating')
    - `created_at`, `updated_at` (TIMESTAMPTZ)
    - UNIQUE constraint on (`course_id`, `position`)
  - Create `Block` ORM model.
    - `id` (UUID PK)
    - `lesson_id` (UUID FK to `lessons.id` CASCADE)
    - `position` (INT NOT NULL)
    - `type` (BlockType enum)
    - `content` (JSONB NOT NULL)
    - `tts_audio_url` (TEXT nullable)
    - `created_at`, `updated_at` (TIMESTAMPTZ)
    - UNIQUE constraint on (`lesson_id`, `position`)
  - Create `CourseChunk` ORM model.
    - `id` (UUID PK)
    - `course_id` (UUID FK to `courses.id` CASCADE)
    - `content` (TEXT NOT NULL)
    - `embedding` (VECTOR(1536) NOT NULL - requires `pgvector`)
    - `chunk_index` (INT NOT NULL)
    - `page_number` (INT nullable)
    - `created_at` (TIMESTAMPTZ)
- **Definition of Done:** `models.py` is created with valid SQLAlchemy models.

### Task A3: Enrollment & Progress Modules
- **Agent Assignment:** Agent 3
- **Files:** `backend/app/features/enrollment/models.py`, `backend/app/features/progress/models.py`
- **Responsibilities:**
  - In `enrollment/models.py`, create `Enrollment` ORM model.
    - `id` (UUID PK)
    - `user_id` (UUID FK to `users.id` CASCADE)
    - `course_id` (UUID FK to `courses.id` CASCADE)
    - `current_lesson_id` (UUID FK to `lessons.id` SET NULL nullable)
    - `current_block_id` (UUID FK to `blocks.id` SET NULL nullable)
    - `started_at` (TIMESTAMPTZ DEFAULT NOW())
    - `completed_at` (TIMESTAMPTZ nullable)
    - UNIQUE constraint on (`user_id`, `course_id`)
  - In `progress/models.py`, create `BlockProgressStatus` enum (`not_started`, `in_progress`, `completed`).
  - In `progress/models.py`, create `BlockProgress` ORM model.
    - `id` (UUID PK)
    - `enrollment_id` (UUID FK to `enrollments.id` CASCADE)
    - `block_id` (UUID FK to `blocks.id` CASCADE)
    - `status` (BlockProgressStatus enum DEFAULT 'not_started')
    - `completed_at` (TIMESTAMPTZ nullable)
    - `created_at`, `updated_at` (TIMESTAMPTZ)
    - UNIQUE constraint on (`enrollment_id`, `block_id`)
- **Definition of Done:** Both `models.py` files are created with valid SQLAlchemy models.

### Task A4: Tutor Module
- **Agent Assignment:** Agent 4
- **File:** `backend/app/features/tutor/models.py`
- **Responsibilities:**
  - Create `CodeVerdict` enum (`passed`, `failed`, `runtime_error`, `compile_error`, `error`).
  - Create `UnderstandingLevel` enum (`poor`, `fair`, `good`, `excellent`).
  - Create `CodeSubmission` ORM model.
    - `id` (UUID PK)
    - `enrollment_id` (UUID FK to `enrollments.id` CASCADE)
    - `block_id` (UUID FK to `blocks.id` CASCADE)
    - `code` (TEXT NOT NULL)
    - `language` (TEXT NOT NULL)
    - `judge0_token` (TEXT nullable)
    - `stdout` (TEXT nullable)
    - `stderr` (TEXT nullable)
    - `exit_code` (INT nullable)
    - `verdict` (CodeVerdict enum)
    - `socratic_hint` (TEXT nullable)
    - `attempt_number` (INT DEFAULT 1)
    - `created_at` (TIMESTAMPTZ)
  - Create `ConceptCheckAttempt` ORM model.
    - `id` (UUID PK)
    - `enrollment_id` (UUID FK to `enrollments.id` CASCADE)
    - `block_id` (UUID FK to `blocks.id` CASCADE)
    - `selected_answer` (TEXT NOT NULL)
    - `is_correct` (BOOL NOT NULL)
    - `explanation` (TEXT NOT NULL)
    - `attempt_number` (INT DEFAULT 1)
    - `created_at` (TIMESTAMPTZ)
  - Create `UnderstandingCheckAttempt` ORM model.
    - `id` (UUID PK)
    - `enrollment_id` (UUID FK to `enrollments.id` CASCADE)
    - `block_id` (UUID FK to `blocks.id` CASCADE)
    - `response` (TEXT NOT NULL)
    - `level` (UnderstandingLevel enum)
    - `feedback` (TEXT NOT NULL)
    - `passed` (BOOL NOT NULL)
    - `missing_points` (ARRAY of TEXT nullable)
    - `attempt_number` (INT DEFAULT 1)
    - `created_at` (TIMESTAMPTZ)
  - Create `Question` ORM model.
    - `id` (UUID PK)
    - `enrollment_id` (UUID FK to `enrollments.id` CASCADE)
    - `block_id` (UUID FK to `blocks.id` SET NULL nullable)
    - `question_text` (TEXT NOT NULL)
    - `answer_text` (TEXT nullable)
    - `source_chunks` (JSONB nullable)
    - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Definition of Done:** `models.py` is created with valid SQLAlchemy models.

---

## Task Group B: Migration Generation (Sequential - Requires Group A completion)

### Task B1: Migration Assembly
- **Agent Assignment:** 1 Agent (Lead)
- **Dependencies:** Task A1, A2, A3, A4 must be COMPLETE.
- **Responsibilities:**
  - Create `__init__.py` stubs for `courses`, `authoring`, `enrollment`, `progress`, and `tutor`.
  - Update `backend/alembic/env.py` to import all the new models (`app.features.courses.models`, etc.).
  - Run `alembic revision --autogenerate -m "add full schema"`.
  - Verify the generated migration covers all 10 new tables and includes appropriate enums, foreign keys, and indexes.
- **Definition of Done:** Migration script is generated successfully and passes a review for accuracy against the schema specifications.
