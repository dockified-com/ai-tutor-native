# Plan — Week 5: Ask Anything, Understanding Check, Concept Check

All work is additive to `features/tutor/` — no new feature directories.

---

## Task Group 1 — Schemas (sequential)

**1.1** Add to `tutor/schemas.py`:
- `UnderstandingCheckRequest` — `enrollment_id: UUID`, `response: str`
- `UnderstandingCheckResult` — `passed: bool`, `level: str`
- `AskRequest` — `question: str`, `block_id: UUID | None`
- `ConceptCheckRequest` — `enrollment_id: UUID`, `selected_answer: int`
- `ConceptCheckResponse` — `is_correct: bool`, `explanation: str`

---

## Task Group 2 — Prompts (sequential)

**2.1** Add to `tutor/prompts.py`:
- `UNDERSTANDING_CHECK_SYSTEM_PROMPT` — instructs Claude to evaluate a student's response against an evaluation rubric, return **structured JSON** `{"level": "poor"|"fair"|"good"|"excellent", "feedback": str, "missing_points": list[str], "passed": bool}`, then stream human-readable feedback.
- `build_understanding_check_user_message(rubric, student_response, attempt_count)` — formats the prompt.
- `ASK_ANYTHING_SYSTEM_PROMPT` — instructs Claude to answer using only provided course context, be concise and pedagogically helpful.
- `build_ask_user_message(question, chunks, block_context)` — formats RAG context + question.

---

## Task Group 3 — Service functions (can use subagent: haiku)

> **Subagent note:** Task Group 3 has three independent service functions. Each can be implemented in parallel using `minimax-m2.5` subagent. They share no state during implementation — only the existing shared infra (`anthropic_client`, `retriever`, ORM models).

**3.1** `evaluate_understanding(db, user, block_id, enrollment_id, response)` → `AsyncGenerator`
- Verify enrollment ownership
- Load `understanding_check` block, get `evaluation_rubric` from content
- Count prior `UnderstandingCheckAttempt` for `attempt_number`
- Stream Claude with `UNDERSTANDING_CHECK_SYSTEM_PROMPT`; accumulate full text
- Parse JSON from accumulated text to get `level`, `feedback`, `missing_points`
- Determine `passed = LEVEL_ORDER[level] >= PASS_THRESHOLD`
- Persist `UnderstandingCheckAttempt` row
- Yield `token` events during stream, then `result` event `{"passed": bool, "level": str}`, then `done`

**3.2** `ask_anything(db, user, enrollment_id, question, block_id)` → `AsyncGenerator`
- Verify enrollment ownership; get `course_id`
- RAG: `retrieve(query=question, course_id=course_id, db=db, top_k=5)` from `shared/rag/retriever.py`
- Optionally load `block_content` if `block_id` provided
- Build prompt with `build_ask_user_message`
- Stream Claude; accumulate `answer_text`
- After stream: persist `Question` row with `question_text`, `answer_text`, `source_chunks` (list of chunk IDs)
- Yield `token`, `done`, `error` events

**3.3** `check_concept(db, user, block_id, enrollment_id, selected_answer)` → `ConceptCheckResponse`
- Verify enrollment ownership
- Load `concept_check` block; get `correct_index` and `explanation` from content
- Count prior `ConceptCheckAttempt` for `attempt_number`
- `is_correct = selected_answer == correct_index`
- Persist `ConceptCheckAttempt`
- Return `ConceptCheckResponse`

---

## Task Group 4 — Routes (sequential, depends on Groups 1–3)

**4.1** Add to `tutor/routes.py`:
- `POST /api/blocks/{id}/understanding-check` → `EventSourceResponse(evaluate_understanding(...))`
- `POST /api/enrollments/{id}/ask` → `EventSourceResponse(ask_anything(...))`
- `POST /api/blocks/{id}/concept-check` → `check_concept(...)` (sync JSON response)

---

## Task Group 5 — Tests (can use subagent: haiku)

> **Subagent note:** Unit test (5.1) and integration test (5.2) are independent and can be written in parallel.

**5.1** Unit test `tests/unit/test_week5.py`:
- `test_level_order_threshold` — `'good'` passes, `'fair'` fails, `'excellent'` passes, `'poor'` fails
- `test_concept_check_correct` / `test_concept_check_wrong` — correct_index comparison logic
- `test_strip_sensitive_fields_understanding_check` — `evaluation_rubric` stripped

**5.2** Integration test `tests/integration/test_week5.py`:
- `test_understanding_check_streams_result_event` — mock Claude stream, assert `result` event in SSE output
- `test_ask_anything_persists_question` — mock RAG + Claude, assert `Question` row written
- `test_concept_check_no_answer_leak` — assert `correct_index` absent from `/lessons/{id}/blocks` response

---

## Execution Order

```text
Group 1 (schemas)
  ↓
Group 2 (prompts)
  ↓
Group 3 (service) ← parallel: 3.1, 3.2, 3.3
  ↓
Group 4 (routes)
  ↓
Group 5 (tests)   ← parallel: 5.1, 5.2
```
