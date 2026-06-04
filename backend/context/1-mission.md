# 1 — Mission
## AI Native Programming Tutor — Backend V1

**Source:** `docs/product/01_prd.md` · `docs/superpowers/specs/2026-05-30-ai-native-tutor-design.md`

---

## Problem Statement

Programming education is broken in two distinct ways:

1. **For instructors:** Creating high-quality, interactive programming courses takes weeks of structured work — writing code exercises, writing narration, generating diagrams, and building comprehension checks manually. Most instructors settle for slide decks or raw video. The result: passive consumption with no verification that the student understood anything.

2. **For students:** Existing programming courses (Udemy, Coursera) are passive video + quizzes. There is no tutor to ask questions. There is no enforced understanding gate before moving on. Students watch a video and immediately forget what they learned because they never *applied* it under guidance.

No competitor in the market delivers all four simultaneously while keeping per-student AI cost under $0.15.

---

## Vision

> Dockified is the platform where any technical expert can turn their knowledge into a personalized, AI-powered course that teaches every student like a 1-on-1 tutor.

---

## V1 Goal — What the Backend Must Deliver

Ship the **AI Native Programming Tutor** backend — the server-side engine behind Dockified's core proposition:

- A **creator** (the founder) uploads a programming topic PDF → the backend generates a complete interactive course (extract → embed → outline → blocks → TTS) in under 10 minutes
- A **student** enters a 6-character course code → the backend enrolls them, serves blocks, evaluates code, streams Socratic hints, answers RAG-backed questions, and evaluates understanding
- The backend validates the core hypothesis: *AI-generated interactive lessons produce better learning outcomes than passive video*

---

## V1 Success Criteria (Backend's Responsibility)

| Criteria | Target |
|---|---|
| Time from PDF upload to `status = 'ready'` | < 10 minutes (30-page PDF, 5 lessons) |
| Generation success rate | ≥ 95% (non-failed pipelines) |
| Ask Anything first token latency | < 2 seconds |
| Code run verdict latency (Judge0) | < 3 seconds |
| Socratic hint first token | < 2 seconds |
| Understanding check verdict | < 3 seconds |
| Per-student AI cost | ≤ $0.15 per course |
| API uptime | ≥ 99% |

---

## User Roles

**Creator** (single account in V1 — the founder):
- Signs in → dashboard → creates course → previews → publishes → shares 6-char code
- Auth: **Clerk** (email + password and/or social login)
- Authorization: `users.role = 'creator'`, set via SQL on the founder's row

**Student** (everyone else):
- Signs up → enters course code (or clicks `/join/{code}`) → walks through lessons
- Auth: **Clerk** (email + password and/or social login)
- Default `users.role = 'student'`

**User-row provisioning:** When a user signs in for the first time, FastAPI middleware checks for a `users` row by `clerk_user_id` and lazily creates one (synced from Clerk's user object) if missing. A Clerk webhook (`user.created` / `user.updated`) keeps email + display_name in sync going forward.

---

## Pedagogical Principles (Product-Level Constraints — Not Suggestions)

Violating these is a **bug**, not a feature request.

### Principle 1 — Gate on demonstrated understanding
Every lesson ends with an `understanding_check`. "Next Lesson" is locked until the student meets the rubric threshold. No skip. No workaround. Progress is saved — the student returns when ready.

### Principle 2 — Never reveal exercise answers
Socratic hints for `code` blocks must:
- Explain *how to think about the problem*, not the solution
- Escalate guidance proportional to attempt count (conceptual → localized → trace → analogous example)
- **Never show correct code or complete the student's code**

This is asserted in the system prompt of `/socratic-hint` and enforced by automated tests that check hint content.

### Principle 3 — AI is a tutor, not a bypass
The "Ask Anything" feature answers course-material questions. It does NOT:
- Reveal code exercise answers
- Provide solutions that bypass `understanding_check` requirements
- Answer questions outside the course material

### Principle 4 — Static-first, real-time only where unpredictable
The lesson script is generated once and is immutable from the student's perspective. AI re-engages live only in the four cases the script cannot predict:
1. Free-form student questions (footer)
2. Failed code submissions
3. Wrong concept-check answers
4. Understanding-check evaluations

---

## Scope Boundaries

### In Backend V1 Scope

| Responsibility | Description |
|---|---|
| Clerk JWT validation | Every protected route verifies the Bearer token |
| Lazy user provisioning | `users` row created on first sign-in |
| Clerk webhook handler | `user.created` / `user.updated` sync |
| Course generation pipeline | PDF extract → embed → outline → blocks → TTS (async) |
| Course CRUD | List, detail, status polling |
| Publish + 6-char code | Code generation with collision retry |
| Enrollment by code | Idempotent enroll; `/join/{code}` redirect logic |
| Block fetching | Serve blocks + progress for tutor page load |
| Code execution | Judge0 submission + verdict evaluation |
| Socratic hints | SSE-streamed, Socratic-only, never reveals answer |
| Ask Anything | RAG retrieval + Claude Sonnet SSE stream |
| Concept check | Pre-generated explanation lookup (no live LLM) |
| Understanding check | LLM evaluation against rubric; SSE-streamed feedback |
| Progress tracking | `block_progress` writes, bookmark updates, lesson completion |
| Preview mode | All AI interactions work; no progress rows written |
| Lesson regeneration | Delete lesson's blocks + audio + progress → re-run pipeline |

### Explicitly Out of Backend V1 Scope

| Feature | Target |
|---|---|
| Engine B — Code Auto-Grader (assignments) | V2 |
| Engine C — Voice Mock Interview | V3 |
| Multi-creator accounts | V2 |
| LangGraph / LangChain / LlamaIndex | V2/V3 |
| Supabase Row Level Security | V2 |
| Redis / Celery task queue | V2 |
| Scanned PDF / OCR support | V2 |
| Analytics dashboards | V2 |
| Mobile / i18n | V2 |
