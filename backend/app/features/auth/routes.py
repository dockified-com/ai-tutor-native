from fastapi import APIRouter, Depends

from app.features.auth.models import User
from app.features.auth.schemas import AppUserOut
from app.shared.deps import current_user

router = APIRouter(prefix="/api", tags=["auth"])


@router.get("/me", response_model=AppUserOut)
async def get_me(user: User = Depends(current_user)) -> AppUserOut:
    return AppUserOut.model_validate(user)
