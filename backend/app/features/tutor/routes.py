from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.tutor.schemas import BlockOut
from app.features.tutor.service import get_lesson_blocks
from app.shared.deps import current_user, get_db

router = APIRouter(prefix="/api", tags=["tutor"])


@router.get("/lessons/{lesson_id}/blocks", response_model=list[BlockOut])
async def list_lesson_blocks(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BlockOut]:
    return await get_lesson_blocks(db, lesson_id)