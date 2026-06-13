from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.shared.deps import current_user, get_db

from .schemas import AddCategoryIn, CategoryOut, CourseOut, ReorderCategoriesIn, SpaceOverviewOut
from .service import add_category, get_course, get_space_overview, list_courses, reorder_categories

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


@router.get("/spaces/{space_id}/overview", response_model=SpaceOverviewOut)
async def space_overview(
    space_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await get_space_overview(db, user.id, space_id)
    return data


@router.post("/spaces/{space_id}/categories", response_model=CategoryOut, status_code=201)
async def create_category(
    space_id: UUID,
    body: AddCategoryIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    lesson = await add_category(db, user.id, space_id, body.name, body.description)
    return CategoryOut(id=lesson.id, position=lesson.position, title=lesson.title, description=lesson.summary, block_count=0)


@router.patch("/spaces/{space_id}/categories/reorder", status_code=204)
async def reorder_space_categories(
    space_id: UUID,
    body: ReorderCategoriesIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await reorder_categories(db, user.id, space_id, body.ordered_ids)