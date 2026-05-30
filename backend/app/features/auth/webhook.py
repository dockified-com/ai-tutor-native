from __future__ import annotations

from fastapi import HTTPException, Request, status
from svix.webhooks import Webhook, WebhookVerificationError

from app.shared.config import get_settings


async def verify_and_parse_clerk_webhook(request: Request) -> dict:
    settings = get_settings()
    payload = await request.body()
    headers = {k: v for k, v in request.headers.items()}

    try:
        wh = Webhook(settings.clerk_webhook_secret)
        event = wh.verify(payload, headers)
    except WebhookVerificationError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"invalid webhook signature: {exc}",
        ) from exc
    return event
