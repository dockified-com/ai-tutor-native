from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.authoring.service import create_course, publish_course, regenerate_lesson
from app.features.courses.models import Course
from app.shared.deps import current_user, get_db
from app.shared.errors import NotFoundError


router = APIRouter(prefix="/api", tags=["authoring"])


class CreateCourseBody(BaseModel):
    pdf_url: str
    title: str
    description: str | None = None
    custom_prompt: str | None = None


@router.post("/courses", status_code=status.HTTP_201_CREATED)
async def create_course_endpoint(
    body: CreateCourseBody,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> Course:
    return await create_course(
        db,
        creator_id=user.id,
        pdf_url=body.pdf_url,
        title=body.title,
        description=body.description,
        custom_prompt=body.custom_prompt,
    )


@router.post("/courses/{course_id}/publish")
async def publish_course_endpoint(
    course_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> Course:
    return await publish_course(db, course_id)


@router.post("/lessons/{lesson_id}/regenerate")
async def regenerate_lesson_endpoint(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await regenerate_lesson(db, lesson_id)


@router.get("/courses/{course_id}")
async def get_course_endpoint(
    course_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course not found")
    return course