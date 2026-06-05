# Plan — Phase 2A: Full Database Schema

**Branch:** `feature/phase-2a-full-database-schema`
**Roadmap ref:** `backend/context/5-roadmap.md` → Phase 2 (Week 2A)
**Tracker ref:** `backend/context/4-progress-tracker.md` → Week 2A rows

---

## Group A — ORM Model Files (Parallelizable)

Tasks A1–A4 are independent. They can be assigned to separate agents or executed
concurrently. Each task is complete when its file exists, is importable, and all
models pass a quick `python -c "from app.features.<module>.models import *"` check.

### Task A1 — `app/features/courses/models.py`

1. Create `CourseStatus` str-enum: `draft | generating | ready | published | failed`
2. Create `GenerationPhase` str-enum (values: phases of the generation pipeline)
3. Create `Course` ORM model inheriting `Base`:
   - `id` UUID PK (server_default `gen_random_uuid()`)
   - `creator_id` UUID FK → `users.id` CASCADE DELETE
   - `code` VARCHAR(6) UNIQUE nullable
   - `title` TEXT NOT NULL
   - `description` TEXT nullable
   - `default_language` TEXT DEFAULT `'python'`
   - `source_pdf_url` TEXT NOT NULL
   - `custom_prompt` TEXT nullable
   - `status` `CourseStatus` enum DEFAULT `'draft'`
   - `generation_phase` `GenerationPhase` enum nullable
   - `generation_error` TEXT nullable
   - `total_lessons` INT DEFAULT 0
   - `total_blocks` INT DEFAULT 0
   - `created_at` TIMESTAMPTZ DEFAULT NOW()
   - `updated_at` TIMESTAMPTZ DEFAULT NOW()
4. Create `app/features/courses/__init__.py` stub

---

### Task A2 — `app/features/authoring/models.py`

1. Create `LessonStatus` str-enum: `generating | ready | failed`
2. Create `BlockType` str-enum: `markdown | code | mermaid | concept_check | understanding_check`
3. Create `Lesson` ORM model inheriting `Base`:
   - `id` UUID PK
   - `course_id` UUID FK → `courses.id` CASCADE DELETE
   - `position` INT NOT NULL
   - `title` TEXT NOT NULL
   - `summary` TEXT nullable
   - `objectives` ARRAY(TEXT) nullable
   - `status` `LessonStatus` DEFAULT `'generating'`
   - `created_at` / `updated_at` TIMESTAMPTZ
   - UniqueConstraint(`course_id`, `position`)
4. Create `Block` ORM model inheriting `Base`:
   - `id` UUID PK
   - `lesson_id` UUID FK → `lessons.id` CASCADE DELETE
   - `position` INT NOT NULL
   - `type` `BlockType` enum NOT NULL
   - `content` JSONB NOT NULL
   - `tts_audio_url` TEXT nullable
   - `created_at` / `updated_at` TIMESTAMPTZ
   - UniqueConstraint(`lesson_id`, `position`)
5. Create `CourseChunk` ORM model inheriting `Base`:
   - `id` UUID PK
   - `course_id` UUID FK → `courses.id` CASCADE DELETE
   - `content` TEXT NOT NULL
   - `embedding` VECTOR(1536) NOT NULL  ← requires `pgvector` extension
   - `chunk_index` INT NOT NULL
   - `page_number` INT nullable
   - `created_at` TIMESTAMPTZ
6. Create `app/features/authoring/__init__.py` stub

---

### Task A3 — `app/features/enrollment/models.py` + `app/features/progress/models.py`

1. Create `Enrollment` ORM model in `enrollment/models.py`:
   - `id` UUID PK
   - `user_id` UUID FK → `users.id` CASCADE DELETE
   - `course_id` UUID FK → `courses.id` CASCADE DELETE
   - `current_lesson_id` UUID FK → `lessons.id` SET NULL nullable
   - `current_block_id` UUID FK → `blocks.id` SET NULL nullable
   - `started_at` TIMESTAMPTZ DEFAULT NOW()
   - `completed_at` TIMESTAMPTZ nullable
   - UniqueConstraint(`user_id`, `course_id`)
