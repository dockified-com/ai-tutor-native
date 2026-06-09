# Phase 4 — Next Owns the DB — RESUME / HANDOFF

> **What this is:** A self-contained resume doc for the Phase 4 rewiring. The in-session TaskList is ephemeral (gone on a new session), so this file holds the full task breakdown + all porting context. Read this top-to-bottom and you can continue cold.
>
> **Execution skill:** superpowers:subagent-driven-development — fresh implementer subagent per task, two-stage review (spec compliance, then code quality) between each. Sequential in dependency order.

---

## 0. Where things stand (UPDATE THIS as you go)

- **Status:** **COMPLETE. All T1–T9 committed on branch `lyyeakkhai`.** Last commit: `f547f2d`.

### Task checklist
- [x] T1 — Prisma client + schema + env
- [x] T2 — pgvector cosine RAG search (`$queryRaw`)
- [x] T3 — Clerk auth + user resolution + enrollment ownership
- [x] T4 — DB data-access query helpers
- [x] T5 — Judge0 client + verdict logic
- [x] T6 — Rewire `run_code` route
- [x] T7 — Rewire `agent-edit` route
- [x] T8 — SSE hook: named events + `result`
- [x] T9 — Rewire tutor streams (mint → stream → verify → persist)

---

## 1. Architecture (the decision driving all of this)

Two services, **no Python backend** (it is being retired in a later phase):

1. **Next.js (`frontend/`)** owns EVERYTHING data/auth/orchestration: Clerk auth, the Supabase Postgres DB **via Prisma**, pgvector RAG, Judge0 code execution, and all persistence. The browser only ever talks to Next.
2. **`ai_server/`** (FastAPI) is stateless inference ONLY — no DB, no Clerk. Stays clean so it scales. Already built.
3. trigger.dev runs the durable course-generation pipeline (later phase).

