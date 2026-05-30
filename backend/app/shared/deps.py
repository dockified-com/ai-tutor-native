from collections.abc import AsyncIterator
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.clerk import ClerkAuthError, ClerkJwksClient, ClerkVerifier
from app.features.auth.models import User
from app.features.auth.service import get_or_create_user
from app.shared.config import Settings, get_settings
from app.shared.db import SessionLocal


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@lru_cache
def _jwks_client_singleton() -> ClerkJwksClient:
    return ClerkJwksClient(jwks_url=get_settings().clerk_jwks_url)


def _expected_issuer(jwks_url: str) -> str:
    return jwks_url.rsplit("/.well-known", 1)[0]


async def current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    token = authorization.split(" ", 1)[1]

    keys = await _jwks_client_singleton().get_keys()
    verifier = ClerkVerifier(
        public_keys=keys,
        expected_issuer=_expected_issuer(settings.clerk_jwks_url),
    )
    try:
        claims = verifier.verify(token)
    except ClerkAuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    clerk_user_id: str = claims["sub"]
    email = claims.get("email") or f"{clerk_user_id}@unknown.local"
    display_name = claims.get("name")

    return await get_or_create_user(
        db,
        clerk_user_id=clerk_user_id,
        email=email,
        display_name=display_name,
    )
