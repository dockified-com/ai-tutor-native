# Implementation Plan: Courses & Enrollment (Week 3)

This plan breaks the `features/courses`, `features/enrollment`, and the
`tutor/` blocks endpoint into atomic task groups. Independent slices are marked as
**parallelizable via subagent**.

> Per user memory: parallel/subagent dispatches use the `minimax-m2.5` model.

---

## Task Group 0: Open Decision — resolve before Task Group 3 (BLOCKING)

The `GET /api/lessons/{id}/blocks` endpoint belongs in `tutor/routes.py` (per roadmap),
but it must read the `Lesson` and `Block` ORM models, which are **owned by
`authoring/`**. Importing `authoring/models.py` from `tutor/` violates the
no-cross-feature-import rule in `2-code-standard.md`.

**Resolve with the user which approach to take:**
- **(A)** Read the tables via raw SQL / `db.execute(text(...))` from `tutor/service.py`
  (no model import; treats the tables as a data boundary).
- **(B)** Place the blocks endpoint in `authoring/routes.py` instead of `tutor/`
  (deviates from the roadmap's stated file location).
- **(C)** Declare ORM model modules a shared read-only boundary (amend the standard).

Do not start Task Group 3 until this is decided. Groups 1 and 2 are unaffected.

---

## Task Group 1: Courses Feature (`features/courses/`) — parallelizable via subagent

1. **`courses/schemas.py`**
   - `CourseOut` (id, code, title, description, default_language, status,
     generation_phase, total_lessons, total_blocks, created_at, updated_at).
     `model_config = {"from_attributes": True}`.
   - `CourseListOut` if a list wrapper is wanted (or return `list[CourseOut]`).
2. **`courses/service.py`**
   - `list_courses(db, creator_id) -> list[Course]` — `WHERE creator_id = :uid`,
     ordered by `created_at DESC`.
   - `get_course(db, user_id, course_id) -> Course` — ownership/visibility check:
     own course (any status) OR `published`; else `NotFoundError`.
3. **`courses/routes.py`**
   - `GET /api/courses` → `list_courses`, scoped to `current_user`.
   - `GET /api/courses/{id}` → `get_course`.
   - Both `Depends(current_user)`, `Depends(get_db)`. Routes call services only.
4. **`courses/__init__.py`** — `from .routes import router` / `__all__ = ["router"]`.

*Subagent (minimax-m2.5) can own this entire group; it is self-contained.*

---

## Task Group 2: Enrollment Feature (`features/enrollment/`) — parallelizable via subagent

1. **`enrollment/schemas.py`**
   - `EnrollByCodeRequest` (`code: str`, length 6).
   - `EnrollmentOut` (id, course_id, current_lesson_id, current_block_id, started_at,
     completed_at). `from_attributes`.
2. **`enrollment/service.py`**
   - `enroll_by_code(db, user_id, code) -> Enrollment` — resolve code → course;
     require `status == published` (else `NotFoundError`); create enrollment; on
     `UNIQUE(user_id, course_id)` conflict return the existing enrollment (idempotent).
   - `get_enrollment(db, user_id, enrollment_id) -> Enrollment` — `ForbiddenError`
     if `enrollment.user_id != user_id`; `NotFoundError` if absent.
3. **`enrollment/routes.py`**
   - `POST /api/enrollments` (body `EnrollByCodeRequest`) → `enroll_by_code`, 201.
   - `GET /api/enrollments/{id}` → `get_enrollment`.
4. **`enrollment/__init__.py`** — export `router`.

*Subagent (minimax-m2.5) can own this entire group; it is self-contained.*
*Groups 1 and 2 have no shared files and can run concurrently.*

---

## Task Group 3: Lesson Blocks Endpoint + Stripping (Sequential — after Group 0)

1. **`tutor/schemas.py`** — `BlockOut` (id, position, type, content: dict, tts_audio_url).
2. **Sensitive-field stripping helper** (in `tutor/service.py`):
   - `code` → drop `solution`, `tests`.
   - `concept_check` / `understanding_check` → drop `correct_index`, `explanation`.
   - others → unchanged. Centralized + unit-tested.
3. **`tutor/service.py`** — `get_lesson_blocks(db, lesson_id) -> list[BlockOut]`
   (per Group 0 decision: raw SQL or model access). Order by `Block.position`.
4. **`tutor/routes.py`** — `GET /api/lessons/{id}/blocks`, `Depends(current_user)`.
5. **`tutor/__init__.py`** — export `router`.

---

## Task Group 4: Router Registration (Sequential — after 1–3)

1. Register in `app/main.py`: `courses_router`, `enrollment_router`, `tutor_router`.
   Follow the existing `app.include_router(...)` pattern (routers already carry
   `prefix="/api"`).

---

## Task Group 5: Tests (Sequential — after 1–4)

1. **Unit** (`tests/unit/`):
   - Stripping helper removes exactly the answer fields per block type and leaves
     safe fields intact.
   - `EnrollByCodeRequest` validation (6-char code).
2. **Integration** (`tests/integration/`, `httpx.AsyncClient` + `ASGITransport`):
   - `GET /api/courses` returns only the caller's courses.
   - `GET /api/courses/{id}` 404s on another creator's unpublished course.
   - `POST /api/enrollments` enrolls by code; duplicate is idempotent; unknown/unpublished code 404s.
   - `GET /api/enrollments/{id}` 403s for a non-owner.
   - `GET /api/lessons/{id}/blocks` response contains no `solution`/`tests`/
     `correct_index`/`explanation`.
   - All external calls mocked; no real API budget consumed.

---

## Task Group 6: Progress Tracking (Sequential — final)

1. Update `backend/context/4-progress-tracker.md` and any status markers per
   `3-ai-workflow.md` Step 6.
