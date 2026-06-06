import json
import uuid
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

import httpx
from app.features.auth.models import User
from app.features.tutor.models import CodeSubmission, CodeVerdict
from app.features.tutor.schemas import BlockOut, RunCodeResponse
from app.shared.ai.judge0_client import Judge0Result, execute_code
from app.shared.ai.anthropic_client import anthropic_client
from app.shared.errors import NotFoundError, ForbiddenError


def strip_sensitive_fields(block_type: str, content: dict) -> dict:
    result = content.copy()
    if block_type == "code":
        result.pop("solution", None)
        result.pop("tests", None)
    elif block_type in ("concept_check", "understanding_check"):
        result.pop("correct_index", None)
        result.pop("explanation", None)
    return result


async def get_lesson_blocks(db: AsyncSession, lesson_id: UUID) -> list[BlockOut]:
    result = await db.execute(
        text("SELECT id FROM lessons WHERE id = :lesson_id"),
        {"lesson_id": str(lesson_id)},
    )
    if not result.fetchone():
        raise NotFoundError("Lesson not found")

    rows = await db.execute(
        text("SELECT id, position, type, content, tts_audio_url FROM blocks WHERE lesson_id = :lesson_id ORDER BY position"),
        {"lesson_id": str(lesson_id)},
    )
    return [
        BlockOut(
            id=row.id,
            position=row.position,
            type=row.type,
            content=strip_sensitive_fields(row.type, row.content),
            tts_audio_url=row.tts_audio_url,
        )
        for row in rows
    ]


def evaluate_verdict(result: Judge0Result, expected_output: str | None) -> str:
    if result.status != "Accepted":
        if "Compilation" in result.status:
            return "compile_error"
        return "runtime_error"
    if expected_output is not None:
        return "passed" if (result.stdout or "").strip() == expected_output.strip() else "failed"
    return "needs_ai_eval"


async def run_code(
    db: AsyncSession,
    user: User,
    block_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    code: str,
    language: str,
) -> RunCodeResponse:
    row = await db.execute(
        text("SELECT user_id FROM enrollments WHERE id = :eid"),
        {"eid": str(enrollment_id)},
    )
    enrollment_row = row.fetchone()
    if not enrollment_row:
        raise NotFoundError("Enrollment")
    if enrollment_row.user_id != user.id:
        raise ForbiddenError()

    block_row = await db.execute(
        text("SELECT id, content FROM blocks WHERE id = :bid AND type = 'code'"),
        {"bid": str(block_id)},
    )
    block = block_row.fetchone()
    if not block:
        raise NotFoundError("Block")

    content: dict = block.content if isinstance(block.content, dict) else json.loads(block.content)
    expected_output: str | None = content.get("expected_output")

    count_row = await db.execute(
        text("SELECT COUNT(*) FROM code_submissions WHERE enrollment_id = :eid AND block_id = :bid"),
        {"eid": str(enrollment_id), "bid": str(block_id)},
    )
    attempt_number = (count_row.scalar() or 0) + 1

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