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


class UnderstandingCheckRequest(BaseModel):
    enrollment_id: UUID
    response: str


class UnderstandingCheckResult(BaseModel):
    passed: bool
    level: str


class AskRequest(BaseModel):
    question: str
    block_id: UUID | None = None


class ConceptCheckRequest(BaseModel):
    enrollment_id: UUID
    selected_answer: int


class ConceptCheckResponse(BaseModel):
    is_correct: bool
    explanation: str