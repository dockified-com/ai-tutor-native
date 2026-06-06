from uuid import UUID
from pydantic import BaseModel, ConfigDict


class BlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    position: int
    type: str
    content: dict
    tts_audio_url: str | None