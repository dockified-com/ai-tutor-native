import uuid as _uuid
from pydantic import BaseModel


class BlockOut(BaseModel):
    id: _uuid.UUID
    position: int
    type: str
    content: dict

    model_config = {"from_attributes": True}


class LessonDetailOut(BaseModel):
    id: _uuid.UUID
    title: str
    status: str
    course_id: _uuid.UUID
    is_owner: bool
    blocks: list[BlockOut]


class PatchBlockIn(BaseModel):
    content: dict


class AgentEditIn(BaseModel):
    message: str


class AgentEditOut(BaseModel):
    reply: str
    blocks: list[BlockOut]