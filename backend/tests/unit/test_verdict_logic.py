from app.features.tutor.prompts import SOCRATIC_SYSTEM_PROMPT


def test_socratic_prompt_contains_absolute_rules():
    assert "ABSOLUTE RULES" in SOCRATIC_SYSTEM_PROMPT
    assert "NEVER" in SOCRATIC_SYSTEM_PROMPT


def test_socratic_prompt_has_escalation_tiers():
    assert "Attempt 1-2" in SOCRATIC_SYSTEM_PROMPT
    assert "Attempt 5+" in SOCRATIC_SYSTEM_PROMPT


from app.features.tutor.service import evaluate_verdict
from app.shared.ai.judge0_client import Judge0Result


def test_verdict_runtime_error_on_time_limit():
    result = Judge0Result(stdout=None, stderr=None, status="Time Limit Exceeded")
    verdict = evaluate_verdict(result, expected_output=None)
    assert verdict == "runtime_error"


def test_verdict_compile_error():
    result = Judge0Result(stdout=None, stderr="error: expected ';'", status="Compilation Error")
    verdict = evaluate_verdict(result, expected_output=None)
    assert verdict == "compile_error"


def test_verdict_runtime_error_generic():
    result = Judge0Result(stdout=None, stderr="segfault", status="Runtime Error")
    verdict = evaluate_verdict(result, expected_output=None)
    assert verdict == "runtime_error"


def test_verdict_passed_exact_match():
    result = Judge0Result(stdout="42\n", stderr=None, status="Accepted")
    verdict = evaluate_verdict(result, expected_output="42")
    assert verdict == "passed"


def test_verdict_failed_mismatch():
    result = Judge0Result(stdout="43\n", stderr=None, status="Accepted")
    verdict = evaluate_verdict(result, expected_output="42")
    assert verdict == "failed"