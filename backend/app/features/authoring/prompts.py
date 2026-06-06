OUTLINE_SYSTEM_PROMPT = """Generate a course outline from the provided PDF text. The output must be JSON only, with no extra text.

Output format:
{"title": "...", "description": "...", "lessons": [{"position": 1, "title": "...", "summary": "...", "objectives": ["..."]}]}

Requirements:
- Create a pedagogically sound course outline with logical lesson flow
- Each lesson should have a clear title, summary, and learning objectives
- Output must be valid JSON only, no extra text"""


LESSON_BLOCKS_SYSTEM_PROMPT = """Generate lesson content blocks from the provided text. The output must be JSON only, with no extra text.

Output format:
{"blocks": [{"type": "markdown", "content": {"text": "..."}}, {"type": "understanding_check", "content": {"question": "...", "options": ["..."], "correct_index": 0, "explanation": "..."}}]}

Block types available:
- markdown: {"type": "markdown", "content": {"text": "..."}}
- code: {"type": "code", "content": {"language": "...", "starter_code": "...", "solution": "...", "tests": "..."}}
- mermaid: {"type": "mermaid", "content": {"diagram": "..."}}
- concept_check: {"type": "concept_check", "content": {"question": "...", "options": ["..."], "correct_index": 0, "explanation": "..."}}
- understanding_check: {"type": "understanding_check", "content": {"question": "...", "options": ["..."], "correct_index": 0, "explanation": "..."}}

Requirements:
- Mix different block types to create engaging lessons
- Always end with an understanding_check block
- Output must be valid JSON only, no extra text"""