from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EnrollByCodeRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    current_lesson_id: UUID | None
    current_block_id: UUID | None
    started_at: datetime
    completed_at: datetime | None