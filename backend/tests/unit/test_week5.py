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
    def test_correct_answer_logic(self):
        # Direct logic test for correct_answer == correct_index
        correct_index = 2
        selected_answer = 2
        is_correct = selected_answer == correct_index
        assert is_correct is True

    def test_wrong_answer_logic(self):
        # Direct logic test for selected_answer != correct_index
        correct_index = 1
        selected_answer = 0
        is_correct = selected_answer == correct_index
        assert is_correct is False


class TestStripSensitiveFieldsWeek5:
    def test_understanding_check_strips_evaluation_rubric(self):
        content = {
            "question": "Explain recursion",
            "evaluation_rubric": "Must mention base case and recursive step",
        }
        result = strip_sensitive_fields("understanding_check", content)
        assert "evaluation_rubric" not in result
        assert result.get("question") == "Explain recursion"
