from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.shared.deps import current_user, get_db
from .schemas import LessonDetailOut, BlockOut, PatchBlockIn, AgentEditIn, AgentEditOut
from .service import get_lesson_detail, patch_block, agent_edit, publish_lesson

router = APIRouter(prefix="/api", tags=["builder"])


@router.get("/builder/{lesson_id}", response_model=LessonDetailOut)
async def get_builder(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_lesson_detail(db, user.id, lesson_id)


@router.patch("/builder/blocks/{block_id}", response_model=BlockOut)
async def patch_block_endpoint(
    block_id: UUID,
    body: PatchBlockIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await patch_block(db, user.id, block_id, body.content)
    return BlockOut(id=block.id, position=block.position, type=block.type, content=block.content)


@router.post("/builder/{lesson_id}/agent-edit", response_model=AgentEditOut)
async def agent_edit_endpoint(
    lesson_id: UUID,
    body: AgentEditIn,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await agent_edit(db, user.id, lesson_id, body.message)


@router.post("/lessons/{lesson_id}/publish", status_code=200)
async def publish_lesson_endpoint(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    lesson = await publish_lesson(db, user.id, lesson_id)
    return {"id": str(lesson.id), "status": lesson.status}