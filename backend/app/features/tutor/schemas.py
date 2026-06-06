from uuid import UUID
from pydantic import BaseModel, ConfigDict


class BlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    position: int
    type: str
    content: dict
    tts_audio_url: str | None


class RunCodeRequest(BaseModel):
    enrollment_id: UUID
    code: str
    language: str


class RunCodeResponse(BaseModel):
    submission_id: UUID
    verdict: str
    stdout: str | None
    stderr: str | None
    attempt_number: int


class SocraticHintRequest(BaseModel):
    enrollment_id: UUID