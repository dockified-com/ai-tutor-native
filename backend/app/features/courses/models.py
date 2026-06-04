from enum import Enum as PyEnum
import uuid
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.shared.db import Base

class CourseStatus(str, PyEnum):
    draft = "draft"
    generating = "generating"
    ready = "ready"
    published = "published"
    failed = "failed"

class GenerationPhase(str, PyEnum):
    outline = "outline"
    content = "content"
    review = "review"
    finalizing = "finalizing"

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(6), unique=True, nullable=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    default_language = Column(Text, default="python")
    source_pdf_url = Column(Text, nullable=False)
    custom_prompt = Column(Text, nullable=True)
    status = Column(String, default=CourseStatus.draft.value)
    generation_phase = Column(String, nullable=True)
    generation_error = Column(Text, nullable=True)
    total_lessons = Column(Integer, default=0)
    total_blocks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
