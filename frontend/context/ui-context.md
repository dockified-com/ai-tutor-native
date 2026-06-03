# UI Context

> **Prototype reference**: `context/feature-specs/2026-06-03-phase-2-generation-pipeline-status-ui/prototype-reference.jsx`
> This file is the canonical design source. All class names and dimensions below are confirmed against it.

## Theme

**Light mode only. No dark mode.**

The design language is a clean, academic, yet modern technical workspace — prioritizing high legibility and low cognitive load. The feel is calming, focused, and professional: pristine white and soft slate backgrounds, airy spacing, and vivid **emerald green** as the single accent color for all interactive and success states. Content-heavy lesson text uses a serif font to trigger a "reading mode" mindset. Code uses a monospace font. UI chrome uses a clean sans-serif.

Think: a premium online learning environment — clean like Linear, readable like Notion, focused like a code editor.

---

## Colors

All components use Tailwind's standard palette. No hardcoded hex values. Use these semantic mappings everywhere.

| Role | CSS Variable | Tailwind Ref | Hex |
| --- | --- | --- | --- |
| Page background | `--bg-base` | `white` | `#FFFFFF` |
| Surface (cards, panels) | `--bg-surface` | `slate-50` | `#F8FAFC` |
| Surface alt (inputs, code bg) | `--bg-surface-alt` | `slate-100` | `#F1F5F9` |
| Primary text | `--text-primary` | `slate-800` | `#1E293B` |
| Secondary text | `--text-secondary` | `slate-600` | `#475569` |
| Muted text | `--text-muted` | `slate-500` | `#64748B` |
| Placeholder text | `--text-placeholder` | `slate-400` | `#94A3B8` |
| Primary accent | `--accent-primary` | `emerald-600` | `#059669` |
| Accent hover | `--accent-primary-hover` | `emerald-700` | `#047857` |
| Accent subtle bg | `--accent-subtle` | `emerald-50` | `#ECFDF5` |
| Accent border | `--accent-border` | `emerald-400` | `#34D399` (border) |
| Border default | `--border-default` | `slate-200` | `#E2E8F0` |
| Border subtle | `--border-subtle` | `slate-100` | `#F1F5F9` |
| Error | `--state-error` | `red-600` | `#DC2626` |
| Error subtle | `--state-error-subtle` | `red-50` | `#FEF2F2` |
| Success | `--state-success` | `emerald-500` | `#10B981` |
| Success subtle | `--state-success-subtle` | `emerald-50` | `#ECFDF5` |
| Warning / Roast | `--state-warning` | `amber-600` | `#D97706` |
| Warning subtle | `--state-warning-subtle` | `amber-50` | `#FFFBEB` |
| Orange / Heatmap | `--state-heatmap` | `orange-600` | `#EA580C` |
| Code line numbers | `--code-gutter` | `slate-300` | `#CBD5E1` |

---

## Typography

**Tri-font system** — three distinct fonts for three distinct content roles.

| Role | Font | Tailwind Variable | Usage |
| --- | --- | --- | --- |
| UI text & controls | Inter or Geist Sans | `--font-sans` | Buttons, headers, navigation, labels, metadata |
| Long-form lesson content | Merriweather (serif) | `--font-serif` | Markdown blocks, lesson explanations, Socratic hints, AI answers |
| Code & terminal | Fira Code or Geist Mono | `--font-mono` | Monaco editor, terminal output, inline `code` spans |

**Size scale:**
- `text-[10px]` — Nav rail labels (percentage, icon labels)
- `text-xs` (12px) — Metadata, timestamps, status chips, code line numbers
- `text-sm` (14px) — UI controls, terminal output, chat bubbles, concept check options
- `text-[15px]` — Lesson body text in markdown blocks and hints (the primary reading size)
- `text-base` (16px) — Section headings in drawers
- `text-lg`+ — Dashboard / page-level headings only

**Apply `font-serif` to all lesson content, hints, AI answers, and concept check explanations.** `font-sans` is the default everywhere else.

---

## Border Radius

Distinct radii create visual hierarchy between structural and interactive elements.

| Context | Tailwind class | Value | Used for |
| --- | --- | --- | --- |
| Inline / small UI | `rounded` | 4px | Tags, chips, small badges |
| Buttons / Inputs | `rounded-md` | 6px | All button variants, text inputs |
| Lesson blocks / Cards | `rounded-xl` | 12px | Block containers, cards, concept check panels |
| Chat bubbles (user) | `rounded-2xl rounded-br-sm` | 16px sharp corner | User message bubbles (speech tail effect) |
| Chat bubbles (AI) | `rounded-2xl rounded-bl-sm` | 16px sharp corner | AI answer bubbles |
| Primary action (Continue) | `rounded-full` | 9999px | Continue button, course code badge, pill CTAs |
| Drawers / Nav rail | `rounded-none` | 0px | Structural panels, rails |

