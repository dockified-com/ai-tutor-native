from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.courses.models import Course, CourseStatus
from app.features.enrollment.models import Enrollment
from app.shared.errors import ForbiddenError, NotFoundError


async def enroll_by_code(db: AsyncSession, user_id: UUID, code: str) -> Enrollment:
    stmt = select(Course).where(Course.code == code)
    result = await db.execute(stmt)
    course = result.scalar_one_or_none()

    if not course or course.status != CourseStatus.published:
        raise NotFoundError("Course not found")

    enrollment = Enrollment(user_id=user_id, course_id=course.id)
    db.add(enrollment)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        stmt = select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course.id,
        )
        result = await db.execute(stmt)
        return result.scalar_one()

    return enrollment


async def get_enrollment(
    db: AsyncSession, user_id: UUID, enrollment_id: UUID
) -> Enrollment:
    stmt = select(Enrollment).where(Enrollment.id == enrollment_id)
    result = await db.execute(stmt)
    enrollment = result.scalar_one_or_none()

    if not enrollment:
        raise NotFoundError("Enrollment not found")

    if enrollment.user_id != user_id:
        raise ForbiddenError("Access forbidden")

    return enrollment