import json
import uuid
from typing import AsyncGenerator
from uuid import UUID

import httpx
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.authoring.models import Lesson, Block
from app.features.enrollment.models import Enrollment
from app.features.tutor.models import CodeSubmission, CodeVerdict
from app.features.tutor.prompts import SOCRATIC_SYSTEM_PROMPT, build_socratic_user_message
from app.features.tutor.schemas import BlockOut, RunCodeResponse
from app.shared.ai.anthropic_client import anthropic_client
from app.shared.ai.judge0_client import Judge0Result, execute_code
from app.shared.errors import ForbiddenError, NotFoundError, UnauthorizedError


def strip_sensitive_fields(block_type: str, content: dict) -> dict:
    result = content.copy()
    if block_type == "code":
        result.pop("solution", None)
        result.pop("tests", None)
    elif block_type in ("concept_check", "understanding_check"):
        result.pop("correct_index", None)
        result.pop("explanation", None)
    return result


async def get_lesson_blocks(db: AsyncSession, user_id: UUID, lesson_id: UUID) -> list[BlockOut]:
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson not found")

    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == lesson.course_id,
        )
    )
    if not enrollment_result.scalar_one_or_none():
        raise UnauthorizedError("Not enrolled in this course")

    blocks_result = await db.execute(
        select(Block).where(Block.lesson_id == lesson_id).order_by(Block.position)
    )
    blocks = blocks_result.scalars().all()
    
    return [
        BlockOut(
            id=block.id,
            position=block.position,
            type=block.type,
            content=strip_sensitive_fields(block.type, block.content),
            tts_audio_url=block.tts_audio_url,
        )
        for block in blocks
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
    except ValueError:
        raise
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
    except (json.JSONDecodeError, KeyError, IndexError):
        return CodeVerdict.failed


async def get_socratic_hint(
    db: AsyncSession,
    user: User,
    block_id: uuid.UUID,
    enrollment_id: uuid.UUID,
) -> AsyncGenerator[dict, None]:
    row = await db.execute(
        text("SELECT user_id FROM enrollments WHERE id = :eid"),
        {"eid": str(enrollment_id)},
    )
    enrollment_row = row.fetchone()
    if not enrollment_row:
        raise NotFoundError("Enrollment")
    if enrollment_row.user_id != user.id:
        raise ForbiddenError()

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

    block_row = await db.execute(
        text("SELECT content FROM blocks WHERE id = :bid"),
        {"bid": str(block_id)},
    )
    block = block_row.fetchone()
    if not block:
        raise NotFoundError("Block")
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