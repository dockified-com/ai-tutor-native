from enum import Enum
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class LessonStatus(str, Enum):
    generating = "generating"
    ready = "ready"
    failed = "failed"


class BlockType(str, Enum):
    markdown = "markdown"
    code = "code"
    mermaid = "mermaid"
    concept_check = "concept_check"
    understanding_check = "understanding_check"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (UniqueConstraint("course_id", "position"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    objectives: Mapped[list[str] | None] = mapped_column(ARRAY(Text()), nullable=True)
    status: Mapped[LessonStatus] = mapped_column(
        SQLEnum(LessonStatus, native_enum=False),
        nullable=False,
        server_default="generating",
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Block(Base):
    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("lesson_id", "position"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    lesson_id: Mapped[UUID] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[BlockType] = mapped_column(
        SQLEnum(BlockType, native_enum=False),
        nullable=False,
    )
    content: Mapped[dict] = mapped_column(JSONB(), nullable=False)
    tts_audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CourseChunk(Base):
    __tablename__ = "course_chunks"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
