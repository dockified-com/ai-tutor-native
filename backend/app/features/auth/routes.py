from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import User
from app.features.auth.schemas import AppUserOut
from app.features.auth.service import get_or_create_user, update_user_from_clerk
from app.features.auth.webhook import verify_and_parse_clerk_webhook
from app.shared.deps import current_user, get_db

router = APIRouter(prefix="/api", tags=["auth"])


@router.get("/me", response_model=AppUserOut)
async def get_me(user: User = Depends(current_user)) -> AppUserOut:
    return AppUserOut.model_validate(user)


def _primary_email(data: dict) -> str | None:
    primary_id = data.get("primary_email_address_id")
    if not primary_id:
        return None
    return next(
        (
            e["email_address"]
            for e in data.get("email_addresses", [])
            if e.get("id") == primary_id
        ),
        None,
    )


def _display_name(data: dict) -> str | None:
    parts = [data.get("first_name"), data.get("last_name")]
    name = " ".join(p for p in parts if p)
    return name or None


@router.post("/auth/clerk-webhook", status_code=status.HTTP_204_NO_CONTENT)
async def clerk_webhook(
    request: Request, db: AsyncSession = Depends(get_db)
) -> None:
    event = await verify_and_parse_clerk_webhook(request)
    event_type = event.get("type")
    data = event.get("data", {})

    clerk_user_id = data.get("id")
    if not clerk_user_id:
        return

    email = _primary_email(data) or f"{clerk_user_id}@unknown.local"
    display_name = _display_name(data)

    if event_type == "user.created":
        await get_or_create_user(
            db,
            clerk_user_id=clerk_user_id,
            email=email,
            display_name=display_name,
        )
    elif event_type == "user.updated":
        await update_user_from_clerk(
            db,
            clerk_user_id=clerk_user_id,
            email=email,
            display_name=display_name,
        )
