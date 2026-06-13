import asyncio
import secrets
import string

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app.features.courses.models import Course, CourseStatus
from app.features.authoring.models import Lesson, LessonStatus
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.errors import NotFoundError, GenerationError


def _generate_code() -> str:
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


async def create_course(
    db: AsyncSession,
    creator_id: UUID,
    pdf_url: str,
    title: str,
    description: str | None = None,
    custom_prompt: str | None = None,
) -> Course:
    course = Course(
        creator_id=creator_id,
        source_pdf_url=pdf_url,
        title=title,
        description=description,
        custom_prompt=custom_prompt,
        status=CourseStatus.generating,
    )
    db.add(course)
    await db.flush()
    await db.commit()

    from app.features.authoring.pipeline import run_generation_pipeline
    asyncio.create_task(run_generation_pipeline(course.id))

    return course


async def publish_course(db: AsyncSession, course_id: UUID) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course not found")

    if course.status != CourseStatus.ready:
        raise GenerationError("Course is not ready")

    for _ in range(5):
        code = _generate_code()
        try:
            stmt = (
                update(Course)
                .where(Course.id == course_id, Course.status == CourseStatus.ready)
                .values(code=code, status=CourseStatus.published)
            )
            result = await db.execute(stmt)
            if result.rowcount > 0:
                await db.commit()
                course.code = code
                course.status = CourseStatus.published
                return course
            await db.rollback()
        except IntegrityError:
            await db.rollback()
            continue

    raise GenerationError("Could not assign unique course code")


async def regenerate_lesson(db: AsyncSession, lesson_id: UUID) -> Lesson:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson not found")

    lesson.status = LessonStatus.generating
    await db.commit()

    from app.features.authoring.pipeline import regenerate_lesson_blocks
    asyncio.create_task(regenerate_lesson_blocks(lesson.id))

    return lesson