---

## Animations

```css
/* globals.css */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }

@keyframes slideLeft {
  from { margin-right: -320px; opacity: 0; }
  to   { margin-right: 0; opacity: 1; }
}
.animate-slide-left { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
```

| Animation | Class | Trigger |
| --- | --- | --- |
| Block reveals in feed | `fade-in-up` (0.4s ease-out) | New block added to `revealedIndex` |
| Chat answer appears | `fade-in-up` (0.3s) | AI response bubble added to chatHistory |
| Slide-out drawer | `animate-slide-left` (0.3s cubic) | `activeSidebar` changes from null |
| Streaming text cursor | `animate-pulse` on `▊` | Any SSE stream in progress |
| Heatmap flame | `animate-pulse` on Flame icon | Passive — always pulsing when shown |
| Skeleton loading | `animate-pulse` on skeleton divs | Data not yet loaded |

---

## Scrollbars

Custom slim scrollbars — never distracting:

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }
```

---

## Component Library

shadcn/ui on top of Tailwind CSS v4. Components live in `shared/ui/`. Use the CLI to add:

```bash
npx shadcn@latest add <component>
```

Import all from the barrel: `import { Button, Card, Badge, Sheet } from '@/shared/ui'`

| Component | Used for |
| --- | --- |
| `Button` | Continue, Run, Submit, Publish, Regenerate |
| `Dialog` | Regenerate lesson modal, publish confirmation |
| `Sheet` | Course Progress slide-out, Notes slide-out |
| `Card` | Course cards on dashboard, Lesson Complete card |
| `Badge` | Status chips, "Code Exercise" badge, language badge, heatmap badge |
| `Textarea` | Understanding check input, custom prompt, code fallback |
| `Input` | Course code input, title fields, Ask Anything footer |
| `Select` | Language dropdown, TTS speed selector |
| `Progress` | Lesson progress bars in Progress drawer |
| `Skeleton` | Loading states |
| `Sonner` | Toast notifications |
| `Separator` | Section dividers |
| `Tabs` | Notes drawer (Instructor Notes / My Notes) |

---

## Layout: Tutor View

This is the core layout. Every dimension is exact — do not approximate.

```
┌────────────────────────────────────────────────────────────────────┐
│ Top Header (h-14, border-b border-slate-100)                       │
│  [Dockified logo] [Course / Lesson breadcrumb]    [Audio controls] │
├──────────────────────────────┬─────────────────────────┬────┬──────┤
│ Left Pane                    │ Right Workspace          │Drew│ Rail │
│ w-[450px] min-w-[400px]      │ flex-1                   │ er │56px  │
│                              │                          │320p│      │
│ ┌─ Scrollable block feed ─┐  │  (Monaco / Mermaid /    │x   │ ⊙    │
│ │ [revealed blocks...]    │  │   Empty Welcome)         │    │ 14%  │
│ │                         │  │                          │    │      │
│ │ [Continue (N)]          │  │                          │    │ ☰    │
│ │                         │  │                          │    │ Notes│
│ │ [chat history...]       │  │                          │    │      │
│ └─────────────────────────┘  │                          │    │ ⚙    │
│                              │                          │    │      │
│ ┌─ Ask Footer (sticky) ───┐  │                          │    │ 🌐   │
│ │  Ask or Comment...    ↑ │  │                          │    │      │
│ └─────────────────────────┘  │                          │    │      │
└──────────────────────────────┴─────────────────────────┴────┴──────┘
```

**Panel rules (confirmed from prototype):**
- Root: `h-screen w-full bg-white flex flex-col font-sans text-slate-800 overflow-hidden selection:bg-emerald-100`
- Left pane: `w-[450px] min-w-[400px] flex flex-col relative z-10 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)]`
- Feed scroll area: `flex-1 overflow-y-auto px-8 py-8 scroll-smooth pb-32`
- Right workspace: `flex-1 bg-slate-50 flex flex-col relative z-0` (outer); inner workspace `flex-1 flex flex-col h-full bg-white border-l border-slate-200`
- Slide-out drawer: `w-[320px] bg-white border-l border-slate-100 shadow-sm flex flex-col relative z-20 animate-slide-left`
- Nav rail: `w-14 bg-white border-l border-slate-100 flex flex-col items-center py-4 justify-between shrink-0 z-30`

---

## Layout: Top Header (Tutor)

```tsx
// Confirmed from prototype
<header className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
  {/* Logo mark: w-6 h-6 bg-emerald-600 rounded, Layout icon size={14} text-white */}
  {/* Breadcrumb: font-medium text-slate-500 tracking-tight text-sm, "/" separator text-slate-300 */}
  {/* Active lesson: text-slate-800 */}
  {/* Audio button: bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded text-xs font-medium */}
  {/*   contains: <AudioLines size={14} /> <ChevronDown size={14} /> */}
