from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class CodeVerdict(str, Enum):
    passed = "passed"
    failed = "failed"
    runtime_error = "runtime_error"
    compile_error = "compile_error"
    error = "error"


class UnderstandingLevel(str, Enum):
    poor = "poor"
    fair = "fair"
    good = "good"
    excellent = "excellent"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class CodeSubmission(Base):
    """Records each code submission made by a learner for a given block."""

    __tablename__ = "code_submissions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    enrollment_id: Mapped[UUID] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    block_id: Mapped[UUID] = mapped_column(
        ForeignKey("blocks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    judge0_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stdout: Mapped[str | None] = mapped_column(Text, nullable=True)
    stderr: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verdict: Mapped[CodeVerdict | None] = mapped_column(
        SQLEnum(CodeVerdict, native_enum=False),
        nullable=True,
    )
    socratic_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ConceptCheckAttempt(Base):
    """Records each attempt at a concept-check (multiple-choice) block."""

    __tablename__ = "concept_check_attempts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    enrollment_id: Mapped[UUID] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    block_id: Mapped[UUID] = mapped_column(
        ForeignKey("blocks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    selected_answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class UnderstandingCheckAttempt(Base):
    """Records each attempt at a free-text understanding-check block."""

    __tablename__ = "understanding_check_attempts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    enrollment_id: Mapped[UUID] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    block_id: Mapped[UUID] = mapped_column(
        ForeignKey("blocks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    response: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[UnderstandingLevel] = mapped_column(
        SQLEnum(UnderstandingLevel, native_enum=False),
        nullable=False,
    )
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    missing_points: Mapped[list[str] | None] = mapped_column(
        ARRAY(Text()), nullable=True
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Question(Base):
    """A learner question linked to an enrollment and optionally a block."""

    __tablename__ = "questions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    enrollment_id: Mapped[UUID] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    block_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("blocks.id", ondelete="SET NULL"),
        nullable=True,
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_chunks: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
