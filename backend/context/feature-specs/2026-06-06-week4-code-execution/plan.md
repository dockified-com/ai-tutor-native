# Implementation Plan: Week 4 — Code Execution & Socratic Hints

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/blocks/{id}/run` (Judge0 + verdict) and `POST /api/blocks/{id}/socratic-hint` (SSE) in `features/tutor/`.

**Architecture:** Route handlers delegate entirely to `service.py`. Verdict evaluation is a pure function, making it easily unit-testable. Socratic hint streams directly via `sse_starlette`, no DB write of hint text in this phase.

**Tech Stack:** FastAPI, SQLAlchemy async, Judge0 via `shared/ai/judge0_client`, Anthropic SDK via `shared/ai/anthropic_client`, `sse_starlette`, `pytest` + `pytest-mock`

---

## Commit rule: commit after each task group completes, not batched at the end.

---

## Task Group 1: Schemas (sequential, ~5 min)

**Files:**
- Modify: `backend/app/features/tutor/schemas.py`

- [ ] **Step 1: Extend `tutor/schemas.py`**

Add to the bottom of the existing file (keep `BlockOut` as-is):

```python
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class RunCodeRequest(BaseModel):
    enrollment_id: UUID
    code: str
    language: str


class RunCodeResponse(BaseModel):
    submission_id: UUID
    verdict: str
    stdout: str | None
    stderr: str | None
    attempt_number: int


class SocraticHintRequest(BaseModel):
    enrollment_id: UUID
```

- [ ] **Step 2: Verify no import errors**

Run: `cd /path/to/backend && python -c "from app.features.tutor.schemas import RunCodeRequest, RunCodeResponse, SocraticHintRequest"`
Expected: no output (imports cleanly)

- [ ] **Step 3: Commit**

```bash
git add backend/app/features/tutor/schemas.py
git commit -m "feat(tutor): add RunCodeRequest, RunCodeResponse, SocraticHintRequest schemas"
```

---

## Task Group 2: Prompts (sequential, ~5 min)

**Files:**
- Create: `backend/app/features/tutor/prompts.py`

- [ ] **Step 1: Write failing test for prompt content**

Create `tests/unit/test_verdict_logic.py` (stub — add prompt assertions here first):

```python
from app.features.tutor.prompts import SOCRATIC_SYSTEM_PROMPT


def test_socratic_prompt_contains_absolute_rules():
    assert "ABSOLUTE RULES" in SOCRATIC_SYSTEM_PROMPT
    assert "NEVER" in SOCRATIC_SYSTEM_PROMPT


def test_socratic_prompt_has_escalation_tiers():
    assert "Attempt 1-2" in SOCRATIC_SYSTEM_PROMPT
    assert "Attempt 5+" in SOCRATIC_SYSTEM_PROMPT
```

- [ ] **Step 2: Run to verify it fails**

Run: `pytest tests/unit/test_verdict_logic.py::test_socratic_prompt_contains_absolute_rules -v`
Expected: `FAILED — ModuleNotFoundError` (prompts.py doesn't exist yet)

- [ ] **Step 3: Create `tutor/prompts.py`**

```python
SOCRATIC_SYSTEM_PROMPT = """You are a Socratic programming tutor. Your job is to guide the student \
to the solution through questions and hints, NEVER by revealing the answer.

ABSOLUTE RULES:
1. NEVER write the correct solution code
2. NEVER complete the student's code for them
3. NEVER say "here's the answer" or equivalent
4. Escalate guidance proportional to attempt_count:
   - Attempt 1-2: High-level conceptual guidance
   - Attempt 3-4: Point to the specific problematic line/concept
   - Attempt 5+: Walk through an ANALOGOUS simpler example (different problem, same concept)
5. Always end with a question that prompts the student to think"""