</header>
```

---

## Layout: Dashboard

- Centered container: `max-w-5xl mx-auto px-6 py-10`
- Course card grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Clean section headings with `text-lg font-semibold text-slate-800`

## Layout: Creation Wizard

- Centered: `max-w-2xl mx-auto px-6 py-10`
- Step indicator at top, form below, sticky bottom action bar
- Step active: `border-b-2 border-emerald-500 text-emerald-700`

---

## Block Visual Language

### Left Pane Block States

| State | CSS treatment |
| --- | --- |
| Active block | `opacity-100` + left border accent + subtle bg |
| Past block (not active) | `opacity-60 hover:opacity-100 transition-opacity` |
| Below-active (after click-to-jump) | Same `opacity-60` treatment |

### Block Type Identifiers

| Block Type | Visual indicator in feed | Right pane effect |
| --- | --- | --- |
| `markdown` | None — plain serif text, no badge | None |
| `code` | Bold serif instruction text | Monaco editor + terminal |
| `mermaid` | Italic instruction text | Mermaid SVG |
| `concept_check` | `font-medium font-serif` question + Yes/No buttons | None |
| `understanding_check` | `font-medium font-serif` prompt + `<textarea>` | None |

### Socratic Hint (inline in feed)

```
bg-emerald-50/50 border-l-2 border-emerald-400
p-4 text-sm text-slate-700 font-serif leading-relaxed
```

Appears directly below the failing block, streams character by character.

### "Roast My Code" Display (inline in terminal)

```
bg-orange-50 border border-orange-200 rounded-lg p-4
Header: "🎭 Senior Dev AI" in text-orange-800 font-semibold text-xs uppercase
Body: text-orange-900 font-sans text-[13px] leading-relaxed
```

Streams character by character after clicking the Roast button.

### Struggle Heatmap Badge (code block header)

```
flex items-center gap-1.5 text-xs font-medium text-orange-600
bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100
<Flame size={12} className="animate-pulse" /> "2 friends got stuck here"
```

Shown in the workspace header for code blocks that have high failure rates.

---

## Continue Button

```tsx
// Enabled state
className="flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium 
           bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"

// Disabled state  
className="flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium 
           bg-slate-50 text-slate-400 cursor-not-allowed"

// Block count badge inside button
<span className="bg-white/60 px-1.5 rounded font-mono text-xs">{count}</span>
```

The Continue button sits at the bottom of the revealed content, above the Ask footer.

**Inline row with Continue (confirmed from prototype):**
```tsx
// The Continue button row — NOT just the button alone
<div className="pt-2 flex items-center gap-4 fade-in-up">
  <button ...>Continue <span>N</span></button>
  <div className="flex gap-3 text-slate-400">
    <Play size={16} className="cursor-pointer hover:text-emerald-600 transition-colors" />
    <ThumbsDown size={16} className="cursor-pointer hover:text-red-500 transition-colors" />
  </div>
</div>
```
Play icon (re-play TTS) and ThumbsDown sit inline with Continue, `text-slate-400`, `gap-3`.

---

## Ask Anything Footer

```tsx
// Container: sits inside left pane, shrink-0
className="p-6 bg-white border-t border-slate-50 shrink-0 z-20"

// Input wrapper
className="relative bg-slate-50 rounded-xl flex items-center border border-slate-200 
           focus-within:border-emerald-400 focus-within:bg-white 
           focus-within:ring-4 focus-within:ring-emerald-50 
           transition-all shadow-sm"

// Input
className="w-full bg-transparent text-sm p-3.5 pr-10 focus:outline-none 
           placeholder-slate-400 font-sans"
placeholder="Ask or Comment ..."

// Submit button (ArrowUp, strokeWidth={2.5})
// Active: text-emerald-600 hover:bg-emerald-50
// Inactive: text-slate-300
```

Chat history renders **in the block feed** above the footer — not in a separate panel. User bubbles are `bg-slate-800 text-white rounded-2xl rounded-br-sm`. AI answer bubbles are `bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-bl-sm` with a `<Sparkles size={16} className="text-emerald-600" />` icon.

---

## Code Workspace

### Header bar (`h-12, bg-slate-50/50, border-b border-slate-200`)

```
Left: [Code2 icon] "Example N"  |  [Flame badge: "N friends got stuck here"]
Right: "Run CTRL + ↵"  (text-emerald-600, text-xs font-semibold uppercase)
```

**Run button (confirmed from prototype):**
```tsx
<button className="text-xs font-semibold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5">
  Run <span className="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">CTRL + ↵</span>
