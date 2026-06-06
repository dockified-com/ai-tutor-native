from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.shared.deps import current_user, get_db

from .schemas import CourseOut
from .service import get_course, list_courses

router = APIRouter(prefix="/api", tags=["courses"])


@router.get("/courses", response_model=list[CourseOut])
async def get_courses(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    courses = await list_courses(db, user.id)
    return [CourseOut.model_validate(c) for c in courses]


@router.get("/courses/{course_id}", response_model=CourseOut)
async def get_course_detail(
    course_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await get_course(db, user.id, course_id)
    return CourseOut.model_validate(course)