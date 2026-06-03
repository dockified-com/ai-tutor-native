# API Contracts
# AI Native Programming Tutor — V1

**Base URL:** `https://api.tutor.dockified.com`  
**Auth:** All protected endpoints require `Authorization: Bearer <Clerk JWT>` header  
**Content-Type:** `application/json` (except file upload: `multipart/form-data`)  
**Streaming:** SSE endpoints respond with `Content-Type: text/event-stream`  
**Last Updated:** 2026-05-30  

---

## Table of Contents

1. [Request / Response Conventions](#1-request--response-conventions)
2. [Auth Endpoints](#2-auth-endpoints)
3. [Authoring Endpoints](#3-authoring-endpoints)
4. [Course Endpoints](#4-course-endpoints)
5. [Enrollment Endpoints](#5-enrollment-endpoints)
6. [Tutor Endpoints](#6-tutor-endpoints)
7. [Progress Endpoints](#7-progress-endpoints)
8. [SSE Event Reference](#8-sse-event-reference)
9. [Error Response Reference](#9-error-response-reference)
10. [Type Reference](#10-type-reference)

---

## 1. Request / Response Conventions

### Authentication

Every request to a protected endpoint must include:

```
Authorization: Bearer eyJhbGc...  (Clerk JWT)
```

The backend verifies the JWT signature with Clerk's public key, extracts `clerk_user_id`, resolves the app-level `users` row, and passes the `User` object to the route handler.

### Response Envelope

All successful responses return the resource directly (no wrapper). Errors use the standard error shape:

```jsonc
// Success
{ "id": "uuid", "status": "ready", ... }

// Error
{ "detail": "Human-readable error message" }
```

### Pagination

Not implemented in V1. Endpoints that list resources return all items. Pagination added in V2 when needed.

### Preview Mode

When the creator is in preview mode, all write operations (block progress, code submissions, concept check attempts, understanding check attempts) are suppressed. The frontend passes `?preview=true` query param; the backend checks it and skips writes.

---

## 2. Auth Endpoints

### `GET /api/me` — Get current user

Returns the authenticated user's profile and app role.

**Auth:** Required

**Response `200`:**

```jsonc
{
  "id": "uuid",
  "clerk_user_id": "user_2jK...",
  "email": "user@example.com",
  "display_name": "John Doe",
  "role": "student",             // "creator" | "student"
  "created_at": "2026-05-30T10:00:00Z"
}
```

---

### `POST /api/auth/clerk-webhook` — Clerk webhook receiver

Syncs user data from Clerk on `user.created` and `user.updated` events.

**Auth:** Clerk webhook signature verification (SVIX)  

**Request body:**

```jsonc
{
  "type": "user.created",        // "user.created" | "user.updated"
  "data": {
    "id": "user_2jK...",
    "email_addresses": [{ "email_address": "user@example.com" }],
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Response `200`:** `{ "ok": true }`

---

## 3. Authoring Endpoints

### `POST /api/courses/generate` — Create and start generation

Uploads PDF metadata, creates course record, triggers async generation pipeline.

**Auth:** Required  
**Role:** Creator only

**Request:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `pdf` | File | ✓ | ≤10 MB, `.pdf` only |
| `title` | string | ✓ | Course title |
| `description` | string | — | Optional |
| `default_language` | string | — | Default `"python"`. Options: `python\|javascript\|typescript\|java\|cpp\|go\|rust\|c\|bash` |
| `custom_prompt` | string | — | Creator's generation instructions |

**Response `202`:**

```jsonc
{
  "course_id": "uuid",
  "status": "generating",
  "generation_phase": "extracting_pdf"
}
```

**Errors:**

| Code | Condition |
|---|---|
| 400 | File not a PDF, exceeds 10 MB, or no extractable text |
| 403 | User does not have creator role |

---

### `GET /api/courses/{course_id}/status` — Poll generation status

Used by the frontend to poll every 3 seconds during generation.

**Auth:** Required  
**Role:** Creator (owner)

**Response `200`:**

```jsonc
{
  "course_id": "uuid",
  "status": "generating",         // "draft" | "generating" | "ready" | "published" | "failed"
  "generation_phase": "generating_lesson_2",  // null if not generating
  "generation_error": null,       // error message if status = "failed"
  "total_lessons": 5,
  "lessons_ready": 2              // how many lessons are done (for progress bar)
}
```

---

### `POST /api/courses/{course_id}/publish` — Publish a course

Generates the 6-character course code and sets `status = 'published'`.

**Auth:** Required  
**Role:** Creator (owner)

**Request body:** `{}` (empty)

**Response `200`:**

```jsonc
{
  "course_id": "uuid",
  "code": "BCKND1",
  "join_url": "https://tutor.dockified.com/join/BCKND1",
  "status": "published"
}
```

**Errors:**

| Code | Condition |
|---|---|
| 400 | Course `status` is not `ready` |
| 409 | Could not generate unique code after 5 attempts (extremely rare) |

---

### `POST /api/lessons/{lesson_id}/regenerate` — Regenerate a lesson

Deletes the lesson's blocks + audio + student progress (cascade), then re-runs per-lesson generation.

**Auth:** Required  
**Role:** Creator (course owner)

**Request body:**

```jsonc
{
  "refined_prompt": "Make the examples more practical, using real-world API scenarios"
}
```

**Response `202`:**

```jsonc
{
  "lesson_id": "uuid",
  "status": "generating"
}
```

**Errors:**

| Code | Condition |
|---|---|
| 404 | Lesson not found |
| 403 | Not the course creator |

---

## 4. Course Endpoints

### `GET /api/courses` — List courses

**Creator:** Returns own courses  
**Student:** Returns enrolled courses  

**Auth:** Required

**Response `200`:**

```jsonc
[
  {
    "id": "uuid",
    "title": "Python Decorators Deep Dive",
    "description": "Master Python decorators...",
    "status": "published",
    "code": "BCKND1",
    "total_lessons": 5,
    "total_blocks": 47,
    // Creator-only fields:
    "creator_id": "uuid",
    // Student-only fields:
    "enrollment": {
      "id": "uuid",
      "completion_percentage": 42,
      "current_lesson_title": "Lesson 3: Decorator Factories"
    }
  }
]
```

---

### `GET /api/courses/{course_id}` — Get course detail

**Auth:** Required

**Response `200`:**

```jsonc
{
  "id": "uuid",
  "title": "Python Decorators Deep Dive",
  "description": "Master Python decorators...",
  "default_language": "python",
  "status": "published",
  "code": "BCKND1",
  "total_lessons": 5,
  "total_blocks": 47,
  "lessons": [
    {
      "id": "uuid",
      "position": 1,
      "title": "Lesson 1: What Is a Decorator?",
      "summary": "...",
      "status": "ready",
      "total_blocks": 9,
      // Student-only (if enrolled):
      "completed_blocks": 7,
      "completion_percentage": 78
    }
  ],
  "created_at": "2026-05-30T10:00:00Z"
}
```

---

## 5. Enrollment Endpoints

### `POST /api/enrollments` — Enroll by course code

**Auth:** Required

**Request body:**

```jsonc
{ "code": "BCKND1" }
```

**Response `201` (new enrollment):**

```jsonc
{
  "id": "uuid",
  "course_id": "uuid",
  "user_id": "uuid",
  "started_at": "2026-05-30T10:00:00Z"
}
```

**Response `200` (already enrolled — idempotent):**

```jsonc
{
  "id": "uuid",
  "course_id": "uuid",
  "user_id": "uuid",
  "already_enrolled": true,
  "redirect_to": "/courses/uuid/lesson/uuid"
}
```

**Errors:**

| Code | Condition |
|---|---|
| 404 | No published course with this code |

---

### `GET /api/enrollments/{enrollment_id}` — Get enrollment + progress

**Auth:** Required (own enrollment only)

**Response `200`:**

```jsonc
{
  "id": "uuid",
  "course_id": "uuid",
  "user_id": "uuid",
  "current_lesson_id": "uuid",
  "current_block_id": "uuid",
  "started_at": "2026-05-30T10:00:00Z",
  "completed_at": null
}
```

---

## 6. Tutor Endpoints

### `GET /api/lessons/{lesson_id}/blocks` — Fetch lesson blocks + progress

Called on tutor page load (via SSR Server Component).

**Auth:** Required

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `enrollment_id` | string | Required for students; omit in preview mode |
| `preview` | boolean | If `true`, omit progress data |

**Response `200`:**

```jsonc
{
  "lesson": {
    "id": "uuid",
    "position": 2,
    "title": "Lesson 2: Decorator Factories",
    "summary": "..."
  },
  "blocks": [
    {
      "id": "uuid",
      "position": 1,
      "type": "markdown",
      "content": { "text": "A decorator factory is..." },
      "tts_audio_url": "https://...supabase.co/storage/v1/object/public/audio/uuid.mp3"
    },
    {
      "id": "uuid",
      "position": 2,
      "type": "code",
      "content": {
        "instruction": "Write a decorator that logs function calls",
        "language": "python",
        "starter_code": "def log_calls(func):\n    pass",
        "expected_match": "exact",
        "expected_output": "Calling greet\nHello!"
        // NOTE: hint_seed_prompt is NOT returned to client (backend-only)
      },
      "tts_audio_url": "https://...supabase.co/storage/v1/object/public/audio/uuid.mp3"
    }
    // ... more blocks
  ],
  "progress": {
    "revealed_block_ids": ["uuid1", "uuid2"],
    "completed_block_ids": ["uuid1"],
    "current_block_id": "uuid2"
  }
}
```

> **Security note:** `hint_seed_prompt` from code block content is stripped before sending to the client. It's used server-side only to build Socratic prompts.

---

### `POST /api/blocks/{block_id}/run` — Execute code

**Auth:** Required

**Request body:**

```jsonc
{
  "code": "def log_calls(func):\n    def wrapper(*args, **kwargs):\n        print(f'Calling {func.__name__}')\n        return func(*args, **kwargs)\n    return wrapper",
  "enrollment_id": "uuid"    // omit in preview mode
}
```

**Response `200`:**

```jsonc
{
  "verdict": "passed",       // "passed" | "failed" | "runtime_error" | "compile_error" | "error"
  "stdout": "Calling greet\nHello!",
  "stderr": "",
  "exit_code": 0,
  "attempt_number": 1        // null in preview mode
}
```

**Verdicts:**

| Verdict | Condition |
|---|---|
| `passed` | Output matches `expected_output` per `expected_match` strategy |
| `failed` | Code ran but output doesn't match |
| `runtime_error` | Code ran but threw an exception (exit code ≠ 0) |
| `compile_error` | Code failed to compile (for compiled languages) |
| `error` | Judge0 API error; does NOT count as a failed attempt |

---

### `POST /api/blocks/{block_id}/socratic-hint` — Get Socratic hint (SSE)

Called by the frontend immediately after a `failed` or `runtime_error` verdict.

**Auth:** Required

**Request body:**

```jsonc
{
  "enrollment_id": "uuid",
  "submission_id": "uuid"    // the failed submission to hint on
}
```

**Response:** SSE stream (see §8)

**SSE events:**

```
event: token
data: "Think about what "

event: token
data: "the function needs to return..."

event: done
data: ""
```

---

### `POST /api/blocks/{block_id}/concept-check` — Submit concept check answer

**Auth:** Required

**Request body:**

```jsonc
{
  "selected_answer": "No",
  "enrollment_id": "uuid"    // omit in preview mode
}
```

**Response `200`:**

```jsonc
{
  "is_correct": true,
  "explanation": "Correct — there is no lock protecting the counter mutation, so two threads can race.",
  "attempt_number": 1        // null in preview mode
}
```

> **Note:** No live LLM call. Explanation is the pre-generated value from `block.content.explanation_correct` or `explanation_wrong`. Cost: $0.

---

### `POST /api/blocks/{block_id}/understanding-check` — Submit understanding check (SSE)

**Auth:** Required

**Request body:**

```jsonc
{
  "response": "A decorator is a function that wraps another function to add behavior without modifying it directly. For example, you'd use one to add logging or authentication to a function.",
  "enrollment_id": "uuid"    // omit in preview mode
}
```

**Response:** SSE stream (see §8)

**SSE events:**

```
event: token
data: "Great explanation! You correctly identified that decorators wrap "

event: token  
data: "functions without modifying them. The logging use case is perfect."

event: result
data: {"passed": true, "level": "good", "attempt_number": 1}

event: done
data: ""
```

---

### `POST /api/enrollments/{enrollment_id}/ask` — Ask Anything (SSE)

**Auth:** Required (own enrollment)

**Request body:**

```jsonc
{
  "question": "What's the difference between `@functools.wraps` and not using it?",
  "block_id": "uuid"          // active block when question was asked (for context)
}
```

**Response:** SSE stream (see §8)

**SSE events:**

```
event: token
data: "Great question! `@functools.wraps` preserves the original function's "

event: token
data: "`__name__`, `__doc__`, and other metadata. Without it..."

event: done
data: ""
```

---

## 7. Progress Endpoints

### `POST /api/progress/blocks/{block_id}/complete` — Mark block complete

Called by the frontend on Continue click.

**Auth:** Required

**Request body:**

```jsonc
{ "enrollment_id": "uuid" }
```

**Response `200`:**

```jsonc
{
  "block_id": "uuid",
  "enrollment_id": "uuid",
  "status": "completed",
  "completed_at": "2026-05-30T10:05:32Z"
}
```

---

### `PATCH /api/enrollments/{enrollment_id}/bookmark` — Update bookmark

**Auth:** Required (own enrollment)

**Request body:**

```jsonc
{
  "current_lesson_id": "uuid",
  "current_block_id": "uuid"
}
```

**Response `200`:**

```jsonc
{
  "enrollment_id": "uuid",
  "current_lesson_id": "uuid",
  "current_block_id": "uuid"
}
```

---

## 8. SSE Event Reference

### Generic SSE Frame Format

```
event: <event_name>
data: <string_data>

```

(Two newlines separate frames per SSE spec.)

### Event Types Used

| Event | Data | Used In |
|---|---|---|
| `token` | Plaintext string chunk | All streaming endpoints |
| `result` | JSON string | `understanding-check` |
| `error` | Error message string | All streaming endpoints (on AI failure) |
| `done` | `""` (empty) | All streaming endpoints |

### SSE Error Handling

```
event: error
data: "AI temporarily unavailable. Please retry."

event: done
data: ""
```

The `done` event always fires last, even after an error, so the client can close the `EventSource` reliably.

### Client-side SSE Pattern

```ts
const es = new EventSource(`/api/blocks/${blockId}/socratic-hint`, {
  withCredentials: true,
});

es.addEventListener('token', (e) => appendToHint(e.data));
es.addEventListener('result', (e) => handleResult(JSON.parse(e.data)));
es.addEventListener('error', (e) => showRetryUI());
es.addEventListener('done', () => es.close());
```

> **Note:** The Clerk JWT cannot be passed as a header to `EventSource` (browser limitation). Use a short-lived signed token or cookie auth for SSE endpoints in V2. In V1, SSE endpoints accept the JWT as a query param: `?token=<jwt>`.

---

## 9. Error Response Reference

### Error Shape

```jsonc
{ "detail": "Human-readable error message" }
```

### HTTP Status Codes

| Code | Meaning | When |
|---|---|---|
| 400 | Bad Request | Invalid input, validation failure, business rule violation |
| 401 | Unauthorized | Missing or invalid Clerk JWT |
| 403 | Forbidden | Valid JWT but insufficient permissions (wrong role, wrong user) |
| 404 | Not Found | Resource doesn't exist or isn't accessible to this user |
| 409 | Conflict | Idempotency violation (e.g., course code collision) |
| 422 | Unprocessable Entity | Pydantic validation error on request body |
| 500 | Internal Server Error | Unhandled exception (reported to Sentry) |
| 503 | Service Unavailable | AI provider or Judge0 unavailable |

### Validation Errors (422)

FastAPI/Pydantic returns detailed validation errors:

```jsonc
{
  "detail": [
    {
      "loc": ["body", "title"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 10. Type Reference

### `Block`

```ts
type BlockType = 'markdown' | 'code' | 'mermaid' | 'concept_check' | 'understanding_check';

interface Block {
  id: string;
  lesson_id: string;
  position: number;
  type: BlockType;
  content: MarkdownContent | CodeContent | MermaidContent | ConceptCheckContent | UnderstandingCheckContent;
  tts_audio_url: string | null;
}

interface MarkdownContent {
  text: string;
}

interface CodeContent {
  instruction: string;
  language: string;
  starter_code: string;
  expected_match: 'exact' | 'regex' | 'ai_eval';
  expected_output: string;
  // hint_seed_prompt is stripped server-side; not returned to client
}

interface MermaidContent {
  instruction: string;
  diagram: string;
}

interface ConceptCheckContent {
  question: string;
  options: string[];
  correct: string;
  explanation_correct: string;
  explanation_wrong: string;
}

interface UnderstandingCheckContent {
  prompt: string;
  // evaluation_rubric is stripped server-side; not returned to client
  threshold: 'poor' | 'fair' | 'good' | 'excellent';
}
```

> **Security:** `hint_seed_prompt` (code blocks) and `evaluation_rubric` (understanding check blocks) are stripped server-side before returning to the client. Students never see these.

### `Course`

```ts
type CourseStatus = 'draft' | 'generating' | 'ready' | 'published' | 'failed';

interface Course {
  id: string;
  creator_id: string;
  code: string | null;           // null until published
  title: string;
  description: string | null;
  default_language: string;
  status: CourseStatus;
  total_lessons: number;
  total_blocks: number;
  created_at: string;
  updated_at: string;
}
```

### `Enrollment`

```ts
interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  current_lesson_id: string | null;
  current_block_id: string | null;
  started_at: string;
  completed_at: string | null;
}
```

### `RunCodeResponse`

```ts
type CodeVerdict = 'passed' | 'failed' | 'runtime_error' | 'compile_error' | 'error';

interface RunCodeResponse {
  verdict: CodeVerdict;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  attempt_number: number | null;  // null in preview mode
}
```

### `UnderstandingResult` (SSE `result` event)

```ts
type UnderstandingLevel = 'poor' | 'fair' | 'good' | 'excellent';

interface UnderstandingResult {
  passed: boolean;
  level: UnderstandingLevel;
  attempt_number: number | null;
}
```