</button>
```

**Roast My Code button (confirmed — sits in terminal body, below output):**
```tsx
<button className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors border border-slate-200 shadow-sm">
  🎭 Roast My Code
</button>
```
Loading state inside roast panel: `<span className="animate-pulse normal-case text-orange-600 font-normal">is typing...</span>`

### Editor area

```
flex-1 flex bg-white
Left: line number gutter (w-12, border-r border-slate-100, font-mono text-xs text-slate-300)
Right: <textarea> or Monaco (font-mono text-[14px] leading-relaxed text-slate-800)
```

### Terminal (`h-[40%], border-t border-slate-200`)

```
Header (h-10): [TerminalSquare icon] "Output" | right: Roast button appears here post-pass
Body: bg-slate-50 font-mono text-sm text-slate-700 whitespace-pre-wrap p-4
```

Verdict states:
- **Running**: `text-slate-500 italic "Running..."`
- **Passed**: `CheckCircle2 text-emerald-700` + green header row + "All tests passed!" + Roast button
- **Failed**: `X text-red-700` + red header row + diff of output vs expected

---

## Nav Rail (`w-14`)

Two icon groups separated by `flex-1` spacer:

**Top group:**

| Icon | Label | Behavior |
| --- | --- | --- |
| `PieChart` | `"14%"` (live %) | Toggle Progress drawer; shows green dot badge |
| `FileText` | `"Notes"` | Toggle Notes drawer |

**Bottom group:**

| Icon | Behavior |
| --- | --- |
| `Globe` | Language selector (V2) |
| `Settings` | Settings (V2) |

Active drawer icon: `text-emerald-600`. Inactive: `text-slate-400 hover:text-slate-600`.

Progress icon has a green dot badge (`w-2 h-2 bg-emerald-500 rounded-full absolute -top-1 -right-1`).

---

## Progress Drawer (`w-[320px]`)

Header: `h-14 border-b border-slate-100 flex items-center justify-between px-5`

Content:
- Course title + progress percentage badge (`bg-emerald-50 text-emerald-600 rounded-full`)
- `MODULE N` section labels (`text-xs font-bold text-slate-400 tracking-wider`)
- Lesson rows with circular progress indicators:
  - **Active**: `w-4 h-4 rounded-full border-4 border-emerald-500 mt-0.5 shrink-0` + row `flex items-start gap-3 py-2 text-emerald-600 bg-emerald-50/50 -mx-3 px-3 rounded-lg cursor-pointer`
  - **Complete**: filled `bg-emerald-500` circle
  - **Incomplete**: `w-4 h-4 rounded-full border-2 border-slate-300 shrink-0` + row `flex items-center gap-3 py-2 text-slate-500 cursor-pointer hover:text-slate-800`
- Sub-items (blocks) shown as `w-1.5 h-1.5 rounded-full` bullet dots under active lesson:
  - Complete block: `bg-emerald-500` filled dot
  - Incomplete block: `border border-emerald-500` empty dot, `text-emerald-600/50`

## Notes Drawer (`w-[320px]`)

Header: same as Progress drawer.

Content:
- Tab switcher: `flex bg-slate-50 p-1 rounded-lg` with `Instructor Notes` / `My Notes`
- Active tab: `bg-white rounded shadow-sm text-slate-800`
- Instructor notes: `font-serif text-slate-600` with `<ul>` list
- My notes: free `<textarea>` (V2)

---

## Icons

Lucide React, stroke-based only.

| Size | Class | Usage |
| --- | --- | --- |
| Small inline | `size={14}` or `size={16}` | Buttons, badges, hints, terminal header |
| Navigation | `size={18}` or `size={20}` | Nav rail, header controls |
| Submit arrow | `<ArrowUp size={18} strokeWidth={2.5}` | Ask Anything submit |
| Welcome state | `<Hand size={64}` | Empty workspace welcome state |

Key icons used:
- `Play`, `Pause`, `AudioLines`, `ChevronDown` — audio controls
- `PieChart` — Course Progress nav
- `FileText` — Notes nav  
- `Code2` — Code Exercise workspace header
- `TerminalSquare` — Terminal section header
- `Layout` — Dockified logo in breadcrumb
- `ArrowUp` — Ask submit
- `Sparkles` — AI answer icon
- `CheckCircle2` — Passed verdict
- `X` — Failed verdict, close buttons
- `Flame` — Heatmap badge
- `ThumbsDown` — Feedback on Continue row
- `ChevronRight` — Breadcrumb separator
- `Globe`, `Settings` — Nav rail bottom
- `Hand` — Empty workspace welcome (filled, `fill="#fbbf24"`, `strokeWidth={1}`)
