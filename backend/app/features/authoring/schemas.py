from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, model_validator


class MarkdownBlockContent(BaseModel):
    text: str


class CodeBlockContent(BaseModel):
    language: str
    starter_code: str
    solution: str
    tests: str


class MermaidBlockContent(BaseModel):
    diagram: str


class ConceptCheckContent(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class UnderstandingCheckContent(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class MarkdownBlock(BaseModel):
    type: Literal["markdown"]
    content: MarkdownBlockContent


class CodeBlock(BaseModel):
    type: Literal["code"]
    content: CodeBlockContent


class MermaidBlock(BaseModel):
    type: Literal["mermaid"]
    content: MermaidBlockContent


class ConceptCheckBlock(BaseModel):
    type: Literal["concept_check"]
    content: ConceptCheckContent


class UnderstandingCheckBlock(BaseModel):
    type: Literal["understanding_check"]
    content: UnderstandingCheckContent


AnyBlock = Annotated[
    Union[
        MarkdownBlock,
        CodeBlock,
        MermaidBlock,
        ConceptCheckBlock,
        UnderstandingCheckBlock,
    ],
    Field(discriminator="type"),
]


class LessonBlocks(BaseModel):
    blocks: list[AnyBlock]

    @model_validator(mode="after")
    def validate_last_block(self) -> "LessonBlocks":
        if self.blocks and self.blocks[-1].type != "understanding_check":
            raise ValueError('Last block must be of type "understanding_check"')
        return self