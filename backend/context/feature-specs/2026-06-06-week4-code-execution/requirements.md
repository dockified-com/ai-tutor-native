# Requirements: Week 4 — Code Execution & Socratic Hints

## Scope

Implement the two learner-facing real-time endpoints in `features/tutor/`:

1. `POST /api/blocks/{id}/run` — submit code, execute via Judge0, evaluate verdict, persist submission.
2. `POST /api/blocks/{id}/socratic-hint` — stream a Socratic hint via SSE for the last submission.

---

## Context Files

- `backend/context/1-mission.md` — pedagogical principles (never reveal answer)
- `backend/context/2-code-standard.md` — architecture rules, SSE pattern, error hierarchy
- `backend/context/3-ai-workflow.md` — AI call guardrails, Socratic system prompt, error handling table
- `backend/context/4-progress-tracker.md` — current task status
- `backend/context/5-roadmap.md` — Phase 6 step list

---

## Decisions (resolved 2026-06-06)

| Question | Decision |
|---|---|
| Verdict mode | `stdout` exact/regex match first; if block has no `expected_output`, fall back to `ai_eval` via Claude |
| Hint persistence | Skip — do NOT save hint text to `code_submissions.socratic_hint` in Week 4 |
| Branch | New branch off `feature/2026-06-06-courses-enrollment` |

---

## Files to Create / Modify

| File | Action |
|---|---|
| `app/features/tutor/schemas.py` | Extend with `RunCodeRequest`, `RunCodeResponse` |
| `app/features/tutor/prompts.py` | New — Socratic system prompt |
| `app/features/tutor/service.py` | Extend with `run_code()`, `get_socratic_hint()` |
| `app/features/tutor/routes.py` | Extend with `POST /api/blocks/{id}/run`, `POST /api/blocks/{id}/socratic-hint` |
| `tests/unit/test_verdict_logic.py` | New — unit tests for verdict evaluation |
| `tests/integration/test_socratic_hint.py` | New — anti-leak integration test |

---

## Functional Requirements

### `POST /api/blocks/{id}/run`

- Requires `Depends(current_user)` and `Depends(get_db)`.
- Request body: `RunCodeRequest(enrollment_id: UUID, code: str, language: str)`.
- Verify enrollment ownership: `enrollment.user_id == user.id`; raise `ForbiddenError` otherwise.
- Verify `block.type == "code"`; raise `NotFoundError("Block")` if not found.
- Call `shared/ai/judge0_client.execute_code(code, language)`.
- Evaluate verdict:
  - If Judge0 returns a non-`Accepted` status → `runtime_error` or `compile_error` based on status string.
  - If block `content` has `expected_output`: compare `stdout.strip()` against `expected_output.strip()`; match = `passed`, no match = `failed`.
  - If no `expected_output` defined: call Claude (`claude-sonnet-4-6`) with the block prompt, student code, and stdout; Claude returns `{"verdict": "passed"|"failed", "reason": "..."}`.
  - Judge0 timeout / 5xx → `verdict = "error"` (non-counted attempt per `3-ai-workflow.md`).
- Persist `CodeSubmission` row with `attempt_number = previous_count + 1`.
- Return `RunCodeResponse`.

### `POST /api/blocks/{id}/socratic-hint` (SSE)

- Requires `Depends(current_user)` and `Depends(get_db)`.
- Request body: `SocraticHintRequest(enrollment_id: UUID)`.
- Verify enrollment ownership.
- Load last `CodeSubmission` for `(enrollment_id, block_id)`.
- Count total attempts for `(enrollment_id, block_id)` → `attempt_count`.
- Build prompt from `tutor/prompts.py`: Socratic system prompt with `attempt_count` escalation.
- Stream via `sse_starlette.EventSourceResponse`:
  - Each token → `{"event": "token", "data": "<text>"}`.
  - On stream complete → `{"event": "done", "data": ""}`.
  - On Anthropic 5xx → `{"event": "error", "data": "AI temporarily unavailable"}`.
- Do NOT persist hint text to DB.

---

## Verdict Evaluation Logic

```
Judge0 status not "Accepted"
  → status contains "Time Limit" → runtime_error
  → status contains "Compilation" → compile_error
  → otherwise → runtime_error

Judge0 status "Accepted"
  → block.content has "expected_output"
    → stdout.strip() == expected_output.strip() → passed
    → else → failed
  → no "expected_output"
    → ai_eval: call Claude with (problem_prompt, student_code, stdout)
      → Claude returns {"verdict": "passed"|"failed"}
```

---

## Security Constraints

- All endpoints require `Depends(current_user)`.
- Ownership check: `enrollment.user_id == user.id` before every operation.
- Socratic hint system prompt MUST include ABSOLUTE RULES (never reveal solution code).
- Anti-leak integration test: assert hint text does NOT contain the `solution` field from block content.

---

## Error Handling

| Condition | Response |
|---|---|
| Judge0 timeout / 5xx | `verdict = "error"` — still returns `RunCodeResponse`, does not raise |
| Anthropic 5xx / rate limit | SSE `{"event": "error", "data": "AI temporarily unavailable"}` |
| Unknown language | `400` — Judge0 client raises `ValueError` → catch in route as 400 |
| Block not type `code` | `404 NotFoundError("Block")` |
| Enrollment not owned | `403 ForbiddenError` |
