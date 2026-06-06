from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.enrollment.schemas import EnrollByCodeRequest, EnrollmentOut
from app.features.enrollment.service import enroll_by_code, get_enrollment
from app.shared.deps import current_user, get_db

router = APIRouter(prefix="/api", tags=["enrollments"])


@router.post(
    "/enrollments",
    response_model=EnrollmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_enrollment(
    body: EnrollByCodeRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    enrollment = await enroll_by_code(db, user.id, body.code)
    return EnrollmentOut.model_validate(enrollment)


@router.get("/enrollments/{enrollment_id}", response_model=EnrollmentOut)
async def read_enrollment(
    enrollment_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    enrollment = await get_enrollment(db, user.id, enrollment_id)
    return EnrollmentOut.model_validate(enrollment)