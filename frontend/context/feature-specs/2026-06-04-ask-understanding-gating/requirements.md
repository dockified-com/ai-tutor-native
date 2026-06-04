# Requirements: Phase 5 — Ask Anything + Understanding Check + Lesson Gating

## Context & Scope
This phase focuses on interactive AI components and progression gating within the Tutor UI, strictly following the Phase 5 definitions in the roadmap and the system design in `feature-system.md`.
It encompasses three main areas:
1. **Ask Anything (Chat)**: A footer input allowing students to ask questions with real-time SSE streaming responses from the AI.
2. **Understanding Check**: The final block of a lesson requiring a written response from the student, with streaming Socratic feedback until mastery is achieved.
3. **Lesson Gating**: Pure-function logic to determine if the user can proceed to the next block or lesson, dependent on component completion and verification states.

## Key Decisions
- **Ask Footer**: Operates via SSE (`POST /api/enrollments/{id}/ask`). It must not interrupt the lesson flow; the Continue button remains clickable. Chat history lives in the `TutorStore` and renders before the Continue button.
- **Understanding Check**: Also operates via SSE (`POST /api/blocks/{id}/understanding-check`). Users cannot skip or give up; they must achieve the passing threshold. Feedback is displayed iteratively.
- **Concept Check**: One-shot `POST` to `/api/blocks/{id}/concept-check`. Immediate feedback without retry. Gating permits continuing regardless of correctness.
- **Gating Logic**: Computed as a pure function in `use-block-gating.ts` using `activeBlock`, `terminalOutputs`, `conceptAnswers`, and `understandingPassed`.

## Non-Goals
- E2E testing using Playwright (deferred to Phase 8).
- Implementation of TTS audio or Auto-Continue features (deferred to Phase 6).
- Building mock data environments.
