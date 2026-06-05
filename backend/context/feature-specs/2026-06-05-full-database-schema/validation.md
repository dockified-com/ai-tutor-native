# Validation — Phase 2A: Full Database Schema

**Phase:** 2 (Week 2A)
**Branch:** `feature/phase-2a-full-database-schema`
**Created:** 2026-06-05

All checks below must pass before this branch is considered mergeable.
Run them in order; stop and fix on the first failure.

---

## V1 — Import smoke test (all Group A files present and importable)

Run from the `backend/` directory with the virtualenv active:

```bash
python -c "
from app.features.courses.models import Course, CourseStatus, GenerationPhase
from app.features.authoring.models import Lesson, Block, CourseChunk, LessonStatus, BlockType
from app.features.enrollment.models import Enrollment
from app.features.progress.models import BlockProgress, BlockProgressStatus
from app.features.tutor.models import (
    CodeSubmission, ConceptCheckAttempt,
    UnderstandingCheckAttempt, Question,
    CodeVerdict, UnderstandingLevel,
)
print('All imports OK')
"
```

**Pass:** Prints `All imports OK` with no tracebacks.
**Fail:** Any `ImportError` or `AttributeError` means a model or enum is missing.

---

## V2 — Alembic autogenerate produces exactly 10 new tables

After running `alembic revision --autogenerate -m "add full schema"`, open the
generated file in `alembic/versions/` and count the `op.create_table(` calls.

```bash
grep -c "op.create_table(" alembic/versions/*add_full_schema*.py
```

**Pass:** Output is `10`.
**Fail:** Any other number indicates a missing or duplicate model import.

---

## V3 — All FK constraints present in migration

Check that each expected FK appears in the migration:

| Column | References |
|---|---|
| `courses.creator_id` | `users.id` |
| `lessons.course_id` | `courses.id` |
| `blocks.lesson_id` | `lessons.id` |
| `course_chunks.course_id` | `courses.id` |
| `enrollments.user_id` | `users.id` |
| `enrollments.course_id` | `courses.id` |
| `enrollments.current_lesson_id` | `lessons.id` |
| `enrollments.current_block_id` | `blocks.id` |
| `block_progress.enrollment_id` | `enrollments.id` |
| `block_progress.block_id` | `blocks.id` |
| `code_submissions.enrollment_id` | `enrollments.id` |
| `code_submissions.block_id` | `blocks.id` |
| `concept_check_attempts.enrollment_id` | `enrollments.id` |
| `concept_check_attempts.block_id` | `blocks.id` |
| `understanding_check_attempts.enrollment_id` | `enrollments.id` |
| `understanding_check_attempts.block_id` | `blocks.id` |
| `questions.enrollment_id` | `enrollments.id` |
| `questions.block_id` | `blocks.id` |

**Pass:** Every row above is represented by an `op.create_foreign_key(` call.
**Fail:** Missing or incorrect FK — fix the model and regenerate.

---

## V4 — UNIQUE constraints present

Verify that composite UNIQUE constraints appear in the migration:

```bash
grep -c "op.create_unique_constraint(" alembic/versions/*add_full_schema*.py
```

Expected minimum of **4** unique constraints:
- `(course_id, position)` on `lessons`
- `(lesson_id, position)` on `blocks`
- `(user_id, course_id)` on `enrollments`
- `(enrollment_id, block_id)` on `block_progress`

**Pass:** Count ≥ 4 and each composite key is present.

---

## V5 — pgvector VECTOR type in migration

```bash
grep "Vector" alembic/versions/*add_full_schema*.py
```

**Pass:** At least one line matches (the `embedding` column on `course_chunks`).
**Fail:** The `pgvector` import is missing in `authoring/models.py`.

---

## V6 — `alembic upgrade head` applies cleanly

With the dev DB running:

```bash
alembic upgrade head
```

**Pass:** Command exits 0, no SQL errors in output.
**Fail:** Any Postgres error (missing extension, type conflict, FK violation) must
be fixed in the model or migration before proceeding.

---

## V7 — `alembic downgrade -1` reverses cleanly

```bash
alembic downgrade -1
```

**Pass:** Command exits 0, all 10 new tables are dropped, no orphan objects remain.
**Fail:** Any error or leftover table — the `downgrade()` function in the migration
must be reviewed and corrected.

---

## V8 — Existing auth tests still pass

```bash
pytest tests/unit/test_clerk_jwt.py tests/unit/test_config.py \
       tests/integration/test_clerk_webhook.py \
       tests/integration/test_me_endpoint.py -v
```

**Pass:** All 4 test files green (same baseline as Phase 1 merge).
**Fail:** Any regression in auth tests must be resolved before merge — Phase 2A
must not break Phase 1.

---

## Merge Checklist

- [ ] V1 — import smoke test passes
- [ ] V2 — migration contains exactly 10 `create_table` calls
- [ ] V3 — all FK constraints present
- [ ] V4 — all UNIQUE constraints present (≥ 4)
- [ ] V5 — pgvector `Vector` type in migration
- [ ] V6 — `alembic upgrade head` exits 0
- [ ] V7 — `alembic downgrade -1` exits 0
- [ ] V8 — existing auth tests pass
- [ ] `backend/context/4-progress-tracker.md` Week 2A rows flipped to ✅
