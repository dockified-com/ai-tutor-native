from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.features.tutor.schemas import BlockOut
from app.shared.errors import NotFoundError


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


from app.shared.ai.judge0_client import Judge0Result


def evaluate_verdict(result: Judge0Result, expected_output: str | None) -> str:
    if result.status != "Accepted":
        if "Compilation" in result.status:
            return "compile_error"
        return "runtime_error"
    if expected_output is not None:
        return "passed" if (result.stdout or "").strip() == expected_output.strip() else "failed"
    return "needs_ai_eval"