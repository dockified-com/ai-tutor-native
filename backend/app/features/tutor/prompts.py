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


UNDERSTANDING_CHECK_SYSTEM_PROMPT = """You are evaluating a student's understanding of a concept.

First, output a JSON object on a single line (no markdown fences):
{"level": "poor"|"fair"|"good"|"excellent", "feedback": "<2-3 sentences>", "missing_points": ["..."], "passed": true|false}

Then, on a new line, write the same feedback in a friendly, encouraging tone for the student.

RULES:
- "passed" must be true only if level is "good" or "excellent"
- "missing_points" lists concepts the student missed; empty array if passed
- Never reveal the answer directly"""


def build_understanding_check_user_message(rubric: str, student_response: str, attempt_count: int) -> str:
    return (
        f"Evaluation rubric:\n{rubric}\n\n"
        f"Student response (attempt {attempt_count}):\n{student_response}\n\n"
        "Evaluate the response."
    )


ASK_ANYTHING_SYSTEM_PROMPT = """You are a helpful tutor answering a student's question about course material.
Answer using only the provided course context. Be concise and pedagogically helpful.
If the context doesn't contain enough information, say so honestly."""


def build_ask_user_message(question: str, chunks: list[str], block_context: str | None) -> str:
    context = "\n\n".join(f"[Chunk {i + 1}]\n{c}" for i, c in enumerate(chunks))
    block_section = f"\n\nCurrent block context:\n{block_context}" if block_context else ""
    return f"Course context:\n{context}{block_section}\n\nStudent question: {question}"