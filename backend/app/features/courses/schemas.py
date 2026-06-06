from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .models import CourseStatus, GenerationPhase


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