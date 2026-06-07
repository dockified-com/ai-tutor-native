import uuid as _uuid
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .models import CourseStatus, GenerationPhase


class CategoryOut(BaseModel):
    id: _uuid.UUID
    position: int
    title: str
    description: str | None
    block_count: int

    model_config = {"from_attributes": True}


class SpaceOverviewOut(BaseModel):
    id: _uuid.UUID
    title: str
    description: str | None
    is_owner: bool
    categories: list[CategoryOut]


class AddCategoryIn(BaseModel):
    name: str
    description: str | None = None


class ReorderCategoriesIn(BaseModel):
    ordered_ids: list[_uuid.UUID]


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str | None
    title: str
    description: str | None
    default_language: str
    status: CourseStatus
    generation_phase: GenerationPhase | None
    total_lessons: int
    total_blocks: int
    created_at: datetime
    updated_at: datetime