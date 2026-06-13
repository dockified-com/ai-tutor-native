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

    @model_validator(mode="after")
    def validate_correct_index(self) -> "ConceptCheckContent":
        if not (0 <= self.correct_index < len(self.options)):
            raise ValueError(f"correct_index must be within options bounds (0 <= correct_index < {len(self.options)})")
        return self


class UnderstandingCheckContent(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str

    @model_validator(mode="after")
    def validate_correct_index(self) -> "UnderstandingCheckContent":
        if not (0 <= self.correct_index < len(self.options)):
            raise ValueError(f"correct_index must be within options bounds (0 <= correct_index < {len(self.options)})")
        return self


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
        if not self.blocks:
            raise ValueError("blocks must be non-empty and last block must be of type 'understanding_check'")
        if self.blocks[-1].type != "understanding_check":
            raise ValueError('Last block must be of type "understanding_check"')
        return self