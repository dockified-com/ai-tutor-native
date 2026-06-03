# Feature System & Interaction Design

How every interactive feature in the tutor works — the exact state machines, UI sequences, and data flows. This is the canonical reference for implementing `features/tutor/`. Build exactly this, nothing more.

---

## 1. Block Reveal System

### State

```ts
// TutorStore (excerpt)
revealedIndex: number        // index of last revealed block in BLOCKS[]
activeBlockId: string        // drives left pane highlight + right pane
```

### Sequence

```
Initial load:
  → revealedIndex = bookmark position (from block_progress)
  → activeBlockId = BLOCKS[revealedIndex].id
  → All blocks up to revealedIndex rendered in feed

Click "Continue":
  → revealedIndex++
  → New block appears with .fade-in-up animation (0.4s ease-out)
  → activeBlockId = BLOCKS[revealedIndex].id
  → TTS audio auto-plays for new block
  → block_progress row written (POST /api/progress/blocks/{id}/complete)
  → bookmark updated (PATCH /api/enrollments/{id}/bookmark)
  → Right pane updates ONLY if new block is `code` or `mermaid`
```

### Click-to-jump

```
User clicks a past block (index < revealedIndex):
  → activeBlockId = clicked block's id
  → Right pane re-derives from activeBlockId
  → All blocks AFTER activeBlockId: opacity-60
  → "Return to current" pill appears (top-right of feed)

User clicks "Return to current":
  → activeBlockId = BLOCKS[revealedIndex].id
  → opacity-60 removed from all
  → Pill disappears
```

---

## 2. Continue Button Gating

Each block type has different Continue gating logic. `use-block-gating.ts` derives this as a pure function.

```ts
function isContinueEnabled(
  activeBlock: Block,
  terminalOutputs: Record<string, TerminalOutput>,
  conceptAnswers: Record<string, string>,
  understandingPassed: Record<string, boolean>
): boolean {
  switch (activeBlock.type) {
    case 'markdown':       return true;
    case 'mermaid':        return true;
    case 'concept_check':  return !!conceptAnswers[activeBlock.id];
    case 'code':           return terminalOutputs[activeBlock.id]?.verdict === 'passed';
    case 'understanding_check': return understandingPassed[activeBlock.id] === true;
  }
}
```

