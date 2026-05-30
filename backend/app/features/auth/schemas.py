from pydantic import BaseModel, EmailStr

from app.features.auth.models import UserRole


class AppUserOut(BaseModel):
    clerk_user_id: str
    email: EmailStr
    display_name: str | None
    role: UserRole

    model_config = {"from_attributes": True}
