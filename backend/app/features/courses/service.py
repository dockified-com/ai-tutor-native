import uuid
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.authoring.models import Block, Lesson
from app.shared.errors import NotFoundError

from .models import Course, CourseStatus


async def list_courses(db: AsyncSession, creator_id: UUID) -> list[Course]:
    result = await db.execute(
        select(Course)
        .where(Course.creator_id == creator_id)
        .order_by(Course.created_at.desc())
    )
    return list(result.scalars().all())


async def get_course(db: AsyncSession, user_id: UUID, course_id: UUID) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise NotFoundError("Course not found")

    if course.creator_id == user_id:
        return course

    if course.status == CourseStatus.published:
        return course

    raise NotFoundError("Course not found")


async def get_space_overview(db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID) -> dict:
    course = await get_course(db, user_id, space_id)

    rows = (await db.execute(
        select(Lesson, func.count(Block.id).label("block_count"))
        .outerjoin(Block, Block.lesson_id == Lesson.id)
        .where(Lesson.course_id == space_id)
        .group_by(Lesson.id)
        .order_by(Lesson.position)
    )).all()

    categories = [
        {
            "id": row[0].id,
            "position": row[0].position,
            "title": row[0].title,
            "description": row[0].summary,
            "block_count": row[1],
        }
        for row in rows
    ]

    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "is_owner": course.creator_id == user_id,
        "categories": categories,
    }


async def add_category(db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID, name: str, description: str | None):
    course = await get_course(db, user_id, space_id)
    if course.creator_id != user_id:
        raise HTTPException(status_code=403, detail="Only owner can add categories")

    max_pos_result = await db.execute(
        select(func.coalesce(func.max(Lesson.position), 0)).where(Lesson.course_id == space_id)
    )
    next_pos = max_pos_result.scalar_one() + 1

    lesson = Lesson(course_id=space_id, position=next_pos, title=name, summary=description)
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def reorder_categories(db: AsyncSession, user_id: uuid.UUID, space_id: uuid.UUID, ordered_ids: list) -> None:
    course = await get_course(db, user_id, space_id)
    if course.creator_id != user_id:
        raise HTTPException(status_code=403, detail="Only owner can reorder")

    for pos, lesson_id in enumerate(ordered_ids, start=1):
        await db.execute(
            update(Lesson).where(Lesson.id == lesson_id, Lesson.course_id == space_id).values(position=pos)
        )
    await db.commit()