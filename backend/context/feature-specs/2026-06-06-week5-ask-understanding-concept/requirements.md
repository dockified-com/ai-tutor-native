# Week 5 — Ask Anything, Understanding Check, Concept Check

## Scope

Extend `features/tutor/` with three new endpoints. All build on the existing `tutor_router` already registered in `app/main.py`.

---

## Endpoints

### 1. `POST /api/blocks/{id}/understanding-check` (SSE)

**Purpose:** Evaluate a student's free-text response against the block's evaluation rubric using Claude. Stream feedback tokens and emit a final `result` event.

**Request body:** `{ "enrollment_id": UUID, "response": str }`

**SSE events:**
- `token` — feedback text chunks
- `result` — JSON string `{"passed": bool, "level": str}` (one event, after stream ends)
- `done` — empty, signals stream end
- `error` — AI failure message

**Pass threshold:** Hardcoded — level must be `'good'` or `'excellent'` (`LEVEL_ORDER >= 2`).

**DB write:** Persist `UnderstandingCheckAttempt` row after stream completes (attempt_number = prior count + 1).

**Security:** Strip `evaluation_rubric` from block content before sending to client. Ownership check via `enrollment_id → user_id`.

---

### 2. `POST /api/enrollments/{id}/ask` (SSE)

**Purpose:** RAG-powered Q&A — retrieve top-5 course chunks matching the question, add active block context, stream Claude's answer.

**Request body:** `{ "question": str, "block_id": UUID | null }`

**SSE events:** `token`, `done`, `error`

**Persistence:** After stream completes, write one `Question` row (`question_text`, `answer_text` accumulated from tokens, `source_chunks` as JSONB array of chunk IDs/content).

**Context build:** RAG top-5 chunks from `course_chunks` (pgvector cosine similarity) + current block content if `block_id` provided.

**Security:** Enrollment ownership check (`enrollment.user_id == current_user.id`). Must resolve `course_id` from enrollment for RAG scope.

---

### 3. `POST /api/blocks/{id}/concept-check`

**Purpose:** Stateless correctness check — no LLM call. Look up `correct_index` and `explanation` from block content (server-side only), compare with `selected_answer`, return result.

**Request body:** `{ "enrollment_id": UUID, "selected_answer": int }`

**Response:** `{ "is_correct": bool, "explanation": str }`

**DB write:** Persist `ConceptCheckAttempt` row (attempt_number = prior count + 1, `selected_answer`, `is_correct`, `explanation`).

**Security:** `correct_index` and `explanation` never sent to client in block listing (already stripped in `strip_sensitive_fields`). Ownership check on enrollment.

---

## Data Models (already exist — `tutor/models.py`)

- `UnderstandingCheckAttempt` — `enrollment_id`, `block_id`, `response`, `level`, `feedback`, `passed`, `missing_points`, `attempt_number`
- `Question` — `enrollment_id`, `block_id` (nullable), `question_text`, `answer_text`, `source_chunks`
- `ConceptCheckAttempt` — `enrollment_id`, `block_id`, `selected_answer`, `is_correct`, `explanation`, `attempt_number`

---

## Key Constants

```python
LEVEL_ORDER = {'poor': 0, 'fair': 1, 'good': 2, 'excellent': 3}
PASS_THRESHOLD = 2  # 'good' or above
```

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Understanding check pass threshold | Hardcoded `'good'` or above | Consistent grading across all blocks; no per-block override needed in V1 |
| Ask Anything persistence | Persist `Question` row after stream | Enables future history/context features |
| Concept check DB write | Persist `ConceptCheckAttempt` | Consistent with `CodeSubmission` pattern; enables attempt analytics |
| RAG top-k | 5 chunks | Matches `shared/rag/retriever.py` default |
| Understanding check Claude model | `claude-sonnet-4-6` | Matches tech stack spec |

---

## Constraints

- No cross-feature imports — all queries stay within `tutor/` or use `shared/`
- Vanilla SDK only — no LangChain/LlamaIndex
- All async/await
- Pydantic v2 models for all request/response boundaries
- `evaluation_rubric` field stripped server-side in `strip_sensitive_fields()` for `understanding_check` blocks
