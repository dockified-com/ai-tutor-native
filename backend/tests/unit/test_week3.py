import pytest
from pydantic import ValidationError

from app.features.tutor.service import strip_sensitive_fields
from app.features.enrollment.schemas import EnrollByCodeRequest


class TestStripSensitiveFields:
    def test_code_block_strips_solution_and_tests(self):
        content = {"language": "python", "starter_code": "def foo():", "solution": "def foo():\n    pass", "tests": ["assert foo() is None"]}
        result = strip_sensitive_fields("code", content)
        assert "solution" not in result
        assert "tests" not in result
        assert result["language"] == "python"
        assert result["starter_code"] == "def foo():"

    def test_concept_check_strips_correct_index_and_explanation(self):
        content = {"question": "What is 2+2?", "options": ["3", "4", "5"], "correct_index": 1, "explanation": "Because 2+2=4"}
        result = strip_sensitive_fields("concept_check", content)
        assert "correct_index" not in result
        assert "explanation" not in result
        assert result["question"] == "What is 2+2?"
        assert result["options"] == ["3", "4", "5"]

    def test_understanding_check_strips_correct_index_and_explanation(self):
        content = {"question": "Explain recursion", "correct_index": 0, "explanation": "Base case + recursive call"}
        result = strip_sensitive_fields("understanding_check", content)
        assert "correct_index" not in result
        assert "explanation" not in result
        assert result["question"] == "Explain recursion"

    def test_markdown_block_unchanged(self):
        content = {"text": "# Hello World", "format": "markdown"}
        result = strip_sensitive_fields("markdown", content)
        assert result == content

    def test_mermaid_block_unchanged(self):
        content = {"text": "graph TD;\nA-->B;", "format": "mermaid"}
        result = strip_sensitive_fields("mermaid", content)
        assert result == content

    def test_does_not_mutate_original(self):
        content = {"language": "python", "solution": "x=1", "tests": ["assert x==1"]}
        original = content.copy()
        strip_sensitive_fields("code", content)
        assert "solution" in content
        assert "tests" in content
        assert content == original


class TestEnrollByCodeRequest:
    def test_valid_6_char_code(self):
        req = EnrollByCodeRequest(code="ABC123")
        assert req.code == "ABC123"

    def test_5_char_code_raises(self):
        with pytest.raises(ValidationError):
            EnrollByCodeRequest(code="ABC12")

    def test_7_char_code_raises(self):
        with pytest.raises(ValidationError):
            EnrollByCodeRequest(code="ABC1234")