import json
from datetime import datetime, timezone

import pytest
from svix.webhooks import Webhook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.features.auth.models import User


@pytest.mark.asyncio
async def test_user_created_webhook_creates_row(client, monkeypatch):
    secret = "whsec_" + "x" * 32
    monkeypatch.setenv("CLERK_WEBHOOK_SECRET", secret)
    from app.shared import config as cfg
    if hasattr(cfg.get_settings, "cache_clear"):
        cfg.get_settings.cache_clear()

    payload = {
        "type": "user.created",
        "data": {
            "id": "user_hook1",
            "primary_email_address_id": "idem1",
            "email_addresses": [{"id": "idem1", "email_address": "hook1@example.com"}],
            "first_name": "Hook",
            "last_name": "One",
        },
    }
    body = json.dumps(payload)
    wh = Webhook(secret)
    msg_id = "msg_test1"
    ts_dt = datetime.now(tz=timezone.utc)
    signature = wh.sign(msg_id, ts_dt, body)

    headers = {
        "svix-id": msg_id,
        "svix-timestamp": str(int(ts_dt.timestamp())),
        "svix-signature": signature,
        "content-type": "application/json",
    }

    # Pre-cleanup
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_tutor_test",
        future=True,
    )
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with SessionLocal() as db:
        await db.execute(User.__table__.delete().where(User.clerk_user_id == "user_hook1"))
        await db.commit()

    resp = await client.post("/api/auth/clerk-webhook", content=body, headers=headers)
    assert resp.status_code == 204, resp.text

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.clerk_user_id == "user_hook1"))
        user = result.scalar_one()
        assert user.email == "hook1@example.com"
        assert user.display_name == "Hook One"
        await db.delete(user)
        await db.commit()
    await engine.dispose()