**Continue label:** `"Continue"` for all blocks except the final `understanding_check`, which shows `"Next Lesson"` (or `"Course Complete"` on the final lesson's final block).

---

## 3. Code Block Flow

### State (per block)

```ts
codeValues:     Record<blockId, string>         // editor content
terminalOutputs: Record<blockId, TerminalOutput>
codeAttempts:   Record<blockId, number>
hints:          Record<blockId, string>         // streaming hint text
roasts:         Record<blockId, RoastState>
```

### Full sequence

```
Block reveals:
  → Monaco editor pre-filled with block.content.starter_code
  → Terminal: "Run your code to see the output here..."
  → Struggle Heatmap badge fetched: GET /api/blocks/{id}/struggle-stats

User edits code in Monaco editor

User clicks "Run" (or Ctrl+Enter):
  → terminalOutputs[id] = { status: 'running', text: 'Running...' }
  → POST /api/blocks/{id}/run { code: codeValues[id] }
  
  → On PASS (verdict = 'passed'):
      terminalOutputs[id] = { verdict: 'passed', text: '...' }
      Continue button enables
      🎭 "Roast My Code" button appears in terminal
      hints[id] = null (clear any previous hint)
  
  → On FAIL (verdict = 'failed' | 'runtime_error' | 'compile_error'):
      terminalOutputs[id] = { verdict: 'failed', text: '...' }
      codeAttempts[id]++
      → immediately call: POST /api/blocks/{id}/socratic-hint (SSE)
      → hints[id] streams character-by-character in feed below block
      
  → On ERROR (verdict = 'error' — Judge0 unavailable):
      Show retry message; do NOT increment codeAttempts
```

### Socratic hint escalation (backend logic, mirrored in UI)

| Attempt # | Hint type |
|---|---|
| 1–2 | High-level conceptual guidance |
| 3–4 | Localized to specific line/concept |
| 5+ | Analogous simpler example (NEVER the answer) |

---

## 4. 🎭 Roast My Code (SUPERPOWER)

### Trigger

Only available after `verdict = 'passed'`. Button in terminal output area:

```tsx
{output.verdict === 'passed' && !roast && (
  <button onClick={() => handleRoastCode(blockId)}>
    🎭 Roast My Code
  </button>
)}
```

### Sequence

```
User clicks "Roast My Code":
  → roasts[id] = { status: 'loading', text: '' }
  → POST /api/blocks/{id}/roast (SSE)
    Body: { code: codeValues[id] }
  
  → Loading state shows: "🎭 Senior Dev AI is typing..."
  
  → SSE token events: stream into roasts[id].text character by character
  
  → Done: full roast displayed in bg-orange-50 border-orange-200 panel
```

### Backend prompt (reference for frontend expectations)

The backend uses a "Senior Dev AI" persona that:
- Is technically accurate (real code quality feedback)
- Is humorously sarcastic, NOT mean-spirited
- References the actual code written
- Ends with a concrete refactoring suggestion
- NEVER implies the code is broken (it passed — the roast is about style/elegance)

### UI

```tsx
// After roast streams
<div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
  <div className="flex items-center gap-2 text-orange-800 font-semibold mb-2 text-xs uppercase tracking-wider">
    🎭 Senior Dev AI 
    {status === 'loading' && <span className="animate-pulse normal-case text-orange-600 font-normal">is typing...</span>}
  </div>
  <div className="text-orange-900 leading-relaxed font-sans text-[13px]">
    {roast.text}{streaming && <span className="animate-pulse">▊</span>}
  </div>
</div>
```

---

## 5. 🔥 Struggle Heatmap (SUPERPOWER)

### Data source

`GET /api/blocks/{id}/struggle-stats` → `{ stuck_count: number }`

"Stuck" = `code_submissions` rows where `attempt_number > 2` for that `block_id`, aggregated across all enrollments.

### Display logic

```ts
// Show heatmap only if stuck_count >= 2 (avoid showing "1 friend got stuck" — low signal)
const showHeatmap = stuck_count >= 2;
const label = stuck_count === 1 ? '1 friend got stuck here' : `${stuck_count} friends got stuck here`;
```

### UI (in Monaco workspace header, left side)

```tsx
{showHeatmap && (
  <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
    <Flame size={12} className="animate-pulse" />
    {label}
  </div>
)}
```

### Fetch timing

Fetch `struggle-stats` on code block first reveal (when `activeWorkspaceBlockId` changes to a `code` block). Cache result for the session — no live polling needed.

---

## 6. 🎮 Hobby Context Injection (SUPERPOWER)

### Student profile

After sign-up (or via a dashboard card), student optionally enters 1–3 hobbies/interests.

**UI (dashboard card, first-time only):**

```tsx
<Card className="border-emerald-100 bg-emerald-50/50">
  <CardHeader>
    <h3 className="font-semibold text-slate-800">Personalize your tutor ✨</h3>
    <p className="text-sm text-slate-600">Tell us what you're into — your AI tutor will use your interests to make explanations click.</p>
  </CardHeader>
  <CardContent>
    <Input placeholder="e.g., gaming, coffee, hiking, Valorant" />
    <Button>Save</Button>
  </CardContent>
</Card>
```

**Storage:** `PATCH /api/me/profile` → `{ hobbies: string[] }` stored in `users.hobbies TEXT[]`.

**Backend injection:** When the student asks a question via "Ask Anything", the backend prepends to the system prompt:

```python
hobby_context = f"The student enjoys: {', '.join(user.hobbies)}. When helpful, use analogies from these interests to make explanations click."
```

**Frontend impact:** No UI change in the tutor itself — the AI answer text naturally contains the analogy. Students experience it as the AI "getting them".

**No indicator in UI** that this is happening — it should feel magical, not mechanical.

---

## 7. Ask Anything Flow

### State

```ts
chatHistory: Array<{ role: 'user' | 'ai', text: string }>
askInput: string
```

### Sequence

```
Student types in footer input → updates askInput

Student submits (Enter or ArrowUp button):
  → chatHistory.push({ role: 'user', text: askInput })
  → askInput = ''
  → POST /api/enrollments/{id}/ask { question, block_id: activeBlockId } (SSE)
  → chatHistory.push({ role: 'ai', text: '' })
  
  → SSE token events: accumulate into last chatHistory entry (live streaming)
  → SSE done: persist to backend (backend-side after stream completes)
  
  → Lesson flow NOT interrupted — Continue button remains clickable during streaming
```

### Rendering (in lesson-feed.tsx)

Chat history renders **after all revealed blocks** and **before the Continue button** (or after it, whichever is more natural to scroll to). Separate from lesson blocks with a subtle `border-t border-slate-100` divider.

```tsx
// User bubble
<div className="flex justify-end">
  <div className="max-w-[85%] p-3.5 rounded-2xl rounded-br-sm text-[14px] leading-relaxed 
                  bg-slate-800 text-white shadow-sm font-sans">
    {chat.text}
  </div>
</div>

// AI bubble  
<div className="flex justify-start">
  <div className="max-w-[85%] p-3.5 rounded-2xl rounded-bl-sm text-[14px] leading-relaxed 
                  bg-emerald-50 border border-emerald-100 text-emerald-900 shadow-sm 
                  flex gap-3 items-start font-serif">
    <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
    <div>{chat.text}{streaming && <span className="animate-pulse">▊</span>}</div>
  </div>
</div>
```

---

## 8. Concept Check Flow

### State (per block)

```ts
conceptAnswers: Record<blockId, string>   // the selected option string
```

### Sequence

```
Block reveals:
  → Question + option buttons shown
  → Buttons: bg-white border-slate-300, hover:border-emerald-500 hover:text-emerald-700

User clicks an option:
  → conceptAnswers[id] = selected option
  → All buttons disabled (hasAnswered = true)
  → Selected correct: bg-emerald-50 border-emerald-500 text-emerald-800
  → Selected wrong: bg-red-50 border-red-300 text-red-800
  → Other options: opacity-50
  → Explanation text appears below (font-serif italic text-slate-600)
  → Continue button enables
  
  → POST /api/blocks/{id}/concept-check { selected_answer, enrollment_id }
    (fire-and-forget for persistence; no live LLM call)
```

**One-shot**: No retry, no second chance. Continue enables whether correct or wrong.

---

## 9. Understanding Check Flow

### State (per block)

```ts
understandingResponse: Record<blockId, string>   // textarea value
understandingFeedback: Record<blockId, string>   // streaming feedback
understandingPassed:   Record<blockId, boolean>
understandingAttempts: Record<blockId, number>
```

### Sequence

```
Block reveals (always the last block in a lesson):
  → Prompt text shown (font-serif font-medium)
  → Textarea (empty, placeholder: "Write your answer here...")
  → "Submit" button

User writes response, clicks Submit:
  → POST /api/blocks/{id}/understanding-check { response, enrollment_id } (SSE)
  → Textarea disabled during evaluation
  
  → SSE token events: stream feedback below textarea
  
  → SSE result event: { passed: bool, level: string }
  
  → PASS (level >= threshold):
      understandingPassed[id] = true
      Feedback shown with green ✓ CheckCircle2 header
      "Next Lesson" button enables
      
  → FAIL (level < threshold):
      understandingAttempts[id]++
      Feedback shown with Socratic guidance (font-serif text-slate-700)
      Textarea re-enables for revision (content preserved)
      "Submit" re-appears
      Loop continues until passed

NO SKIP. NO GIVE-UP. 
```

---

## 10. Right Pane Derivation

The right pane is a **pure derivation** — no side effects. Computed in `derive-right-pane.ts`:

```ts
type RightPane = 'monaco' | 'mermaid' | 'empty';

export function deriveRightPane(block: Block | null): RightPane {
  if (!block) return 'empty';
  if (block.type === 'code') return 'monaco';
  if (block.type === 'mermaid') return 'mermaid';
  return 'empty';  // markdown, concept_check, understanding_check = no change to workspace
}
```

**Key rule**: The right pane only changes when `active_block_id` resolves to a `code` or `mermaid` block. Clicking a `markdown` or `concept_check` block does NOT reset the workspace.

**Implementation**: `WorkspaceShell` subscribes to `activeBlockId` from TutorStore, runs `deriveRightPane`, and renders the appropriate component.

---

## 11. TTS Audio System

### State (TutorStore)

```ts
audio: {
  url: string | null
  playing: boolean
  speed: number    // 0.5 | 0.75 | 1.0 | 1.25 | 1.5
  autoContinue: boolean
  volume: number   // 0.0–1.0
}
```

### Sequence

```
Block becomes active (new reveal OR click-to-jump):
  → if block.tts_audio_url exists:
      audio.url = block.tts_audio_url
      HTML5 <audio> preloads URL
      Auto-plays (requires prior user gesture; handle gracefully if blocked)
  → else:
      audio.url = null (silent; lesson continues text-only)

User gesture (any click) satisfies browser autoplay policy for subsequent blocks.

audio.onended:
  → if audio.autoContinue && isContinueEnabled():
      handleContinue()
```

### Controls (in top header, compact)

```tsx
<button onClick={() => setAudioPlaying(!playing)}>
  <AudioLines size={14} />
</button>
<button onClick={openSpeedPopover}>
  <ChevronDown size={14} />
</button>
```

Speed popover: `[0.5×] [0.75×] [1×] [1.25×] [1.5×]` + Auto-continue toggle.

---

## 12. Sidebar Drawer System

### State (TutorStore)

```ts
activeSidebar: 'progress' | 'notes' | null
```

### Toggle behavior

```
Click PieChart icon (nav rail):
  → activeSidebar === 'progress' ? null : 'progress'

Click FileText icon (nav rail):
  → activeSidebar === 'notes' ? null : 'notes'

Click X inside drawer:
  → activeSidebar = null

Drawers animate: .animate-slide-left on mount, no exit animation in V1
```

### Layout order (right to left)

```
[Workspace flex-1] → [Drawer w-320px if active] → [Nav rail w-14]
```

Drawer sits between workspace and nav rail — it does NOT overlay the workspace.

---

## 13. Error States

| Scenario | User-facing behavior |
|---|---|
| Judge0 timeout / 5xx | Terminal: "Execution unavailable — please retry." Retry button shown. Does NOT count as attempt. |
| Anthropic 5xx (hint) | "AI temporarily unavailable — retry?" link. Does NOT count as attempt. |
| Anthropic 5xx (ask) | AI bubble shows "I'm having trouble responding. Please try again." |
| Mermaid invalid syntax | Right pane shows: "Diagram could not be rendered" with block_id logged to console |
| Monaco fails to load | Fallback to `<textarea>` with identical styling |
| Audio file 404 | Silent fail — no audio icon in block; lesson continues |
| SSE connection drops mid-stream | "Connection lost — [retry]" button re-triggers the request |
| Stale tab after idle | `document.addEventListener('visibilitychange')` → refetch lesson state on focus |
