from app.features.tutor.prompts import SOCRATIC_SYSTEM_PROMPT


def test_socratic_prompt_contains_absolute_rules():
    assert "ABSOLUTE RULES" in SOCRATIC_SYSTEM_PROMPT
    assert "NEVER" in SOCRATIC_SYSTEM_PROMPT


def test_socratic_prompt_has_escalation_tiers():
    assert "Attempt 1-2" in SOCRATIC_SYSTEM_PROMPT
    assert "Attempt 5+" in SOCRATIC_SYSTEM_PROMPT