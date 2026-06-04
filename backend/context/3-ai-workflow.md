# 3 — AI Workflow
## Rules of Engagement for AI Agents — Backend V1

**Source:** `docs/architecture/04_backend_plan.md` · `docs/product/01_prd.md` · `docs/superpowers/specs/2026-05-30-ai-native-tutor-design.md`

---

## Scope Constraint

> You are operating exclusively inside the `backend/` directory.
> **You must never read, write, or modify any file under `frontend/`.**
> If a task references frontend code, stop and clarify with the user.

---

## Allowed Actions (DO)

### Code & Architecture
- ✅ Create, edit, or delete files exclusively inside `backend/`
- ✅ Follow the feature-sliced module structure (`features/X/`, `shared/`)
- ✅ Import within the same feature: `features/X/` → `features/X/`
- ✅ Import from shared infra: `features/X/` → `shared/`
- ✅ Register routers in `app/main.py` only
- ✅ Write all I/O as `async/await` — DB, HTTP, AI, file uploads
- ✅ Use Pydantic v2 `model_validate()` at every module boundary
- ✅ Use the direct Anthropic SDK (`anthropic.AsyncAnthropic`) for all LLM calls
- ✅ Use the direct OpenAI SDK (`openai.AsyncOpenAI`) for TTS
- ✅ Use `httpx.AsyncClient` for Judge0 API calls
- ✅ Use `sse_starlette.EventSourceResponse` for all SSE streaming endpoints
- ✅ Use `asyncio.gather` with a semaphore for parallelism (TTS batch, embedding batch)
- ✅ Apply the Socratic system prompt on every call to `/socratic-hint` and `/understanding-check`
- ✅ Strip `hint_seed_prompt` and `evaluation_rubric` from block content before returning to client

### Database
- ✅ Create SQLAlchemy ORM models inheriting `app.shared.db.Base`
- ✅ Register new model modules in `alembic/env.py` before running autogenerate
- ✅ Generate migrations with `alembic revision --autogenerate -m "description"`
- ✅ Use `flush()` (not `commit()`) inside service functions — let `get_db()` control commit

### Testing
- ✅ Write `pytest` unit tests for all verdict logic, schema validation, chunking utilities
- ✅ Write `pytest-asyncio` integration tests using `httpx.AsyncClient` + `ASGITransport`
- ✅ Mock all external calls (Anthropic, OpenAI, Judge0) using `pytest-mock` — never burn real API budget in CI
- ✅ Assert that Socratic hints do NOT contain the solution code (anti-leak assertion)

### Progress Tracking
- ✅ Update `backend/context/4-progress-tracker.md` after completing each task
- ✅ Update status markers in `backend/CONTEXT.md` (§3, §8, §10, §11) from 🔴 TODO → ✅ Done

---

## Forbidden Actions (DON'T)

### Architecture
- ❌ **NEVER** import `features/X/` from `features/Y/` (cross-feature imports)
- ❌ **NEVER** bypass a feature's `__init__.py` to access its internals from another feature
- ❌ **NEVER** put business logic in route handlers — routes call services, services do logic
- ❌ **NEVER** use synchronous DB calls, synchronous HTTP calls, or `time.sleep()` in async contexts
- ❌ **NEVER** pass unvalidated dicts across module boundaries — always use Pydantic models
- ❌ **NEVER** commit DB transactions inside service functions — only `flush()`

### Dependencies
- ❌ **NEVER** use LangChain, LangGraph, or LlamaIndex in V1
- ❌ **NEVER** add packages not in `pyproject.toml` without updating it
- ❌ **NEVER** use Celery, Redis, or threading in V1 — only `asyncio` in-process tasks
- ❌ **NEVER** use Supabase Auth — authentication is handled exclusively by Clerk JWTs

