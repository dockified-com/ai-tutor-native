from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.tutor.schemas import BlockOut, RunCodeRequest, RunCodeResponse, SocraticHintRequest
from app.features.tutor.service import get_lesson_blocks, run_code
from app.shared.deps import current_user, get_db

router = APIRouter(prefix="/api", tags=["tutor"])


@router.get("/lessons/{lesson_id}/blocks", response_model=list[BlockOut])
async def list_lesson_blocks(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BlockOut]:
    return await get_lesson_blocks(db, lesson_id)


@router.post("/blocks/{block_id}/run", response_model=RunCodeResponse, status_code=200)
async def run_code_endpoint(
    block_id: UUID,
    body: RunCodeRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> RunCodeResponse:
    return await run_code(db, user, block_id, body.enrollment_id, body.code, body.language)