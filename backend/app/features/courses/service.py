from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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