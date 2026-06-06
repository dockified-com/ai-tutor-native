import json
import uuid
from typing import AsyncGenerator
from uuid import UUID

import httpx
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.authoring.models import Lesson, Block, CourseChunk
from app.features.enrollment.models import Enrollment
from app.features.tutor.models import (
    CodeSubmission,
    CodeVerdict,
    ConceptCheckAttempt,
    Question,
    UnderstandingCheckAttempt,
    UnderstandingLevel,
)
from app.features.tutor.prompts import (
    ASK_ANYTHING_SYSTEM_PROMPT,
    SOCRATIC_SYSTEM_PROMPT,
    UNDERSTANDING_CHECK_SYSTEM_PROMPT,
    build_ask_user_message,
    build_socratic_user_message,
    build_understanding_check_user_message,
)
from app.features.tutor.schemas import BlockOut, ConceptCheckResponse, RunCodeResponse
from app.shared.ai.anthropic_client import anthropic_client
from app.shared.ai.judge0_client import Judge0Result, execute_code
from app.shared.errors import ForbiddenError, NotFoundError
from app.shared.rag.retriever import embed

LEVEL_ORDER = {"poor": 0, "fair": 1, "good": 2, "excellent": 3}
PASS_THRESHOLD = 2


def strip_sensitive_fields(block_type: str, content: dict) -> dict:
    result = content.copy()
    if block_type == "code":
        result.pop("solution", None)
        result.pop("tests", None)
    elif block_type == "concept_check":
        result.pop("correct_index", None)
        result.pop("explanation", None)
    elif block_type == "understanding_check":
        result.pop("correct_index", None)
        result.pop("explanation", None)
        result.pop("evaluation_rubric", None)
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
        raise ForbiddenError()

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


async def evaluate_understanding(
    db: AsyncSession,
    user: User,
    block_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    response: str,
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

    block_row = await db.execute(
        text("SELECT content FROM blocks WHERE id = :bid AND type = 'understanding_check'"),
        {"bid": str(block_id)},
    )
    block = block_row.fetchone()
    if not block:
        raise NotFoundError("Block")
    content: dict = block.content if isinstance(block.content, dict) else json.loads(block.content)
    rubric: str = content.get("evaluation_rubric", "")

    count_row = await db.execute(
        text(
            "SELECT COUNT(*) FROM understanding_check_attempts "
            "WHERE enrollment_id = :eid AND block_id = :bid"
        ),
        {"eid": str(enrollment_id), "bid": str(block_id)},
    )
    attempt_number = (count_row.scalar() or 0) + 1

    user_message = build_understanding_check_user_message(rubric, response, attempt_number)

    async def _stream() -> AsyncGenerator[dict, None]:
        accumulated = ""
        try:
            async with anthropic_client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=512,
                system=UNDERSTANDING_CHECK_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for chunk in stream.text_stream:
                    accumulated += chunk
                    yield {"event": "token", "data": chunk}

            # Parse the first line as JSON
            first_line = accumulated.strip().splitlines()[0] if accumulated.strip() else "{}"
            try:
                parsed = json.loads(first_line)
            except json.JSONDecodeError:
                parsed = {}

            level_str = parsed.get("level", "poor")
            feedback_str = parsed.get("feedback", accumulated)
            missing = parsed.get("missing_points", [])
            passed = LEVEL_ORDER.get(level_str, 0) >= PASS_THRESHOLD

            attempt = UnderstandingCheckAttempt(
                id=uuid.uuid4(),
                enrollment_id=enrollment_id,
                block_id=block_id,
                response=response,
                level=UnderstandingLevel(level_str) if level_str in LEVEL_ORDER else UnderstandingLevel.poor,
                feedback=feedback_str,
                passed=passed,
                missing_points=missing if missing else None,
                attempt_number=attempt_number,
            )
            db.add(attempt)
            await db.flush()

            yield {"event": "result", "data": json.dumps({"passed": passed, "level": level_str})}
            yield {"event": "done", "data": ""}
        except Exception:
            yield {"event": "error", "data": "AI temporarily unavailable"}

    return _stream()


async def ask_anything(
    db: AsyncSession,
    user: User,
    enrollment_id: uuid.UUID,
    question: str,
    block_id: uuid.UUID | None,
) -> AsyncGenerator[dict, None]:
    row = await db.execute(
        text("SELECT user_id, course_id FROM enrollments WHERE id = :eid"),
        {"eid": str(enrollment_id)},
    )
    enrollment_row = row.fetchone()
    if not enrollment_row:
        raise NotFoundError("Enrollment")
    if enrollment_row.user_id != user.id:
        raise ForbiddenError()

    course_id = enrollment_row.course_id

    # RAG: retrieve top-5 chunks scoped to this course
    query_embedding = await embed(question)
    chunks_result = await db.execute(
        select(CourseChunk)
        .where(CourseChunk.course_id == course_id)
        .order_by(CourseChunk.embedding.cosine_distance(query_embedding))
        .limit(5)
    )
    chunks = chunks_result.scalars().all()

    block_context: str | None = None
    if block_id:
        block_row = await db.execute(
            text("SELECT content FROM blocks WHERE id = :bid"),
            {"bid": str(block_id)},
        )
        b = block_row.fetchone()
        if b:
            c = b.content if isinstance(b.content, dict) else json.loads(b.content)
            block_context = c.get("prompt") or c.get("text") or None

    user_message = build_ask_user_message(
        question=question,
        chunks=[ch.content for ch in chunks],
        block_context=block_context,
    )

    async def _stream() -> AsyncGenerator[dict, None]:
        answer_parts: list[str] = []
        try:
            async with anthropic_client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=ASK_ANYTHING_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for chunk in stream.text_stream:
                    answer_parts.append(chunk)
                    yield {"event": "token", "data": chunk}

            q = Question(
                id=uuid.uuid4(),
                enrollment_id=enrollment_id,
                block_id=block_id,
                question_text=question,
                answer_text="".join(answer_parts),
                source_chunks=[str(ch.id) for ch in chunks],
            )
            db.add(q)
            await db.flush()
            yield {"event": "done", "data": ""}
        except Exception:
            yield {"event": "error", "data": "AI temporarily unavailable"}

    return _stream()


async def check_concept(
    db: AsyncSession,
    user: User,
    block_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    selected_answer: int,
) -> ConceptCheckResponse:
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
        text("SELECT content FROM blocks WHERE id = :bid AND type = 'concept_check'"),
        {"bid": str(block_id)},
    )
    block = block_row.fetchone()
    if not block:
        raise NotFoundError("Block")
    content: dict = block.content if isinstance(block.content, dict) else json.loads(block.content)

    correct_index: int = content["correct_index"]
    explanation: str = content["explanation"]
    is_correct = selected_answer == correct_index

    count_row = await db.execute(
        text(
            "SELECT COUNT(*) FROM concept_check_attempts "
            "WHERE enrollment_id = :eid AND block_id = :bid"
        ),
        {"eid": str(enrollment_id), "bid": str(block_id)},
    )
    attempt_number = (count_row.scalar() or 0) + 1

    attempt = ConceptCheckAttempt(
        id=uuid.uuid4(),
        enrollment_id=enrollment_id,
        block_id=block_id,
        selected_answer=str(selected_answer),
        is_correct=is_correct,
        explanation=explanation,
        attempt_number=attempt_number,
    )
    db.add(attempt)
    await db.flush()

    return ConceptCheckResponse(is_correct=is_correct, explanation=explanation)