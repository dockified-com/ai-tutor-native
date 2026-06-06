from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.features.auth.models import User
from app.features.tutor.schemas import (
    AskRequest,
    BlockOut,
    ConceptCheckRequest,
    ConceptCheckResponse,
    RunCodeRequest,
    RunCodeResponse,
    SocraticHintRequest,
    UnderstandingCheckRequest,
)
from app.features.tutor.service import (
    ask_anything,
    check_concept,
    evaluate_understanding,
    get_lesson_blocks,
    get_socratic_hint,
    run_code,
)
from app.shared.deps import current_user, get_db

router = APIRouter(prefix="/api", tags=["tutor"])


@router.get("/lessons/{lesson_id}/blocks", response_model=list[BlockOut])
async def list_lesson_blocks(
    lesson_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BlockOut]:
    return await get_lesson_blocks(db, user.id, lesson_id)


@router.post("/blocks/{block_id}/run", response_model=RunCodeResponse, status_code=200)
async def run_code_endpoint(
    block_id: UUID,
    body: RunCodeRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> RunCodeResponse:
    return await run_code(db, user, block_id, body.enrollment_id, body.code, body.language)


@router.post("/blocks/{block_id}/socratic-hint")
async def socratic_hint_endpoint(
    block_id: UUID,
    body: SocraticHintRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> EventSourceResponse:
    stream = await get_socratic_hint(db, user, block_id, body.enrollment_id)
    return EventSourceResponse(stream)


@router.post("/blocks/{block_id}/understanding-check")
async def understanding_check_endpoint(
    block_id: UUID,
    body: UnderstandingCheckRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> EventSourceResponse:
    stream = await evaluate_understanding(db, user, block_id, body.enrollment_id, body.response)
    return EventSourceResponse(stream)


@router.post("/enrollments/{enrollment_id}/ask")
async def ask_anything_endpoint(
    enrollment_id: UUID,
    body: AskRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> EventSourceResponse:
    stream = await ask_anything(db, user, enrollment_id, body.question, body.block_id)
    return EventSourceResponse(stream)


@router.post("/blocks/{block_id}/concept-check", response_model=ConceptCheckResponse)
async def concept_check_endpoint(
    block_id: UUID,
    body: ConceptCheckRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> ConceptCheckResponse:
    return await check_concept(db, user, block_id, body.enrollment_id, body.selected_answer)