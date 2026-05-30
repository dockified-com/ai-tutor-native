from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User, UserRole


async def get_or_create_user(
    db: AsyncSession,
    *,
    clerk_user_id: str,
    email: str,
    display_name: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    user = User(
        clerk_user_id=clerk_user_id,
        email=email,
        display_name=display_name,
        role=UserRole.student,
    )
    db.add(user)
    await db.flush()  # populate `id` without committing
    return user


async def update_user_from_clerk(
    db: AsyncSession,
    *,
    clerk_user_id: str,
    email: str,
    display_name: str | None,
) -> User | None:
    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    user.email = email
    user.display_name = display_name
    await db.flush()
    return user
