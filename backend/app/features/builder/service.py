import json
import uuid as _uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.features.authoring.models import Block, Lesson, LessonStatus
from app.features.courses.models import Course
from app.shared.ai.anthropic_client import anthropic_client


async def get_lesson_detail(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID) -> dict:
    lesson = await _get_lesson(db, lesson_id)
    course = (await db.execute(select(Course).where(Course.id == lesson.course_id))).scalar_one()
    blocks_result = await db.execute(
        select(Block).where(Block.lesson_id == lesson_id).order_by(Block.position)
    )
    blocks = blocks_result.scalars().all()
    return {
        "id": lesson.id,
        "title": lesson.title,
        "status": lesson.status,
        "course_id": lesson.course_id,
        "is_owner": course.creator_id == user_id,
        "blocks": [{"id": b.id, "position": b.position, "type": b.type, "content": b.content} for b in blocks],
    }


async def patch_block(db: AsyncSession, user_id: _uuid.UUID, block_id: _uuid.UUID, content: dict) -> Block:
    block = (await db.execute(select(Block).where(Block.id == block_id))).scalar_one_or_none()
    if not block:
        raise HTTPException(404, "Block not found")
    lesson = (await db.execute(select(Lesson).where(Lesson.id == block.lesson_id))).scalar_one()
    course = (await db.execute(select(Course).where(Course.id == lesson.course_id))).scalar_one()
    if course.creator_id != user_id:
        raise HTTPException(403, "Only owner can edit blocks")
    block.content = content
    await db.commit()
    await db.refresh(block)
    return block


async def agent_edit(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID, message: str) -> dict:
    lesson = await _get_lesson_owner_only(db, user_id, lesson_id)
    blocks = (await db.execute(
        select(Block).where(Block.lesson_id == lesson_id).order_by(Block.position)
    )).scalars().all()

    blocks_json = json.dumps(
        [{"id": str(b.id), "position": b.position, "type": b.type, "content": b.content} for b in blocks],
        indent=2,
    )
    # NOTE: Use async call — client is AsyncAnthropic
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=(
            "You are a curriculum editor. Respond with ONLY a JSON object: "
            "{\"reply\": \"<short explanation>\", \"blocks\": [<full updated block list>]}. "
            "Each block must have: id (string, keep existing), position (int), type (string), content (object). "
            "Do not change block IDs or add/remove required content fields."
        ),
        messages=[{"role": "user", "content": f"Current blocks:\n{blocks_json}\n\nInstruction: {message}"}],
    )
    raw = response.content[0].text.strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(500, "AI response was not valid JSON")

    for updated in parsed.get("blocks", []):
        block_id = _uuid.UUID(updated["id"])
        block = next((b for b in blocks if b.id == block_id), None)
        if block:
            block.content = updated["content"]
    await db.commit()

    refreshed = (await db.execute(
        select(Block).where(Block.lesson_id == lesson_id).order_by(Block.position)
    )).scalars().all()

    return {
        "reply": parsed.get("reply", "Done."),
        "blocks": [{"id": b.id, "position": b.position, "type": b.type, "content": b.content} for b in refreshed],
    }


async def publish_lesson(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID) -> Lesson:
    lesson = await _get_lesson_owner_only(db, user_id, lesson_id)
    lesson.status = LessonStatus.ready
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def _get_lesson(db: AsyncSession, lesson_id: _uuid.UUID) -> Lesson:
    lesson = (await db.execute(select(Lesson).where(Lesson.id == lesson_id))).scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson


async def _get_lesson_owner_only(db: AsyncSession, user_id: _uuid.UUID, lesson_id: _uuid.UUID) -> Lesson:
    lesson = await _get_lesson(db, lesson_id)
    course = (await db.execute(select(Course).where(Course.id == lesson.course_id))).scalar_one()
    if course.creator_id != user_id:
        raise HTTPException(403, "Only owner can perform this action")
    return lesson