**DB client = Prisma** (user directive "i use prisma"). Connects via `DATABASE_URL`. The DB SCHEMA stays in Postgres (source of truth = backend's alembic migrations); only the code that talks to it moves to Next.

**Two credentials secure the AI server:**
- static `AI_SERVICE_SECRET` — server-to-server (Next route handler → AI server `/run`, `/embed`, `/session`).
- short-lived **session-token JWT** — minted by AI server `/session`, handed to the browser, which streams directly from AI server `/reason` and `/speak`. Secret context (rubric, RAG chunks, problem prompt) is sealed inside the token's `server_context`, never exposed to the browser.

**Result persistence pattern (AI never writes the DB):** for `/reason` streams that produce a gradeable result (understanding-check, ask), the AI server emits a signed `result` event (HS256 JWT, `{result: payload}`, signed with `SESSION_SIGNING_SECRET`). The browser POSTs that blob back to a Next verify route, which calls `verifyResultEvent` and writes the row.

---

## 2. Execution rules

- **Per task:** dispatch ONE implementer subagent with the full task text + scene-setting context (do NOT make it read this file or the plan; paste what it needs). Then dispatch a spec-compliance reviewer, fix loop until ✅, then a code-quality reviewer, fix loop until ✅. Then mark complete and commit.
- **Commit per task** (memory: commit after each task group, not batched).
- **Model selection (Agent `model` param only accepts `sonnet`/`opus`/`haiku` in this harness — `minimax-m2.5` throws):**
  - Haiku → trivial 1-file mechanical (none here ended up trivial enough after the Prisma switch; T5 is borderline).
  - Sonnet → everything with schema/integration/multi-file concerns (T1, T2, T3, T4, T5, T6, T7, T8, T9). **Default to Sonnet for this phase.**
  - Opus → reviews of the complex integration task (T9) and the final whole-phase review.
- **Branch:** currently on `lyyeakkhai`. Do not start on main.
- **No new session needed to continue** — just re-create the TaskList from §0 checklist and resume at the first unchecked task.

---

## 3. The consumption surface (what the frontend already expects)

The frontend is a **mock prototype**. Feature actions already call these endpoints — the routes must match these shapes:

- `features/tutor/actions/run-code.ts` → `POST /api/blocks/:blockId/run` body `{code}` (route **does not exist yet** — T6 creates it). NOTE: it does NOT currently send `enrollmentId` or `language` — T6 must reconcile this (add them to the action, or derive). Confirm at impl time.
- `features/tutor/actions/get-socratic-hint.ts` → config pointing at `POST /api/blocks/:blockId/socratic-hint` (route does not exist — T9 creates it as a mint route).
- `features/tutor/actions/get-code-roast.ts` → `POST /api/blocks/:blockId/roast` (NOT in scope for Phase 4 — leave alone unless asked).
- `features/builder/actions/agent-edit.ts` → `POST /api/builder/:lessonId/agent-edit` body `{message}`, expects `{reply, blocks: TutorBlock[]}`. Currently calls the OLD backend via `apiFetch` (`shared/api/client.ts`, base `http://localhost:8000`). T7 replaces with a Next route.
- Existing routes that are **mocks to replace**: `app/api/blocks/[id]/understanding-check/route.ts` (mock heuristic stream), `app/api/enrollments/[id]/ask/route.ts` (mock stream). `app/api/blocks/[id]/concept-check/route.ts` returns `{success:true}` — leave (concept-check stays in Next, not an AI stream).
- `TutorBlock` type = `{ id: string; position: number; type: string; content: Record<string, unknown> }` (in `features/spaces/types.ts`).
- Path alias: `@/*` → `./*` (tsconfig). So imports are `@/shared/db/client`, `@/shared/api/ai-server`, etc.
- `jose` is already installed. `@supabase/supabase-js` is NOT installed (and not needed — using Prisma).

### The SSE hook (`features/tutor/hooks/use-sse-stream.ts`)
Current parser only understands **bare** `data:` lines: JSON `{text}` (appends `parsed.text`), or `[DONE]`. It has **no event-name handling**. The AI server emits `event: token|result|done|error`. T8 updates the hook to track the current `event:` line and route `token`→append, `result`→store raw blob in a new `result` state field, `done`→success, `error`→error. Keep backward-compat with bare `data:`/`[DONE]`.

---

## 4. Backend source → TypeScript port map (so you don't have to re-read backend)

All backend files live under `backend/app/`. Key logic, already extracted:

### Auth + user resolution (port → T3)
- `shared/deps.py::current_user` verifies Clerk JWT, then `get_or_create_user`.
- `features/auth/service.py::get_or_create_user`: `SELECT * FROM users WHERE clerk_user_id=:x`; if none, INSERT `{clerk_user_id, email, display_name, role='student'}`, return it. Email fallback in deps: `claims.get("email") or f"{clerk_user_id}@unknown.local"`. display_name from `claims.get("name")`.
- In Next, Clerk is read via `import { auth } from "@clerk/nextjs/server"` → `const { userId } = await auth()` (the Clerk `sub`). Resolve/insert the `users` row by `clerk_user_id == userId`. **Clerk does not give email/name from `auth()` alone** — use `currentUser()` from `@clerk/nextjs/server` for email/name, or fall back to `${userId}@unknown.local`. Confirm at impl.
- **Ownership check** (used by every tutor route): `SELECT user_id[, course_id] FROM enrollments WHERE id=:eid`; 404 if missing, 403 if `user_id != user.id`.

### Verdict logic for run_code (port → T5 + T6)
`features/tutor/service.py::evaluate_verdict(result, expected_output)`:
```
if result.status != "Accepted":
    return "compile_error" if "Compilation" in result.status else "runtime_error"
if expected_output is not None:
    return "passed" if result.stdout.strip() == expected_output.strip() else "failed"
return "needs_ai_eval"
```
`run_code` flow: ownership check → load code block (`SELECT id, content FROM blocks WHERE id=:bid AND type='code'`) → `expected_output = content.get("expected_output")` → attempt_number = count of existing `code_submissions` for (enrollment, block) + 1 → `execute_code(code, language)` → `evaluate_verdict` → if `needs_ai_eval`, AI eval (now `runAgent("code-eval", prompt)`) → INSERT `code_submissions` row → return `{submission_id, verdict, stdout, stderr, attempt_number}`.

AI-eval prompt (was Claude Haiku, now AI server `code-eval` agent):
```
Problem: {content.prompt}

Student code:
```
{code}
```

stdout: {stdout or "(none)"}

Is this correct?
```
Parse `JSON.parse(text).verdict === "passed" ? "passed" : "failed"`; any parse error → `"failed"`.

### Judge0 (port → T5)
`shared/ai/judge0_client.py`: `POST {JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, body `{source_code, language_id}`. If url contains `rapidapi`: headers `X-RapidAPI-Key: {key}`, `X-RapidAPI-Host: {host-from-url}`. Else `X-Auth-Token: {key}`. Response → `{stdout, stderr: data.stderr || data.compile_output, status: data.status.description}`.
`LANGUAGE_IDS = {python:71, javascript:63, typescript:74, cpp:54, java:62, c:50, go:60, ruby:72, rust:73}`. Unknown language → throw.

### Tutor streams (port → T9, server_context assembly)
All three: ownership check first, then assemble `server_context`, `mintSession(agent, server_context)`, return `{ai_url: aiServerPublicUrl + "/v1/reason", session_token, expires_in}` to the browser. The AI server builds the actual user-message from `server_context` + the browser's `client_context` and streams.

- **socratic** (`get_socratic_hint`): load last `code_submissions` row for (enrollment, block) ORDER BY attempt_number DESC LIMIT 1 (404 if none); load block `content`. `server_context = {problem_prompt: content.prompt, student_code: last.code, stdout: last.stdout, stderr: last.stderr, attempt_count: last.attempt_number}`. Agent `socratic`. **No result event** (hint is just streamed text).
- **understanding-check** (`evaluate_understanding`): load block `content` scoped to course (`type='understanding_check' AND lesson_id IN (SELECT id FROM lessons WHERE course_id=:cid)`); `rubric = content.evaluation_rubric`. attempt_number = count existing attempts + 1. `server_context = {rubric}`. Agent `understanding-check`. **Emits signed result** `{passed, level, feedback, missing_points}`; persist to `understanding_check_attempts`.
- **ask** (`ask_anything`): RAG — `embedTexts([question])` via AI server, then cosine search top-5 chunks scoped to course (T2). `server_context = {chunks: [c.content...], block_context}` where `block_context` = `content.prompt || content.text || null` of the optional current block (scoped to course). Agent `ask`. **Emits signed result** `{question, answer}`; persist to `questions`.
  - **CRITICAL GOTCHA:** backend persists `questions.source_chunks = [str(c.id) for c in chunks]` (the chunk UUIDs). The AI server only receives chunk *content*, not IDs — so it **cannot** put IDs in the signed result. The Next mint route must **keep the chunk IDs server-side** and the verify route must persist them. Options: (a) the browser echoes back enough to re-derive, or (b) stash `{chunkIds, question, enrollmentId, blockId}` keyed by a nonce when minting, look it up on verify. Decide at T9 impl — simplest is the browser passing `enrollmentId`/`blockId`/`question` to the verify route and the verify route re-running the same cosine search to get IDs, OR accept `source_chunks=null` for V1 and note it. Flag this to the user.

### Understanding-check result shape (built in AI server `/reason`, verified in Next)
`LEVEL_ORDER = {poor:0, fair:1, good:2, excellent:3}`, `PASS_THRESHOLD=2`. AI parses first line of model output as JSON `{level, feedback, missing_points}`, `passed = LEVEL_ORDER[level] >= 2`. Signed result payload = `{level, passed, feedback, missing_points}`. Next verify route writes `understanding_check_attempts {enrollment_id, block_id, response, level, feedback, passed, missing_points (null if empty), attempt_number}`.

### agent-edit (port → T7)
`features/builder/service.py`: load all blocks for the lesson; `blocksJson = JSON.stringify(blocks.map(b => ({id, position, type, content})), null, 2)`; `runAgent("agent-edit", `Current blocks:\n${blocksJson}\n\nInstruction: ${message}`)`; `JSON.parse(text)` → `{reply, blocks}`; persist updated block **content** keeping ids (don't add/remove blocks, don't change ids); return `{reply, blocks}` refreshed.

---

## 5. The exact DB schema (for T1 `schema.prisma`)

Hand-write because DB isn't running. Use `@@map` (snake_case table) and `@map` (snake_case columns). All enum columns are `native_enum=False` in backend → model them as **String** in Prisma. `embedding` is `Unsupported("vector(1536)")`.

| table | columns |
|---|---|
| **users** | id uuid pk, clerk_user_id string unique, email string unique, display_name string?, role string default "student", created_at, updated_at |
| **courses** | id uuid pk, creator_id uuid, (other course cols exist but Phase 4 only needs `id` + relations; include `code`, `status`, `title` only if trivially confirmable — otherwise minimal) |
| **lessons** | id uuid pk, course_id uuid, position int, title text, summary text?, objectives text[]?, status string default "generating", created_at, updated_at; @@unique([course_id, position]) |
| **blocks** | id uuid pk, lesson_id uuid, position int, type string, content Json, tts_audio_url text?, created_at, updated_at; @@unique([lesson_id, position]) |
| **course_chunks** | id uuid pk, course_id uuid, content text, embedding Unsupported("vector(1536)"), chunk_index int, page_number int?, created_at |
| **enrollments** | id uuid pk, user_id uuid, course_id uuid, current_lesson_id uuid?, current_block_id uuid?, started_at, completed_at?; @@unique([user_id, course_id]) |
| **code_submissions** | id uuid pk, enrollment_id uuid, block_id uuid, code text, language string, judge0_token string?, stdout text?, stderr text?, exit_code int?, verdict string?, socratic_hint text?, attempt_number int default 1, created_at |
| **concept_check_attempts** | id uuid pk, enrollment_id uuid, block_id uuid, selected_answer text, is_correct bool, explanation text, attempt_number int default 1, created_at |
| **understanding_check_attempts** | id uuid pk, enrollment_id uuid, block_id uuid, response text, level string, feedback text, passed bool, missing_points text[]?, attempt_number int default 1, created_at |
| **questions** | id uuid pk, enrollment_id uuid, block_id uuid?, question_text text, answer_text text?, source_chunks Json?, created_at, updated_at |

Relations are optional for V1 (raw filters by FK columns work) but add them if Prisma requires for clean queries.

---

## 6. The tasks (full spec)

### T1 — Prisma client + schema + env  [Sonnet]  (no deps)
1. `cd frontend && npm install prisma --save-dev && npm install @prisma/client`.
2. `frontend/prisma/schema.prisma`: `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`, `generator client { provider = "prisma-client-js" }`, plus all models from §5.
3. `frontend/shared/db/client.ts`: `import "server-only"` + singleton `PrismaClient` cached on `globalThis` (survive Next dev hot-reload).
4. `frontend/.env.example`: add `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai_tutor` — **plain `postgresql://`, NOT `postgresql+asyncpg://`** (the `+asyncpg` suffix is asyncpg-only; Prisma rejects it).
5. `npx prisma generate` — verify schema parses + client builds. Do **NOT** run `migrate`/`db push` (schema is owned by backend alembic; the tables already exist).
6. Commit `feat(frontend): prisma client + schema mirroring postgres`.

### T2 — pgvector cosine RAG search  [Sonnet]  (deps: T1)
- Prisma has no `vector`/`<=>` support → use `$queryRaw`.
- `frontend/shared/db/rag.ts`: `searchChunks(courseId: string, queryEmbedding: number[], topK = 5): Promise<{id: string; content: string}[]>`.
- SQL (mirror `retriever.py`, scoped to course): order by `embedding <=> $vector` ascending, `LIMIT topK`, `WHERE course_id = $courseId`. Pass the embedding as a pgvector literal: format `[0.1,0.2,...]` and cast `::vector` in the query. Use `prisma.$queryRaw` / `$queryRawUnsafe` carefully — **parameterize** courseId and the vector to avoid injection (the vector is numbers so it's safe to interpolate after validating it's `number[]`, but courseId must be a bound param).
- Commit `feat(frontend): pgvector cosine search via prisma $queryRaw`.

### T3 — Clerk auth + user resolution + ownership  [Sonnet]  (deps: T1)
- `frontend/shared/auth/current-user.ts`:
  - `requireUser()`: `const { userId } = await auth()`; 401-throw if none; resolve `users` row by `clerk_user_id`; lazily INSERT if absent (`role:"student"`, email/name from Clerk `currentUser()` or `${userId}@unknown.local` fallback). Return `{id, clerkUserId, email, role}`.
  - `requireEnrollmentOwnership(enrollmentId, userId)`: load enrollment; throw 404 if missing, 403 if `user_id !== userId`; return `{courseId}`.
- These throw typed errors a route can map to `Response` status. Decide a small error convention (e.g. a `HttpError` class) and use it consistently.
- Commit `feat(frontend): clerk auth + user resolution + ownership`.

### T4 — DB data-access query helpers  [Sonnet]  (deps: T1)
`frontend/shared/db/queries.ts`, porting the backend tutor/builder DB ops (exact table/column names from §5):
- `getCodeBlock(blockId)` → `{id, content}` where type='code'.
- `getBlockContentScoped(blockId, courseId)` → content if block's lesson is in the course.
- `getUnderstandingBlock(blockId, courseId)` → `content.evaluation_rubric` (scoped).
- `countCodeSubmissions(enrollmentId, blockId)`, `getLastCodeSubmission(enrollmentId, blockId)`.
- `insertCodeSubmission({enrollmentId, blockId, code, language, stdout, stderr, verdict, attemptNumber})`.
- `countUnderstandingAttempts(enrollmentId, blockId)`, `insertUnderstandingAttempt({enrollmentId, blockId, response, level, feedback, passed, missingPoints, attemptNumber})`.
- `insertQuestion({enrollmentId, blockId, questionText, answerText, sourceChunks})`.
- `getLessonBlocks(lessonId)` (ordered by position) and `updateBlockContent(blockId, content)` (for agent-edit; keep id, replace content only).
- Commit `feat(frontend): db data-access helpers`.

### T5 — Judge0 client + verdict logic  [Sonnet]  (no deps)
- `frontend/shared/lib/judge0.ts`: `executeCode(code, language)` → `{stdout, stderr, status}` (port §4 Judge0), `LANGUAGE_IDS` map, and `evaluateVerdict(result, expectedOutput)` (port §4 verdict).
- Env: add `JUDGE0_API_URL`, `JUDGE0_API_KEY` to `.env.example`.
- Commit `feat(frontend): judge0 client + verdict logic`.

### T6 — Rewire run_code route  [Sonnet]  (deps: T1,T3,T4,T5)
- Create `frontend/app/api/blocks/[id]/run/route.ts` (Next 16 App Router; params is a Promise — `const { id } = await params`).
- Flow per §4 run_code. Needs `enrollmentId` + `language` from the request — **reconcile** with `run-code.ts` (which currently only sends `{code}`): update the action to also send `enrollmentId` and `language`, and update its caller if needed. Confirm the caller component passes them.
- AI-eval hop → `runAgent("code-eval", prompt)`.
- **SECURITY:** route is Clerk-gated via `requireUser()`. Never expose `solution`/`tests`/`expected_output` to the browser.
- Verify: `npm run dev`, exercise a code block needing AI eval; confirm verdict + a `code_submissions` row.
- Commit `feat(frontend): run_code via /run + judge0`.

### T7 — Rewire agent-edit route  [Sonnet]  (deps: T1,T3,T4)
- Create `frontend/app/api/builder/[lessonId]/agent-edit/route.ts`. Flow per §4 agent-edit. Persist updated block contents (T4), keep ids. Update `features/builder/actions/agent-edit.ts` to call the Next route (drop the old `apiFetch` → `:8000` backend call).
- Verify in builder UI.
- Commit `feat(frontend): agent-edit via /run + persist`.

### T8 — SSE hook: named events + result  [Sonnet]  (no deps)
- Modify `frontend/features/tutor/hooks/use-sse-stream.ts`: track current `event:` line; `token`→append data; `result`→store raw signed blob in new `result: string | null` state (add to `UseSSEStreamReturn`); `done`→success; `error`→error. Keep bare `data:`/`[DONE]` back-compat. Reset clears `result`.
- Commit `feat(frontend): sse hook named events + result`.

### T9 — Rewire tutor streams (mint → stream → verify → persist)  [Sonnet; review with Opus]  (deps: T1,T2,T3,T4,T5,T6,T7,T8)
Most complex. Steps:
1. Mint routes (Clerk-auth → ownership → assemble server_context → `mintSession` → return `{ai_url, session_token, expires_in}`):
   - `app/api/blocks/[id]/socratic-hint/route.ts` (agent `socratic`, §4 socratic context).
   - `app/api/blocks/[id]/understanding-check/route.ts` — **replace mock** (agent `understanding-check`, `{rubric}`).
   - `app/api/enrollments/[id]/ask/route.ts` — **replace mock** (agent `ask`; `embedTexts` → `searchChunks` → `{chunks, block_context}`; keep chunk IDs server-side — see §4 GOTCHA).
2. `app/api/tutor/result/route.ts`: Clerk-auth → `verifyResultEvent(blob)` → persist understanding-check attempt (T4) or question (T4). Browser passes `{kind, blob, enrollmentId, blockId, response|question, attemptNumber?}` — enough to write the row.
3. Update tutor actions/components to two-step: POST mint route → `{ai_url, session_token}` → `useSSEStream.execute(ai_url, { method:"POST", headers:{authorization:`Bearer ${session_token}`}, body: JSON.stringify({ client_context }) })`; after stream, if `result` present, POST to `/api/tutor/result`.
4. Verify all three in browser; confirm no secret (rubric/chunks) in browser network payloads except inside the opaque session token.
5. Commit `feat(frontend): tutor streams via session tokens + signed results`.

---

## 7. After T9
- Whole-phase code review (Opus subagent).
- Then later phases (separate work): trigger.dev pipeline, delete Python backend, lift `ai_server/` to its own repo. These are in the original plan: `docs/superpowers/plans/2026-06-08-ai-service-extraction.md` (Phases 5–7).

## 8. Open questions to confirm with the user (don't block T1–T5 on these)
1. **questions.source_chunks** persistence (§4 GOTCHA) — re-run search on verify, or accept `null` for V1?
2. **run-code.ts** currently sends only `{code}` — OK to extend the action + caller to pass `enrollmentId` + `language`?
3. Real `DATABASE_URL` / Supabase connection string + `JUDGE0_API_*` + `SUPABASE`/Clerk envs for local `.env` (the DB wasn't running during planning).
