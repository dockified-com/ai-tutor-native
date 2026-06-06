# Validation & Success Criteria: Courses & Enrollment (Week 3)

To consider this feature complete and ready to merge, all of the following must hold.

## 1. Courses Endpoints
- `GET /api/courses` returns **only** courses where `creator_id == current_user.id`,
  ordered newest-first. A second user's courses never appear.
- `GET /api/courses/{id}` returns the course when the caller owns it (any status) or
  when it is `published`. For another creator's **unpublished** course it returns `404`
  (existence not leaked). Unknown id → `404`.
- All course responses are `CourseOut` Pydantic models; no raw ORM objects or dicts leak.

## 2. Enrollment Endpoints
- `POST /api/enrollments` with a valid 6-char code for a **published** course creates an
  `Enrollment` for `current_user` and returns `201` with `EnrollmentOut`.
- Enrolling again with the same user + course is **idempotent**: returns the existing
  enrollment (no `UNIQUE(user_id, course_id)` IntegrityError surfaced to the client).
- Unknown code or non-published course → `404`.
- `GET /api/enrollments/{id}` returns the enrollment only to its owner; a different
  authenticated user gets `403 ForbiddenError`. Unknown id → `404`.

## 3. Lesson Blocks Stripping (security-critical)
- `GET /api/lessons/{id}/blocks` returns blocks ordered by `position`.
- For every returned block, the response JSON contains **none** of:
  `solution`, `tests`, `correct_index`, `explanation`.
- Safe fields are preserved: `code` blocks keep `language` + `starter_code`;
  check blocks keep `question` + `options`; `markdown`/`mermaid` unchanged.
- A unit test asserts the stripping helper removes exactly these fields per block type.
- An integration test asserts the HTTP response body contains no stripped field
  (anti-leak assertion).
- Lesson not found → `404`.

## 4. Multi-tenancy & Auth
- Every endpoint requires `Depends(current_user)`; no endpoint is reachable
  unauthenticated.
- Ownership checks live in services (not routes), per `2-code-standard.md`.
- No cross-feature imports were introduced (Task Group 0 decision honored).

## 5. Tests & CI Hygiene
- Unit tests: stripping helper + `EnrollByCodeRequest` validation pass.
- Integration tests use `httpx.AsyncClient` + `ASGITransport`.
- All external calls (Anthropic, OpenAI, Judge0) are mocked — **zero** real API budget
  consumed in CI.
- `ruff` reports no lint errors; functions carry typed signatures + return annotations.

## 6. Registration & Smoke
- `courses_router`, `enrollment_router`, and `tutor_router` are registered in
  `app/main.py` and the app imports/starts cleanly (`py_compile` / app factory builds).
- The roadmap and `4-progress-tracker.md` are updated to mark Week 3 progress.
