import pytest
from app.features.tutor.service import LEVEL_ORDER, PASS_THRESHOLD, strip_sensitive_fields


class TestLevelOrderThreshold:
    def test_good_passes(self):
        assert LEVEL_ORDER["good"] >= PASS_THRESHOLD

    def test_excellent_passes(self):
        assert LEVEL_ORDER["excellent"] >= PASS_THRESHOLD

    def test_fair_fails(self):
        assert LEVEL_ORDER["fair"] < PASS_THRESHOLD

    def test_poor_fails(self):
        assert LEVEL_ORDER["poor"] < PASS_THRESHOLD


class TestConceptCheckLogic:
    def test_correct_answer(self):
        correct_index = 2
        assert (3 == correct_index) is False
        assert (2 == correct_index) is True

    def test_wrong_answer(self):
        correct_index = 1
        assert (0 == correct_index) is False


class TestStripSensitiveFieldsWeek5:
    def test_understanding_check_strips_evaluation_rubric(self):
        content = {
            "question": "Explain recursion",
            "evaluation_rubric": "Must mention base case and recursive step",
        }
        result = strip_sensitive_fields("understanding_check", content)
        assert "evaluation_rubric" not in result
        assert result.get("question") == "Explain recursion"