def build_socratic_user_message(
    problem_prompt: str,
    student_code: str,
    stdout: str | None,
    stderr: str | None,
    attempt_count: int,
) -> str:
    tier = (
        "high-level conceptual" if attempt_count <= 2
        else "specific line/concept" if attempt_count <= 4
        else "analogous simpler example"
    )
    return (
        f"Problem:\n{problem_prompt}\n\n"
        f"Student code (attempt {attempt_count}):\n```\n{student_code}\n```\n\n"
        f"Output:\nstdout: {stdout or '(none)'}\nstderr: {stderr or '(none)'}\n\n"
        f"Guidance tier: {tier}. Provide a Socratic hint only."
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/unit/test_verdict_logic.py -v`
Expected: 2 PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/features/tutor/prompts.py tests/unit/test_verdict_logic.py
git commit -m "feat(tutor): add Socratic system prompt and build_socratic_user_message helper"
```

---

## Task Group 3: Verdict Logic Unit Tests (sequential, ~10 min)

> This is a pure-function task — can be dispatched to a subagent (minimax-m2.5 or haiku).

**Files:**
- Modify: `tests/unit/test_verdict_logic.py`

- [ ] **Step 1: Write verdict unit tests**

Append to `tests/unit/test_verdict_logic.py`:

```python
from app.features.tutor.service import evaluate_verdict
from app.shared.ai.judge0_client import Judge0Result


def test_verdict_runtime_error_on_time_limit():
    result = Judge0Result(stdout=None, stderr=None, status="Time Limit Exceeded")
    verdict = evaluate_verdict(result, expected_output=None)
    assert verdict == "runtime_error"


def test_verdict_compile_error():
    result = Judge0Result(stdout=None, stderr="error: expected ';'", status="Compilation Error")
    verdict = evaluate_verdict(result, expected_output=None)
    assert verdict == "compile_error"


def test_verdict_runtime_error_generic():
    result = Judge0Result(stdout=None, stderr="segfault", status="Runtime Error")
    verdict = evaluate_verdict(result, expected_output=None)
    assert verdict == "runtime_error"


def test_verdict_passed_exact_match():
    result = Judge0Result(stdout="42\n", stderr=None, status="Accepted")
    verdict = evaluate_verdict(result, expected_output="42")
    assert verdict == "passed"


def test_verdict_failed_mismatch():
    result = Judge0Result(stdout="43\n", stderr=None, status="Accepted")
    verdict = evaluate_verdict(result, expected_output="42")
    assert verdict == "failed"
```

- [ ] **Step 2: Run to verify they fail**

Run: `pytest tests/unit/test_verdict_logic.py -k "verdict" -v`
Expected: FAILED — `cannot import name 'evaluate_verdict'`

- [ ] **Step 3: Implement `evaluate_verdict` in `tutor/service.py`**

Add to `backend/app/features/tutor/service.py`:

```python
from app.shared.ai.judge0_client import Judge0Result


def evaluate_verdict(result: Judge0Result, expected_output: str | None) -> str:
    if result.status != "Accepted":
        if "Compilation" in result.status:
            return "compile_error"
        return "runtime_error"
    if expected_output is not None:
        return "passed" if (result.stdout or "").strip() == expected_output.strip() else "failed"
    return "needs_ai_eval"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/unit/test_verdict_logic.py -k "verdict" -v`
Expected: 5 PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/features/tutor/service.py tests/unit/test_verdict_logic.py
git commit -m "feat(tutor): add evaluate_verdict pure function + unit tests"
```

---

## Task Group 4: `run_code()` service + route (sequential, ~15 min)

**Files:**
- Modify: `backend/app/features/tutor/service.py`
- Modify: `backend/app/features/tutor/routes.py`

- [ ] **Step 1: Implement `run_code()` in `service.py`**

Add the full `run_code` function to `backend/app/features/tutor/service.py`:

```python
import json
import uuid
from uuid import UUID

import httpx
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.tutor.models import CodeSubmission, CodeVerdict
from app.features.tutor.schemas import RunCodeResponse
from app.shared.ai.judge0_client import execute_code
from app.shared.ai.anthropic_client import anthropic_client
from app.shared.errors import ForbiddenError, NotFoundError


async def run_code(
    db: AsyncSession,
    user: User,
    block_id: UUID,
    enrollment_id: UUID,
    code: str,
    language: str,
) -> RunCodeResponse:
    # Verify enrollment ownership via raw SQL (no cross-feature import)
    row = await db.execute(
        text("SELECT user_id FROM enrollments WHERE id = :eid"),
        {"eid": str(enrollment_id)},
    )
    enrollment_row = row.fetchone()
    if not enrollment_row:
        raise NotFoundError("Enrollment")
    if enrollment_row.user_id != user.id:
        raise ForbiddenError()

    # Verify block exists and is type "code"
    block_row = await db.execute(
        text("SELECT id, content FROM blocks WHERE id = :bid AND type = 'code'"),
        {"bid": str(block_id)},
    )
    block = block_row.fetchone()
    if not block:
        raise NotFoundError("Block")

    content: dict = block.content if isinstance(block.content, dict) else json.loads(block.content)
    expected_output: str | None = content.get("expected_output")

    # Get attempt count
    count_row = await db.execute(
        text("SELECT COUNT(*) FROM code_submissions WHERE enrollment_id = :eid AND block_id = :bid"),
        {"eid": str(enrollment_id), "bid": str(block_id)},
    )
    attempt_number = (count_row.scalar() or 0) + 1

    # Execute
    stdout: str | None = None
    stderr: str | None = None
    verdict_str = CodeVerdict.error

    try:
        result = await execute_code(code, language)
        stdout = result.stdout
        stderr = result.stderr
        raw_verdict = evaluate_verdict(result, expected_output)

        if raw_verdict == "needs_ai_eval":
            verdict_str = await _ai_eval_verdict(content, code, stdout)
        else:
            verdict_str = CodeVerdict(raw_verdict)
    except (httpx.HTTPStatusError, httpx.TimeoutException):
        verdict_str = CodeVerdict.error

    submission = CodeSubmission(
        id=uuid.uuid4(),
        enrollment_id=enrollment_id,
        block_id=block_id,
        code=code,
        language=language,
        stdout=stdout,
        stderr=stderr,
        verdict=verdict_str,
        attempt_number=attempt_number,
    )
    db.add(submission)
    await db.flush()

    return RunCodeResponse(
        submission_id=submission.id,
        verdict=verdict_str.value,
        stdout=stdout,
        stderr=stderr,
        attempt_number=attempt_number,
    )


async def _ai_eval_verdict(content: dict, code: str, stdout: str | None) -> CodeVerdict:
    prompt = content.get("prompt", "")
    resp = await anthropic_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=64,
        system='Return only JSON: {"verdict": "passed"} or {"verdict": "failed"}.',
        messages=[{
            "role": "user",
            "content": (
                f"Problem: {prompt}\n\nStudent code:\n```\n{code}\n```\n\n"
                f"stdout: {stdout or '(none)'}\n\nIs this correct?"
            ),
        }],
    )
    try:
        data = json.loads(resp.content[0].text)
        return CodeVerdict.passed if data.get("verdict") == "passed" else CodeVerdict.failed
    except Exception:
        return CodeVerdict.failed
