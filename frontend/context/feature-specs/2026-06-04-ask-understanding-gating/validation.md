# Validation: Phase 5 — Ask Anything + Understanding Check + Lesson Gating

## Success Criteria

Validation for this phase involves manual testing to ensure correct behavior of SSE streams, pure-function gating logic, and state transitions.

### 1. Ask Anything
- **Streaming**: Verify that entering a question streams the response in real-time without locking the UI.
- **State**: Chat history should correctly reflect the conversation in the UI and persist in the `TutorStore`.
- **Flow**: Submitting a question must not disable the "Continue" button or interrupt standard lesson progression.

### 2. Understanding Check
- **Streaming & Feedback**: Submitting an answer should disable the textarea, stream feedback, and either display success (CheckCircle) or failure (Socratic guidance).
- **Retry Logic**: On failure, the textarea must re-enable, allowing the user to revise their answer.
- **Persistence**: Cannot skip or bypass the check.

### 3. Concept Check
- **One-Shot Validation**: Clicking an option registers the answer, shows correct/incorrect formatting, displays the explanation, and enables the Continue button immediately. Cannot retry.

### 4. Gating Logic
- **Pure Function Verification**: Manually verify that the Continue button acts appropriately:
  - Enabled instantly for `markdown` and `mermaid`.
  - Enabled after an option is selected for `concept_check`.
  - Enabled after passing `code` blocks.
  - Changes to "Next Lesson" and enables only after a passed state on `understanding_check`.
