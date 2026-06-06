from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, constr, conint


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


class UnderstandingCheckRequest(BaseModel):
    enrollment_id: UUID
    response: constr(strip_whitespace=True, min_length=1)


class UnderstandingCheckResult(BaseModel):
    passed: bool
    level: Literal["poor", "fair", "good", "excellent"]


class AskRequest(BaseModel):
    question: constr(strip_whitespace=True, min_length=1)
    block_id: UUID | None = None


class ConceptCheckRequest(BaseModel):
    enrollment_id: UUID
    selected_answer: conint(ge=0)


class ConceptCheckResponse(BaseModel):
    is_correct: bool
    explanation: str