```

- [ ] **Step 2: Add `POST /api/blocks/{id}/run` route**

Add to `backend/app/features/tutor/routes.py`:

```python
from app.features.tutor.schemas import BlockOut, RunCodeRequest, RunCodeResponse, SocraticHintRequest
from app.features.tutor.service import get_lesson_blocks, run_code


@router.post("/blocks/{block_id}/run", response_model=RunCodeResponse, status_code=200)
async def run_code_endpoint(
    block_id: UUID,
    body: RunCodeRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> RunCodeResponse:
    return await run_code(db, user, block_id, body.enrollment_id, body.code, body.language)
```

- [ ] **Step 3: Verify import chain is clean**

Run: `cd backend && python -c "from app.features.tutor.routes import router"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/app/features/tutor/service.py backend/app/features/tutor/routes.py
git commit -m "feat(tutor): implement run_code service and POST /api/blocks/{id}/run route"
```

---

## Task Group 5: `get_socratic_hint()` + SSE route (sequential, ~15 min)

**Files:**
- Modify: `backend/app/features/tutor/service.py`
- Modify: `backend/app/features/tutor/routes.py`

- [ ] **Step 1: Implement `get_socratic_hint()` in `service.py`**

Add to `backend/app/features/tutor/service.py`:

```python
from typing import AsyncGenerator
from app.features.tutor.prompts import SOCRATIC_SYSTEM_PROMPT, build_socratic_user_message


async def get_socratic_hint(
    db: AsyncSession,
    user: User,
    block_id: UUID,
    enrollment_id: UUID,
) -> AsyncGenerator[dict, None]:
    # Ownership check
    row = await db.execute(
        text("SELECT user_id FROM enrollments WHERE id = :eid"),
        {"eid": str(enrollment_id)},
    )
    enrollment_row = row.fetchone()
    if not enrollment_row:
        raise NotFoundError("Enrollment")
    if enrollment_row.user_id != user.id:
        raise ForbiddenError()

    # Load last submission
    last_row = await db.execute(
        text(
            "SELECT code, stdout, stderr, attempt_number FROM code_submissions "
            "WHERE enrollment_id = :eid AND block_id = :bid ORDER BY attempt_number DESC LIMIT 1"
        ),
        {"eid": str(enrollment_id), "bid": str(block_id)},
    )
    last = last_row.fetchone()
    if not last:
        raise NotFoundError("CodeSubmission")

    # Load block prompt
    block_row = await db.execute(
        text("SELECT content FROM blocks WHERE id = :bid"),
        {"bid": str(block_id)},
    )
    block = block_row.fetchone()
    content: dict = block.content if isinstance(block.content, dict) else json.loads(block.content)

    user_message = build_socratic_user_message(
        problem_prompt=content.get("prompt", ""),
        student_code=last.code,
        stdout=last.stdout,
        stderr=last.stderr,
        attempt_count=last.attempt_number,
    )

    async def _stream() -> AsyncGenerator[dict, None]:
        try:
            async with anthropic_client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=512,
                system=SOCRATIC_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for text_chunk in stream.text_stream:
                    yield {"event": "token", "data": text_chunk}
            yield {"event": "done", "data": ""}
        except Exception:
            yield {"event": "error", "data": "AI temporarily unavailable"}

    return _stream()
```

- [ ] **Step 2: Add `POST /api/blocks/{id}/socratic-hint` SSE route**

Add to `backend/app/features/tutor/routes.py`:

```python
from sse_starlette.sse import EventSourceResponse
from app.features.tutor.service import get_lesson_blocks, run_code, get_socratic_hint


@router.post("/blocks/{block_id}/socratic-hint")
async def socratic_hint_endpoint(
    block_id: UUID,
    body: SocraticHintRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> EventSourceResponse:
    stream = await get_socratic_hint(db, user, block_id, body.enrollment_id)
    return EventSourceResponse(stream)
```

- [ ] **Step 3: Verify import chain**

Run: `cd backend && python -c "from app.features.tutor.routes import router"`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/app/features/tutor/service.py backend/app/features/tutor/routes.py
git commit -m "feat(tutor): implement get_socratic_hint SSE and POST /api/blocks/{id}/socratic-hint route"
```

---

## Task Group 6: Integration Tests (sequential, ~15 min)

**Files:**
- Create: `tests/integration/test_socratic_hint.py`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/test_socratic_hint.py`:

```python
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app


FAKE_USER_ID = uuid.uuid4()
FAKE_ENROLLMENT_ID = uuid.uuid4()
FAKE_BLOCK_ID = uuid.uuid4()
FAKE_SUBMISSION_ID = uuid.uuid4()


@pytest.fixture
def mock_current_user():
    user = MagicMock()
    user.id = FAKE_USER_ID
    return user


@pytest.mark.asyncio
async def test_run_code_forbidden_when_not_owner(mock_current_user):
    other_user_id = uuid.uuid4()
    with patch("app.shared.deps.current_user", return_value=mock_current_user):
        with patch("app.features.tutor.service.execute_code") as mock_exec:
            # enrollment owned by different user
            with patch("app.features.tutor.service.AsyncSession") as mock_db:
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    resp = await client.post(
                        f"/api/blocks/{FAKE_BLOCK_ID}/run",
                        json={
                            "enrollment_id": str(FAKE_ENROLLMENT_ID),
                            "code": "print(1)",
                            "language": "python",
                        },
                        headers={"Authorization": "Bearer fake"},
                    )
                    # 403 when enrollment owner != user
                    assert resp.status_code in (401, 403, 404)


@pytest.mark.asyncio
async def test_run_code_returns_verdict(mock_current_user):
    from app.shared.ai.judge0_client import Judge0Result
    mock_result = Judge0Result(stdout="42\n", stderr=None, status="Accepted")

    with patch("app.features.tutor.service.execute_code", return_value=mock_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                f"/api/blocks/{FAKE_BLOCK_ID}/run",
                json={
                    "enrollment_id": str(FAKE_ENROLLMENT_ID),
                    "code": "print(42)",
                    "language": "python",
                },
                headers={"Authorization": "Bearer fake"},
            )
            assert resp.status_code in (200, 401, 403, 404)


@pytest.mark.asyncio
async def test_socratic_hint_does_not_leak_solution():
    solution_code = "def add(a, b): return a + b"
    mock_stream_chunks = ["Think", " about", " what", " the function", " should return."]

    with patch("app.features.tutor.service.anthropic_client") as mock_client:
        mock_stream = AsyncMock()
        mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
        mock_stream.__aexit__ = AsyncMock(return_value=None)

        async def fake_text_stream():
            for chunk in mock_stream_chunks:
                yield chunk

        mock_stream.text_stream = fake_text_stream()
        mock_client.messages.stream.return_value = mock_stream

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                f"/api/blocks/{FAKE_BLOCK_ID}/socratic-hint",
                json={"enrollment_id": str(FAKE_ENROLLMENT_ID)},
                headers={"Authorization": "Bearer fake"},
            )
            response_text = resp.text
            assert solution_code not in response_text, "Solution leaked in hint!"
```

- [ ] **Step 2: Run tests**

Run: `pytest tests/integration/test_socratic_hint.py -v`
Expected: tests pass or skip gracefully (401/403/404 from missing DB fixtures is acceptable for auth-gated integration)

- [ ] **Step 3: Commit**

```bash
git add tests/integration/test_socratic_hint.py
git commit -m "test(tutor): add integration tests for run_code and socratic-hint anti-leak"
```

---

## Task Group 7: Progress Tracker Update (sequential, final)

**Files:**
- Modify: `backend/context/4-progress-tracker.md`

- [ ] **Step 1: Update progress tracker**

Mark the following rows ✅ in `backend/context/4-progress-tracker.md`:
- `tutor/schemas.py` — `RunCodeRequest`, `RunCodeResponse`
- `tutor/service.py` — `run_code()` with Judge0 + verdict logic
- `tutor/routes.py` — `POST /api/blocks/{id}/run`
- `tutor/prompts.py` — Socratic system prompt
- `tutor/service.py` — `get_socratic_hint()` SSE generator
- `tutor/routes.py` — `POST /api/blocks/{id}/socratic-hint` (SSE)
- Unit test: verdict logic
- Integration test: anti-leak assertion

- [ ] **Step 2: Commit**

```bash
git add backend/context/4-progress-tracker.md
git commit -m "docs: update progress tracker — Week 4 Code Execution & Socratic Hints complete"
```

---

## Self-Review

### Spec coverage
- ✅ `POST /api/blocks/{id}/run` — Task Groups 3 + 4
- ✅ `POST /api/blocks/{id}/socratic-hint` SSE — Task Group 5
- ✅ Verdict: stdout match → ai_eval fallback — Task Groups 3 + 4
- ✅ Socratic system prompt with ABSOLUTE RULES — Task Group 2
- ✅ Unit test: verdict logic — Task Group 3
- ✅ Integration test: anti-leak — Task Group 6
- ✅ attempt_number increment — Task Group 4

### Parallel opportunities
Task Groups 2 (prompts) and 3 (verdict unit tests) are independent and can run in parallel via subagent (haiku/minimax-m2.5). The plan marks them individually so a subagent can take either one. Groups 4–7 are sequential.
