# Implementation Plan: Phase 5 — Ask Anything + Understanding Check + Lesson Gating

## Group A — Parallel: Ask Footer
1. **Component**: Create `features/tutor/components/ask-footer.tsx`. Implement styling (`bg-slate-50`, focus rings) and input handling.
2. **Action**: Implement SSE Server Action `features/tutor/actions/ask-question.ts` (`POST /api/enrollments/{id}/ask`).
3. **Store**: Add `chatHistory` and `askInput` to `TutorStore`.
4. **Integration**: Wire chat bubbles into `lesson-feed.tsx` ensuring proper placement (after blocks, before Continue) and formatting (user vs AI bubbles).

## Group B — Parallel: Understanding & Concept Checks
1. **Component**: Create `features/tutor/components/blocks/understanding-check-block.tsx` with textarea, streaming feedback UI, and retry loop.
2. **Action**: Implement SSE Server Action `features/tutor/actions/submit-understanding-check.ts`.
3. **Action**: Implement one-shot POST Server Action `features/tutor/actions/submit-concept-check.ts`.
4. **Store**: Add `understandingResponse`, `understandingFeedback`, `understandingPassed`, and `understandingAttempts` to `TutorStore`. Add `conceptAnswers`.

## Group C — Sequential: Gating & Store (needs Group A + B)
1. **Hook**: Create `features/tutor/hooks/use-block-gating.ts` to derive Continue enabled state per block type.
2. **Integration**: Enforce lesson gating in the UI: disable Continue / Next Lesson buttons until the `use-block-gating` threshold is met. Ensure correct button labeling.
