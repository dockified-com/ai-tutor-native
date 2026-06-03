# Dockified — AI Native Programming Tutor

## Overview

Dockified is an AI-powered programming education platform. The V1 product is a single-creator, multi-student interactive tutor: the founder uploads a PDF document and a custom prompt → Anthropic Claude generates a complete static lesson script (markdown explanations, code exercises, Mermaid diagrams, concept checks, understanding checks) → the founder previews and publishes → shares a 6-character course code with students. Students enter the code, walk through lessons block-by-block in a 2-pane interactive tutor with TTS narration, and are gated by demonstrated understanding before advancing.

The moat is pedagogical: AI re-engages live only when the student does something the pre-generated script can't predict — asks a free-form question, submits failing code, picks a wrong concept-check answer, or submits an understanding-check response.

## Goals

1. **Creator**: Upload a PDF course and publish a fully interactive course in under 10 minutes of manual effort
2. **Student**: Learn programming concepts block-by-block with narration, code exercises, Socratic hints, and real-time Q&A — gated by demonstrated understanding
3. **Product**: Validate the core hypothesis — AI-generated interactive lessons produce better outcomes than passive video — with a live cohort of students at ≤$0.15 AI cost per student per course

## Core User Flow

### Creator Flow
1. Sign in with Clerk (email or Google)
2. Dashboard → "Create Course" → 3-step wizard
3. Step 1: Upload PDF (≤10 MB, text-based only)
4. Step 2: Configure — title, description, default language, custom prompt
5. Step 3: Trigger generation → redirect to course detail → poll status every 3s
6. Generation phases: `extracting_pdf → embedding → generating_outline → generating_lesson_N → generating_audio → ready`
7. Preview the full tutor experience (no progress saved)
8. Publish → receive 6-char code → share `https://tutor.dockified.com/join/{CODE}`

### Student Flow
1. Click `/join/{code}` or enter code on dashboard → auto-enroll
2. Navigate to lesson → 2-pane tutor view
3. Click **Continue** → next block reveals (fade-in) + TTS auto-plays
4. **Markdown / Mermaid blocks**: Continue auto-enables
5. **Concept Check**: Pick Yes/No → pre-generated explanation → Continue enables (one-shot)
6. **Code block**: Write code in Monaco → Run → Judge0 executes
   - Pass → Continue enables
   - Fail → Socratic hint streams (never reveals answer) → retry
7. **Understanding Check** (always the final block): Write response → Claude evaluates vs rubric
   - Pass threshold → "Next Lesson" enables
   - Below threshold → Socratic feedback → revise → retry (no skip, no give-up)
8. Ask Anything in footer at any time → RAG-backed Claude answer streams in feed

## Features

### Course Authoring (Creator)
- 3-step creation wizard with PDF upload, configuration, and async generation trigger
- Real-time generation status polling with phase-level progress display
- Preview mode: full tutor experience, zero progress writes, preview banner
- Lesson-level regeneration with optional refined prompt
- Course publish → 6-char alphanumeric code generation
- Creator dashboard: all courses with status badges and student counts

### Tutor Experience (Student)
- 2-pane layout: left (~38%) = block feed, right (~62%) = dynamic workspace
- Block-by-block reveal with fade-in animation
- TTS narration per block (OpenAI `alloy` voice, pre-generated)
- Audio controls: play/pause, seek, speed 0.5×–1.5×, auto-continue toggle
- Click-to-jump: click any past block → right pane re-derives; "Return to current" pill
- Course Progress slide-out: curriculum tree with per-lesson % bars
- Ask Anything: SSE-streamed RAG-backed Q&A, never interrupts lesson flow
- Progress persistence: bookmark saved on every Continue; resumes exactly on return

### 5 SDUI Block Types
- **Markdown**: rendered text (`font-serif`), auto-enables Continue
- **Code + Terminal**: Monaco editor + Judge0 execution + Socratic hints on failure
- **Mermaid**: diagram rendered in right pane, auto-enables Continue
- **ConceptCheck**: Yes/No question + pre-generated explanation, one-shot
- **UnderstandingCheck**: open-response + LLM evaluation + Socratic loop until threshold

### Superpowers (V1 differentiators)
- **🎭 Roast My Code**: After code passes, student can request an AI "Senior Dev" humorous-but-accurate code review. Streams into the terminal. Never roasts failing code. Encourages refactoring and quality awareness.
- **🔥 Struggle Heatmap**: Code blocks show a `Flame` badge — "N friends got stuck here" — based on aggregated attempt counts across all students. Normalizes struggle and reduces anxiety.
- **🎮 Hobby Context Injection**: Student optionally enters their interests (gaming, coffee, hiking). The "Ask Anything" AI uses these to craft analogies that make concepts click ("Think of decorators like playing Sage in Valorant..."). Feels magical, not mechanical.

## Scope

> **Design reference**: See `context/ui-context.md` for full visual spec (light theme, emerald accent, tri-font system). See `context/feature-system.md` for exact interaction state machines.

### In Scope (V1)

- Single creator account (founder only; role set via SQL)
- Public course codes — no invite-link infrastructure
- Pre-generated (static) lesson scripts — full script at course-creation time
- Desktop web only (1280px+ viewport)
- English only
- Text-based PDFs only (no OCR)
- Lesson-level regeneration only (no block-level editing)
- asyncio-based background job (no Redis/Celery)

### Out of Scope (V2+)

- Multi-creator accounts
- Engine B — Code Auto-Grader / Assignments
- Engine C — Voice Mock Interview
- Block-level editing and drag-and-drop reorder
- Mobile responsive design
- Multi-language UI (i18n)
- Scanned PDF / OCR support
- Notes panel
- Adaptive lessons / student profiling
- Scroll-sync time machine
- LangGraph / LangChain / LlamaIndex
- Analytics dashboards (Grafana, PostHog)

## Success Criteria

1. Creator publishes a course from a 30-page PDF in under 10 minutes end-to-end
2. Generation success rate ≥ 95% (non-failed courses)
3. First student enrolled within 24h of first publish
4. Lesson completion rate ≥ 70% (students who complete all blocks per lesson)
5. Course completion rate ≥ 60% (students who pass all lessons)
6. Understanding check pass rate ≥ 70%
7. Per-student AI cost ≤ $0.15 per course
8. Socratic hints never contain exercise answer code (verified by automated test)
