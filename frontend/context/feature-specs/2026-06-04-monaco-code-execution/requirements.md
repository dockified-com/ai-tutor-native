# Requirements: Monaco + Code Execution + Socratic Hints

## Scope
- Integrate `@monaco-editor/react` as the primary workspace editor for `code` blocks.
- Execution pipeline using server actions (`/api/blocks/{id}/run`) which abstracts backend Judge0 API execution.
- Implement server-sent events (SSE) for streaming text to support Socratic Hints and "Roast My Code" functionality.
- Integrate the Struggle Heatmap UI for community-stuck signals.

## Decisions & Context
- All feature interactions and states strictly adhere to `feature-system.md`.
- Socratic hints trigger automatically upon failed code submissions (escalating based on attempt count).
- Code Roasting is a user-triggered "superpower" available only after successfully passing a code block.
- Editor workspace is decoupled from the main feed but derived purely from `activeBlockId`.
- Gating logic requires a 'passed' verdict for code exercises before allowing the student to continue.
