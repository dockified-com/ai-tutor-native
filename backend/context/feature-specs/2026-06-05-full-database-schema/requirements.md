# Requirements — Phase 2A: Full Database Schema

**Phase:** 2 (Week 2A)
**Branch:** `feature/phase-2a-full-database-schema`
**Created:** 2026-06-05
**Sources:** `backend/context/5-roadmap.md`, `backend/context/phase-2a-task-breakdown.md`

---

## Scope

Implement all remaining ORM models for the V1 schema and generate a single
Alembic migration that creates the 10 new database tables.

Phase 2A covers **schema only** — no service logic, no API routes, no tests beyond
import-level smoke checks. Business logic belongs to later phases.

### Tables introduced

| Table | Module | New enums |
|---|---|---|
| `courses` | `features/courses` | `CourseStatus`, `GenerationPhase` |
| `lessons` | `features/authoring` | `LessonStatus` |
| `blocks` | `features/authoring` | `BlockType` |
| `course_chunks` | `features/authoring` | — |
| `enrollments` | `features/enrollment` | — |
| `block_progress` | `features/progress` | `BlockProgressStatus` |
| `code_submissions` | `features/tutor` | `CodeVerdict` |
| `concept_check_attempts` | `features/tutor` | — |
| `understanding_check_attempts` | `features/tutor` | `UnderstandingLevel` |
| `questions` | `features/tutor` | — |

---

## Decisions

### D1 — Single migration, no splits
All 10 tables ship in one Alembic revision (`"add full schema"`).
Splitting into multiple revisions is **not permitted** for this phase.

### D2 — All models inherit `app.shared.db.Base`
No standalone `DeclarativeBase` subclasses. The shared `Base` from `app/shared/db.py`
is the single source of truth for all ORM models in the project.

### D3 — SQLAlchemy async patterns only
Use `Mapped[...]` annotations and `mapped_column()` throughout.
Never use the legacy `Column()` API; it is incompatible with the async session.

### D4 — pgvector required for `CourseChunk`
The `embedding` column on `course_chunks` uses `VECTOR(1536)`.
The `pgvector` Python package must be imported and the `Vector` type used.
The Postgres `pgvector` extension must already be enabled on the database
(it is enabled via the existing dev Docker image).

### D5 — Models are pure schema — no business logic
No service methods, no properties that issue DB queries, no `@validates` hooks
that call external APIs. Keep models to column declarations and relationships only.

### D6 — Tasks A1–A4 are parallelizable; B1 is sequential
Group A tasks have no inter-dependencies and may be executed concurrently.
Task B1 (migration) must not start until all four Group A tasks are complete
and each module is importable without errors.

### D7 — `__init__.py` stubs must export nothing (yet)
Each new feature package needs an `__init__.py` to be importable.
Do not add any exports; later phases will populate them.

### D8 — Updated-at columns use SQLAlchemy `onupdate`
For tables with `updated_at`, use `onupdate=func.now()` in the column definition
so Alembic does not need a trigger and the column is always current.

---

## Context

- **Why now?** Phase 1 (Auth Layer) is 100% complete. Phase 2A unblocks all
  subsequent phases: 2B (shared infra), 2C (generation pipeline), and beyond.
  Every later feature depends on these tables existing.
- **pgvector:** Already enabled on the dev Postgres image. The `pgvector` Python
  package is listed in `pyproject.toml` under dependencies.
- **Alembic env:** `backend/alembic/env.py` currently imports only `auth.models`.
  The migration will produce an empty diff unless all new model modules are
  imported there before running autogenerate.
- **No seed data:** This phase creates schema only. No fixtures or seed scripts.
- **Review checklist before merge:** See `validation.md`.
