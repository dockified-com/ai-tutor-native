# Validation — Week 5: Ask Anything, Understanding Check, Concept Check

## Automated Tests Must Pass

```bash
cd backend && uv run pytest tests/unit/test_week5.py tests/integration/test_week5.py -v
```

All tests green. No regressions in prior test suites:

```bash
uv run pytest tests/ -v
```

---

## Unit Test Coverage

| Test | What it proves |
|---|---|
| `test_level_order_threshold` | `'good'`/`'excellent'` → `passed=True`; `'poor'`/`'fair'` → `passed=False` |
| `test_concept_check_correct` | `selected_answer == correct_index` → `is_correct=True` |
| `test_concept_check_wrong` | `selected_answer != correct_index` → `is_correct=False` |
| `test_strip_sensitive_fields_understanding_check` | `evaluation_rubric` absent from `strip_sensitive_fields` output |

---

## Integration Test Coverage

| Test | What it proves |
|---|---|
| `test_understanding_check_streams_result_event` | SSE response contains a `result` event with `{"passed": bool, "level": str}` |
| `test_ask_anything_persists_question` | After stream, a `Question` row exists with correct `question_text` and non-empty `answer_text` |
| `test_concept_check_no_answer_leak` | `GET /api/lessons/{id}/blocks` does not include `correct_index` or `explanation` in any block |

---

## Manual Smoke Checks (optional pre-merge)

- `POST /api/blocks/{id}/understanding-check` with a poor response → streams feedback + `result: {"passed": false, "level": "poor"}`
- `POST /api/blocks/{id}/understanding-check` with a good response → `result: {"passed": true, "level": "good"}`
- `POST /api/enrollments/{id}/ask` → streams tokens, `Question` row created in DB
- `POST /api/blocks/{id}/concept-check` with wrong answer → `{"is_correct": false, "explanation": "..."}`, `ConceptCheckAttempt` row written
- `GET /api/lessons/{id}/blocks` → no `evaluation_rubric`, `correct_index`, or `explanation` in response

---

## Progress Tracker Update

Before merging, update `backend/context/4-progress-tracker.md`:
- Mark all Week 5 tasks as `✅`
- Update summary dashboard (Week 4 to 100% also — it's complete per git but shows 0%)
- Update "Last updated" date

---

## Merge Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass  
- [ ] No regressions in weeks 1–4 tests
- [ ] `ruff check` passes (line length 100, Python 3.12)
- [ ] No `correct_index`, `explanation`, or `evaluation_rubric` visible in block listing response
- [ ] Progress tracker updated
