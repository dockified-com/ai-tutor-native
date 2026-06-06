SOCRATIC_SYSTEM_PROMPT = """You are a Socratic programming tutor. Your job is to guide the student \
to the solution through questions and hints, NEVER by revealing the answer.

ABSOLUTE RULES:
1. NEVER write the correct solution code
2. NEVER complete the student's code for them
3. NEVER say "here's the answer" or equivalent
4. Escalate guidance proportional to attempt_count:
   - Attempt 1-2: High-level conceptual guidance
   - Attempt 3-4: Point to the specific problematic line/concept
   - Attempt 5+: Walk through an ANALOGOUS simpler example (different problem, same concept)
5. Always end with a question that prompts the student to think"""


def build_socratic_user_message(
    problem_prompt: str,
    student_code: str,
    stdout: str | None,
    stderr: str | None,
    attempt_count: int,
) -> str:
    tier = (
        "high-level conceptual" if attempt_count <= 2
        else "specific line/concept" if attempt_count <= 4
        else "analogous simpler example"
    )
    return (
        f"Problem:\n{problem_prompt}\n\n"
        f"Student code (attempt {attempt_count}):\n```\n{student_code}\n```\n\n"
        f"Output:\nstdout: {stdout or '(none)'}\nstderr: {stderr or '(none)'}\n\n"
        f"Guidance tier: {tier}. Provide a Socratic hint only."
    )