### Security
- ❌ **NEVER** skip `Depends(current_user)` on protected endpoints
- ❌ **NEVER** trust client-provided resource IDs without ownership verification
- ❌ **NEVER** return `hint_seed_prompt` or `evaluation_rubric` to the client
- ❌ **NEVER** hard-code API keys, DB credentials, or secrets — use `settings` from `shared/config.py`
- ❌ **NEVER** log Clerk tokens, API keys, or user PII

### Pedagogy
- ❌ **NEVER** write a Socratic hint that contains the correct solution code
- ❌ **NEVER** write an understanding-check evaluator that bypasses the rubric threshold
- ❌ **NEVER** allow a code block to be marked `passed` without a verified Judge0 verdict
- ❌ **NEVER** write `block_progress`, `code_submissions`, `concept_check_attempts`, or `understanding_check_attempts` when `?preview=true` is set

### Scope
- ❌ **NEVER** touch any file under `frontend/`
- ❌ **NEVER** skip ahead in the roadmap — execute Week 2A before 2B, 2B before 2C, etc.
- ❌ **NEVER** invent content not grounded in the reference docs in `docs/`

---

## Task Execution Protocol

When given any backend task, execute these steps in order:

```
Step 1 — READ this file (3-ai-workflow.md)
Step 2 — READ 4-progress-tracker.md to confirm the current active task
Step 3 — READ 5-roadmap.md to confirm you are on the correct step
Step 4 — OUTPUT an execution plan (files to create/modify, models needed, migration needed)
         Wait for user approval if the plan involves schema changes or new migrations
Step 5 — IMPLEMENT atomically, file by file
Step 6 — UPDATE 4-progress-tracker.md and CONTEXT.md status markers
```

**Never skip Step 4.** Planning before writing prevents architecture mistakes that are expensive to undo.

---

## AI Call Guardrails

### Socratic Hint System Prompt (enforced on every call)
```
You are a Socratic programming tutor. Your job is to guide the student to the solution
through questions and hints, NEVER by revealing the answer.

ABSOLUTE RULES:
1. NEVER write the correct solution code
2. NEVER complete the student's code for them
3. NEVER say "here's the answer" or equivalent
4. Escalate guidance proportional to attempt_count:
   - Attempt 1-2: High-level conceptual guidance
   - Attempt 3-4: Point to the specific problematic line/concept
   - Attempt 5+: Walk through an ANALOGOUS simpler example (different problem, same concept)
5. Always end with a question that prompts the student to think
```

### Understanding Check System Prompt (enforced on every call)
```
You are evaluating a student's understanding.
Return a JSON object: {"level": "poor|fair|good|excellent", "feedback": "...", "missing_points": [...]}
- "feedback" for PASS (level >= threshold): encouraging, confirming what they got right
- "feedback" for FAIL (level < threshold): Socratic — point to gaps, ask leading questions, NEVER give the answer
```

---

## Error Handling Rules

### Generation Pipeline (offline)
| Failure | Required Behavior |
|---|---|
| PDF extraction empty (scanned) | Reject at upload; 400 "OCR not supported in V1" |
| Embedding API timeout | Retry ×3 with exponential backoff; then `course.status = 'failed'` |
| Outline LLM call fails | Retry ×2; on failure, course marked `failed`, creator can retry |
| Per-lesson generation fails | Mark only that `lesson.status = 'failed'`; other lessons unaffected |
| TTS API fails | `tts_audio_url = null`; course still publishable; audio degrades silently |
| Course code collision on publish | Retry with new random code (max 5×) |

### Realtime Endpoints
| Failure | Required Behavior |
|---|---|
| Judge0 timeout / 5xx | `{verdict: 'error', ...}` — does NOT count as a failed attempt |
| Anthropic 5xx / rate-limit | SSE `{event: 'error', data: 'AI temporarily unavailable'}` — non-counted |
| RAG returns zero chunks | Continue with empty context; LLM answers with course summary only |
| User accesses wrong enrollment | 403 ForbiddenError |
| Concurrent submissions | Idempotent via `attempt_number` |
