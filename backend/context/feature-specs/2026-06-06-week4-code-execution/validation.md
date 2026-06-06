# Validation: Week 4 — Code Execution & Socratic Hints

## Definition of Done

The implementation is complete and mergeable when ALL of the following are true.

---

## Unit Tests (`tests/unit/test_verdict_logic.py`)

- [ ] `verdict = "runtime_error"` when Judge0 status is `"Time Limit Exceeded"`
- [ ] `verdict = "compile_error"` when Judge0 status contains `"Compilation Error"`
- [ ] `verdict = "runtime_error"` when Judge0 status is any other non-Accepted string
- [ ] `verdict = "passed"` when Judge0 `Accepted` + `stdout.strip() == expected_output.strip()`
- [ ] `verdict = "failed"` when Judge0 `Accepted` + `stdout.strip() != expected_output.strip()`
- [ ] `verdict = "error"` when Judge0 call raises `httpx.HTTPStatusError`

---

## Integration Tests (`tests/integration/test_socratic_hint.py`)

- [ ] `POST /api/blocks/{id}/run` returns 403 when `enrollment.user_id != user.id`
- [ ] `POST /api/blocks/{id}/run` returns 404 for a non-code block
- [ ] `POST /api/blocks/{id}/run` returns `RunCodeResponse` with correct verdict fields (Judge0 mocked)
- [ ] `POST /api/blocks/{id}/run` with ai_eval path calls Claude and returns verdict (Claude mocked)
- [ ] `POST /api/blocks/{id}/socratic-hint` streams SSE `token` events and a final `done` event
- [ ] **Anti-leak**: SSE stream does NOT contain `block.content["solution"]` at any point

---

## Functional Checks

- [ ] `CodeSubmission` row is persisted after every `/run` call (including `error` verdict)
- [ ] `attempt_number` increments correctly across successive submissions for the same `(enrollment_id, block_id)`
- [ ] Socratic prompt selects guidance tier based on `attempt_count` (1-2 vs 3-4 vs 5+)
- [ ] No real Judge0 or Anthropic API calls made during tests (all mocked via `pytest-mock`)

---

## Architecture Checks

- [ ] No cross-feature imports (`tutor/` only imports from `shared/` and its own files)
- [ ] No business logic in route handlers — routes delegate to `service.py`
- [ ] All functions have typed signatures with return type annotations
- [ ] New endpoints registered via existing `tutor_router` already included in `app/main.py`
- [ ] `Depends(current_user)` present on both new endpoints

---

## Merge Readiness

- [ ] `ruff check backend/` passes with no errors
- [ ] `pytest tests/unit/test_verdict_logic.py tests/integration/test_socratic_hint.py -v` all green
- [ ] `backend/context/4-progress-tracker.md` updated (Week 4 rows marked ✅)