2. Create `app/features/enrollment/__init__.py` stub
3. Create `BlockProgressStatus` str-enum in `progress/models.py`: `not_started | in_progress | completed`
4. Create `BlockProgress` ORM model in `progress/models.py`:
   - `id` UUID PK
   - `enrollment_id` UUID FK → `enrollments.id` CASCADE DELETE
   - `block_id` UUID FK → `blocks.id` CASCADE DELETE
   - `status` `BlockProgressStatus` DEFAULT `'not_started'`
   - `completed_at` TIMESTAMPTZ nullable
   - `created_at` / `updated_at` TIMESTAMPTZ
   - UniqueConstraint(`enrollment_id`, `block_id`)
5. Create `app/features/progress/__init__.py` stub

---

### Task A4 — `app/features/tutor/models.py`

1. Create `CodeVerdict` str-enum: `passed | failed | runtime_error | compile_error | error`
2. Create `UnderstandingLevel` str-enum: `poor | fair | good | excellent`
3. Create `CodeSubmission` ORM model:
   - `id` UUID PK
   - `enrollment_id` UUID FK → `enrollments.id` CASCADE DELETE
   - `block_id` UUID FK → `blocks.id` CASCADE DELETE
   - `code` TEXT NOT NULL
   - `language` TEXT NOT NULL
   - `judge0_token` TEXT nullable
   - `stdout` / `stderr` TEXT nullable
   - `exit_code` INT nullable
   - `verdict` `CodeVerdict` enum
   - `socratic_hint` TEXT nullable
   - `attempt_number` INT DEFAULT 1
   - `created_at` TIMESTAMPTZ
4. Create `ConceptCheckAttempt` ORM model:
   - `id` UUID PK
   - `enrollment_id` / `block_id` UUID FK (CASCADE)
   - `selected_answer` TEXT NOT NULL
   - `is_correct` BOOL NOT NULL
   - `explanation` TEXT NOT NULL
   - `attempt_number` INT DEFAULT 1
   - `created_at` TIMESTAMPTZ
5. Create `UnderstandingCheckAttempt` ORM model:
   - `id` UUID PK
   - `enrollment_id` / `block_id` UUID FK
   - `response` TEXT NOT NULL
   - `level` `UnderstandingLevel` enum
   - `feedback` TEXT NOT NULL
   - `passed` BOOL NOT NULL
   - `missing_points` ARRAY(TEXT) nullable
   - `attempt_number` INT DEFAULT 1
   - `created_at` TIMESTAMPTZ
6. Create `Question` ORM model:
   - `id` UUID PK
   - `enrollment_id` UUID FK → `enrollments.id` CASCADE DELETE
   - `block_id` UUID FK → `blocks.id` SET NULL nullable
   - `question_text` TEXT NOT NULL
   - `answer_text` TEXT nullable
   - `source_chunks` JSONB nullable
   - `created_at` / `updated_at` TIMESTAMPTZ
7. Create `app/features/tutor/__init__.py` stub

---

## Group B — Migration Assembly (Sequential — requires all of Group A)

Do not begin Group B until Tasks A1–A4 are all marked complete.

### Task B1 — Alembic wiring & migration

1. Update `backend/alembic/env.py` — add imports under the existing auth model import:
   ```python
   from app.features.courses import models    # noqa: F401
   from app.features.authoring import models  # noqa: F401
   from app.features.enrollment import models # noqa: F401
   from app.features.progress import models   # noqa: F401
   from app.features.tutor import models      # noqa: F401
   ```
2. Confirm the dev DB is running (`docker compose -f docker-compose.dev.yml up -d`)
3. Run autogenerate:
   ```bash
   cd backend && alembic revision --autogenerate -m "add full schema"
   ```
4. Review the generated migration file and verify:
   - Exactly 10 new table `op.create_table()` calls
   - All FK constraints reference the correct parent table
   - UNIQUE constraints on composite keys are present
   - `pgvector` `VECTOR` type used for `course_chunks.embedding`
   - Enum types declared before the tables that use them
5. Run `alembic upgrade head` against the dev DB — confirm 0 errors
6. Run `alembic downgrade -1` — confirm clean rollback with no orphan objects
7. Update `backend/context/4-progress-tracker.md` — flip all Week 2A rows from 🔴 to ✅
