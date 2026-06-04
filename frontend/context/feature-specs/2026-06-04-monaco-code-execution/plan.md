# Phase 4: Monaco + Code Execution + Socratic Hints Implementation Plan

## Group A — Sequential: Install & Shared Hook
- [ ] `npm install @monaco-editor/react`
- [ ] `features/tutor/hooks/use-sse-stream.ts` — generic SSE hook (used by hints, roast, ask)

## Group B — Parallel: Code Block in Feed (needs Group A)
- [ ] `features/tutor/components/blocks/code-block.tsx` — instruction + "Code Exercise" label in feed; clicking activates Monaco workspace

## Group C — Parallel: Monaco Workspace (needs Group A)
- [ ] `features/tutor/components/workspace/monaco-workspace.tsx`:
  - Header: Code2 icon, block name, Struggle Heatmap badge (`🔥 N friends got stuck here`)
  - Editor zone: line gutter (`w-12 font-mono text-xs text-slate-300`) + Monaco editor
  - Terminal zone (`h-[40%]`): TerminalSquare header, verdict display
  - Roast panel: `bg-orange-50 border-orange-200` panel with streaming text (shown after pass)

## Group D — Parallel: Server Actions (needs Group A SSE hook)
- [ ] `features/tutor/actions/run-code.ts` — `POST /api/blocks/{id}/run`
- [ ] `features/tutor/actions/get-socratic-hint.ts` — SSE: `POST /api/blocks/{id}/socratic-hint`
- [ ] `features/tutor/actions/get-code-roast.ts` — SSE: `POST /api/blocks/{id}/roast`

## Group E — Sequential: Store Updates & Gating (needs Group B + C + D)
- [ ] TutorStore additions: `codeValues`, `terminalOutputs`, `codeAttempts`, `hints`, `roasts`
- [ ] Continue gating: code blocks only enable Continue when `verdict = 'passed'`
