import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.features.auth.models import User
from app.features.auth.service import get_or_create_user


@pytest.mark.asyncio
async def test_get_or_create_creates_when_missing():
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_tutor_test",
        future=True,
    )
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with SessionLocal() as db:
        # clean slate
        await db.execute(User.__table__.delete().where(User.clerk_user_id == "user_test1"))
        await db.commit()

        user = await get_or_create_user(
            db,
            clerk_user_id="user_test1",
            email="t1@example.com",
            display_name="T One",
        )
        await db.commit()
        assert user.clerk_user_id == "user_test1"

        again = await get_or_create_user(
            db,
            clerk_user_id="user_test1",
            email="DIFFERENT@example.com",   # ignored on existing user
            display_name="Ignored",
        )
        assert again.id == user.id
        assert again.email == "t1@example.com"

    await engine.dispose()
