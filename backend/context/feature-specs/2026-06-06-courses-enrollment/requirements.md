# Requirements: Courses & Enrollment (Week 3)

## Context & Scope
With the generation pipeline (Week 2C) complete, creators can produce and publish
courses. Week 3 makes those courses consumable: creators can list and inspect their
own courses, students can enroll into a published course **by its 6-character code**,
and an enrolled student can fetch a lesson's blocks with all answer-revealing fields
stripped server-side.

This phase implements roadmap **Phase 5 — Week 3: Courses & Enrollment**:
1. `courses/` — `service.py`, `schemas.py`, `routes.py` → `GET /api/courses`, `GET /api/courses/{id}`
2. `enrollment/` — `service.py`, `schemas.py`, `routes.py` → `POST /api/enrollments`, `GET /api/enrollments/{id}`
3. `GET /api/lessons/{id}/blocks` (in `tutor/routes.py`) — strip sensitive fields before response
4. Register routers in `app/main.py`

## Architectural Decisions

1. **Enroll by code.** `POST /api/enrollments` accepts a 6-char `code` in the JSON body.
   The service resolves the code to a course, requires `status == 'published'`, and
   creates an `Enrollment` for `current_user`. Students never see or use raw course IDs
   to join. (Confirmed with user.)

2. **`GET /api/courses` returns the creator's own courses.** Scoped to
   `Course.creator_id == current_user.id` — this is the creator dashboard view, not a
   public catalog. Students discover courses by code, not by browsing. (Confirmed with user.)

3. **Multi-tenancy / ownership enforced in services, not routes.** Per `2-code-standard.md`:
   - `GET /api/courses/{id}` — a creator may view their own course (any status); a course
     that is not owned by the user and not `published` returns 403/404 appropriately.
   - `GET /api/enrollments/{id}` — only the owning student (`enrollment.user_id ==
     current_user.id`) may read it; otherwise `ForbiddenError` (403).

4. **Sensitive-field stripping on `GET /api/lessons/{id}/blocks`.** Blocks are stored as
   JSONB. Answer-revealing fields MUST be removed before returning to a student:
   - `code` blocks → strip `solution` and `tests` (keep `language`, `starter_code`).
   - `concept_check` / `understanding_check` blocks → strip `correct_index` and
     `explanation` (keep `question`, `options`).
   - `markdown` / `mermaid` blocks → returned as-is.
   > Note: `2-code-standard.md` names `hint_seed_prompt` and `evaluation_rubric` as the
   > canonical strip targets, but the schema actually shipped in Week 2C
   > (`authoring/schemas.py`) stores `solution`, `tests`, `correct_index`, and
   > `explanation`. We strip the fields that actually exist and reveal answers. The
   > stripping logic is centralized so it stays correct as the block schema evolves.

5. **Pydantic at every boundary.** All responses are Pydantic v2 models with
   `model_config = {"from_attributes": True}` for ORM → schema conversion. No
   unvalidated dicts cross module boundaries.

6. **No cross-feature imports.** The blocks endpoint lives in `tutor/` and needs the
   `Lesson`/`Block` ORM models owned by `authoring/`. Because importing
   `authoring/models.py` from `tutor/` would violate the no-cross-feature-import rule,
   this is called out as an open decision in `plan.md` (Task Group 3) to resolve with
   the user before implementation — options: read via raw SQL/`db.execute` against the
   tables, move the blocks endpoint into `authoring/`, or treat ORM model modules as a
   shared read-only boundary.

7. **Async + asyncio-first.** All service functions are `async def`; all DB access uses
   the injected `AsyncSession`. Services use `flush()` and let `get_db()` own the commit,
   per `3-ai-workflow.md`.

## Error Handling
| Failure | Required Behavior |
|---|---|
| Enroll with unknown code | `404 NotFoundError("Course")` |
| Enroll into a non-published course | `404` (code is treated as not joinable) |
| Duplicate enrollment (same user+course) | Idempotent: return the existing enrollment (handle `UNIQUE(user_id, course_id)`) |
| `GET /api/courses/{id}` not owned & not published | `404` (do not leak existence of others' drafts) |
| `GET /api/enrollments/{id}` owned by another user | `403 ForbiddenError` |
| `GET /api/lessons/{id}/blocks` lesson not found | `404 NotFoundError("Lesson")` |

## Context References
- `backend/context/5-roadmap.md` (Phase 5 — Week 3: Courses & Enrollment)
- `backend/context/2-code-standard.md` (feature-slice rules, ownership checks, stripping)
- `backend/context/3-ai-workflow.md` (allowed/forbidden actions, service commit rules)
- `backend/context/1-mission.md` (code-based join flow, V1 goals)
- Existing models: `courses/models.py`, `enrollment/models.py`, `authoring/models.py`
