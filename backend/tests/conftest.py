import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Force test env BEFORE importing app
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_tutor_test",
)
os.environ.setdefault("CLERK_PUBLISHABLE_KEY", "pk_test_x")
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_x")
os.environ.setdefault("CLERK_JWKS_URL", "https://example.invalid/jwks")
os.environ.setdefault("CLERK_WEBHOOK_SECRET", "whsec_x")

from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
