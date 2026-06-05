from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base


class BlockProgressStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class BlockProgress(Base):
    """ORM model tracking a learner's progress on a single content block."""

    __tablename__ = "block_progress"
    __table_args__ = (UniqueConstraint("enrollment_id", "block_id"),)

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

    status: Mapped[BlockProgressStatus] = mapped_column(
        SQLEnum(BlockProgressStatus, native_enum=False),
        nullable=False,
        server_default=BlockProgressStatus.not_started.value,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
