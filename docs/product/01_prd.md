# Product Requirements Document (PRD)
# AI Native Programming Tutor — V1

**Version:** 1.0  
**Status:** Approved  
**Date:** 2026-05-30  
**Author:** yeakkhaily (Dockified founder)  
**Project:** Dockified Personalized Learning Module — V1  

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Vision & Goals](#2-vision--goals)
3. [Target Users](#3-target-users)
4. [User Stories](#4-user-stories)
5. [Product Scope](#5-product-scope)
6. [Feature Requirements](#6-feature-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Pedagogical Principles](#8-pedagogical-principles)
9. [Success Metrics](#9-success-metrics)
10. [Constraints & Assumptions](#10-constraints--assumptions)
11. [Open Questions](#11-open-questions)

---

## 1. Problem Statement

### The Pain

Programming education is broken in two distinct ways:

1. **For instructors:** Creating high-quality, interactive programming courses takes weeks of structured work — writing code exercises, writing narration, generating diagrams, and building comprehension checks manually. Most instructors settle for slide decks or raw video. The result: passive consumption with no verification that the student understood anything.

2. **For students:** Existing programming courses (Udemy, Coursera) are passive video + quizzes. There's no tutor you can ask questions. There's no enforced understanding gate before moving on. Students watch a video and immediately forget what they learned because they never *applied* it under guidance.

### The Opportunity

AI makes it possible to:
- **Generate** a complete interactive lesson from any PDF document — in minutes
- **Tutor** students block-by-block with narration, code exercises, and Socratic hints
- **Gate** lesson progress on demonstrated understanding (not just "did you click Next")
- **Answer questions** about the material in real-time via RAG-backed LLM

No competitor in the market delivers all four simultaneously while keeping per-student AI cost under $0.15.

---

## 2. Vision & Goals

### Vision

> Dockified is the platform where any technical expert can turn their knowledge into a personalized, AI-powered course that teaches every student like a 1-on-1 tutor.

### V1 Goal

Ship the **AI Native Programming Tutor** — the first proof-of-concept of Dockified's core proposition:

- A **creator** (the founder) can upload a programming topic PDF and generate a complete interactive course in under 10 minutes
- A **student** can receive that course via a 6-character code and experience a tutor-style lesson that requires demonstrated understanding before progression
- The product validates the core hypothesis: _AI-generated interactive lessons produce better learning outcomes than passive video_

### V1 Success Criteria

| Criteria | Target |
|---|---|
| Time to publish a 30-page PDF course | < 10 minutes end-to-end |
| First student enrolled within 24h of launch | ✓ (founder + classmates) |
| Course completion rate (first cohort) | ≥ 60% of enrolled students |
| Post-lesson comprehension score | ≥ 70% pass rate on understanding checks |
| Per-student AI cost | ≤ $0.15/course |
| Generation success rate | ≥ 95% (non-failed courses) |

---

## 3. Target Users

### 3.1 Primary Creator — The Founder (V1)

**Profile:** Technical educator, solo founder of Dockified. Building the platform AND using it to teach classmates.

**Context:**
- Has a university programming syllabus (Python, algorithms, system design) in PDF form
- Wants to run enrichment classes for 5–20 fellow students
- Cannot spend more than 1 hour of manual effort per course
- Needs to preview the course before publishing

**Core jobs to be done:**
- "Upload my PDF and get a fully interactive lesson, fast"
- "Preview it so I know it's correct before sharing"
- "Share a simple code with my class — no accounts required from me"

### 3.2 Secondary User — Students (V1)

**Profile:** University students (20–25 years old), technically curious, comfortable with web apps.

**Context:**
- Received a course code via chat/email
- May or may not have used interactive learning platforms before
- Studying programming concepts in their free time
- Using laptop/desktop browser (V1 is desktop-only)

**Core jobs to be done:**
- "Sign up easily with my email or Google account"
- "Go through the lesson at my own pace"
- "Ask questions when I'm confused without leaving the page"
- "Know that I'm actually understanding the material, not just clicking through"

### 3.3 Deferred Users (V2+)

- Multiple creators (other educators wanting to use Dockified)
- Mobile users
- Non-English speakers

---

## 4. User Stories

### Creator Stories

| ID | Story | Priority |
|---|---|---|
| C-01 | As a creator, I can upload a PDF (≤10 MB) and configure course settings so the AI generates a complete course | P0 |
| C-02 | As a creator, I can monitor generation progress in real-time with phase-level status so I know what's happening | P0 |
| C-03 | As a creator, I can preview the full tutor experience before publishing, without affecting any real student progress | P0 |
| C-04 | As a creator, I can publish a course and receive a unique 6-character code to share | P0 |
| C-05 | As a creator, I can regenerate any individual lesson with a refined prompt if the content needs improvement | P1 |
| C-06 | As a creator, I can see all my courses on a dashboard with their status and student enrollment counts | P1 |

### Student Stories

| ID | Story | Priority |
|---|---|---|
| S-01 | As a student, I can sign up with email or Google and enter a course code to immediately begin learning | P0 |
| S-02 | As a student, blocks reveal one-by-one with TTS narration so I follow the tutor's pace | P0 |
| S-03 | As a student, I can run code in the Monaco editor and get immediate feedback on whether my solution is correct | P0 |
| S-04 | As a student, I get Socratic hints when my code fails — hints that guide me without giving away the answer | P0 |
| S-05 | As a student, I can ask any question about the lesson material and get a real-time, context-aware AI answer | P0 |
| S-06 | As a student, I must pass the understanding check to advance to the next lesson, ensuring I actually understood | P0 |
| S-07 | As a student, I can click any past block to review it without losing my place, then return to the current block | P1 |
| S-08 | As a student, I can see my overall course progress in a slide-out panel at any time | P1 |
| S-09 | As a student, I can control TTS narration (play/pause, speed, auto-continue) to match my learning style | P1 |
| S-10 | As a student, my progress is saved automatically so I can resume exactly where I left off | P0 |

---

## 5. Product Scope

### 5.1 In V1 Scope

| Feature | Description |
|---|---|
| **Creator authoring wizard** | 3-step: PDF upload → configure → generate |
| **Async generation pipeline** | Extract → embed → outline → blocks → TTS |
| **Preview mode** | Creator walks through tutor as student, without saving progress |
| **Publish & share** | 6-char course code; `/join/{code}` auto-enroll link |
| **Lesson regeneration** | Re-generate individual lessons with refined prompt |
| **Student dashboard** | Enrolled courses with progress |
| **2-pane tutor UI** | Left: block feed. Right: dynamic workspace |
| **5 block types** | Markdown, Code+Terminal, Mermaid, ConceptCheck, UnderstandingCheck |
| **TTS narration** | Pre-generated OpenAI TTS, played per block |
| **Monaco code editor** | Syntax-highlighted editor with Judge0 execution |
| **Socratic hint** | AI-streamed hint on code failure — never reveals answer |
| **Ask Anything** | SSE-streamed RAG-backed Q&A anchored to course material |
| **Understanding Check** | LLM evaluation against rubric; Socratic loop until threshold met |
| **Lesson gating** | Next Lesson only unlocks after understanding check is passed |
| **Click-to-jump** | Navigate past blocks; right pane re-derives |
| **Course Progress slide-out** | Curriculum tree with per-lesson progress bars |
| **Clerk auth** | Email + social login (Google) |
| **Progress persistence** | Bookmark via `block_progress` table |

### 5.2 Explicitly Out of V1 Scope

| Feature | Target Version |
|---|---|
| Engine B — Code Auto-Grader (assignments) | V2 |
| Engine C — Voice Mock Interview | V3 |
| Multi-creator accounts | V2 |
| Invite-link infrastructure | V2 |
| Block-level editing / drag-and-drop | V2 |
| Scroll-sync time machine | V2 |
| Microphone / voice input | V2 |
| Notes panel | V2 |
| Adaptive lessons / student profiling | V2/V3 |
| Mobile responsive design | V2 |
| Multi-language UI (i18n) | V2 |
| LangGraph / LangChain / LlamaIndex | V2/V3 |
| Scanned PDF / OCR support | V2 |
| Analytics dashboards (Grafana, PostHog) | V2 |

---

## 6. Feature Requirements

### 6.1 Authentication & User Management

**REQ-AUTH-01:** Users must authenticate via Clerk (email/password or Google OAuth).  
**REQ-AUTH-02:** On first sign-in, the system lazily provisions a `users` row synced from Clerk.  
**REQ-AUTH-03:** Creator role is assigned via SQL (`users.role = 'creator'`) on the founder's account. All other accounts default to `student`.  
**REQ-AUTH-04:** Clerk webhooks (`user.created`, `user.updated`) keep `email` and `display_name` in sync.  
**REQ-AUTH-05:** Backend validates Clerk JWTs on every request. All protected routes require a valid JWT.  

### 6.2 Course Authoring

**REQ-AUTH-10:** PDF must be ≤10 MB and `.pdf` format only.  
**REQ-AUTH-11:** System must reject PDFs with no extractable text (scanned/image-only), returning a clear error.  
**REQ-AUTH-12:** Creator must provide a course title. Description, default language, and custom prompt are optional.  
**REQ-AUTH-13:** Generation must be non-blocking — the creator is redirected to a status page immediately after trigger.  
**REQ-AUTH-14:** Status page must poll `/api/courses/{id}/status` every 3 seconds and display the current pipeline phase.  
**REQ-AUTH-15:** Generation phases must be exposed: `extracting_pdf` → `embedding` → `generating_outline` → `generating_lesson_{n}` → `generating_audio` → `ready`.  
**REQ-AUTH-16:** Generation must complete within 10 minutes for a typical 30-page PDF course (5 lessons, ~10 blocks each).  
**REQ-AUTH-17:** If a per-lesson generation fails, only that lesson is marked `failed`; other lessons remain `ready`. Creator can re-trigger lesson regeneration.  
**REQ-AUTH-18:** Creator can regenerate any lesson with an optional refined prompt; doing so deletes that lesson's blocks, audio, and student progress (cascade).  

### 6.3 Preview Mode

**REQ-PREVIEW-01:** Creator can access `/courses/{id}/preview` when `status = 'ready'`.  
**REQ-PREVIEW-02:** Preview mode is visually identical to the student tutor view, plus a persistent "PREVIEW MODE" banner.  
**REQ-PREVIEW-03:** All AI interactions (run code, ask question, concept check, understanding check) function in preview mode.  
**REQ-PREVIEW-04:** Preview mode must NOT write `block_progress`, `code_submissions`, `concept_check_attempts`, or `understanding_check_attempts`.  

### 6.4 Publish & Enrollment

**REQ-PUB-01:** Creator can publish a course only when `status = 'ready'`.  
**REQ-PUB-02:** Publishing generates a unique 6-character alphanumeric code (e.g., `BCKND1`). Collision retry up to 5 times.  
**REQ-PUB-03:** `/join/{code}` is a public URL. Unauthenticated users are redirected to sign-up first, then auto-enrolled.  
**REQ-PUB-04:** Students can manually enter a course code on their dashboard to enroll.  
**REQ-PUB-05:** Enrollment is idempotent — re-entering a code for an already-enrolled course navigates to that course.  

### 6.5 Tutor Experience — Layout & Navigation

**REQ-TUTOR-01:** The tutor is a 2-pane layout: Left (~38%) = block feed; Right (~62%) = dynamic workspace.  
**REQ-TUTOR-02:** A sticky top header shows: course breadcrumb, lesson title, audio controls (play/pause, speed, auto-continue), exit button.  
**REQ-TUTOR-03:** A sticky bottom footer on the left pane contains the "Ask Anything" input.  
**REQ-TUTOR-04:** An edge navigation strip provides: Course Progress slide-out trigger, audio settings, exit.  
**REQ-TUTOR-05:** On page load, blocks are revealed up to the student's saved bookmark. The bookmark block is the active block.  

### 6.6 Block Reveal & Continue

**REQ-REVEAL-01:** Clicking "Continue" reveals the next block with a fade-in animation.  
**REQ-REVEAL-02:** The TTS audio for the revealed block auto-plays (requires a prior user gesture per browser autoplay policy).  
**REQ-REVEAL-03:** The right pane updates only when the new block is `code` (→ Monaco + terminal) or `mermaid` (→ diagram). All other types leave the workspace unchanged.  
**REQ-REVEAL-04:** "Continue" is enabled automatically for `markdown` and `mermaid` blocks.  
**REQ-REVEAL-05:** "Continue" is enabled for `concept_check` blocks after the student answers (one-shot, regardless of correctness).  
**REQ-REVEAL-06:** "Continue" is disabled for `code` blocks until the student's submission receives a `passed` verdict.  
**REQ-REVEAL-07:** "Continue" / "Next Lesson" is disabled for `understanding_check` blocks until the student's response meets the rubric threshold.  
**REQ-REVEAL-08:** The Continue button shows the number of unrevealed blocks remaining (e.g., "Continue (3)").  
**REQ-REVEAL-09:** "Auto Continue" toggle: when enabled, audio end → Continue fires automatically (DataCamp paradigm).  

### 6.7 Block Types — Rendering Requirements

**REQ-BLOCK-MD-01:** `markdown` blocks render in the left pane using standard Markdown + code syntax highlighting.  

**REQ-BLOCK-CODE-01:** `code` blocks show the instruction text + "Code Exercise" badge in the left pane.  
**REQ-BLOCK-CODE-02:** The right pane shows a Monaco editor pre-filled with `starter_code`, language set to `block.content.language`.  
**REQ-BLOCK-CODE-03:** "Run" button (and `Ctrl+Enter`) submits the current editor content to `/api/blocks/{id}/run`.  
**REQ-BLOCK-CODE-04:** On pass: green check UI in terminal; Continue enables.  
**REQ-BLOCK-CODE-05:** On fail: red ✗ UI in terminal; frontend immediately calls `/api/blocks/{id}/socratic-hint` and streams the hint inline.  
**REQ-BLOCK-CODE-06:** After 3+ failed attempts, Socratic hints escalate to offering an analogous simpler example. **Never the answer.**  

**REQ-BLOCK-MERM-01:** `mermaid` blocks show the instruction text in the left pane.  
**REQ-BLOCK-MERM-02:** The right pane renders the Mermaid SVG. Invalid syntax shows an error placeholder.  

**REQ-BLOCK-CC-01:** `concept_check` blocks show the question + Yes/No (or option) buttons.  
**REQ-BLOCK-CC-02:** On answer, the pre-generated explanation (correct or wrong) renders below. Continue enables.  
**REQ-BLOCK-CC-03:** No retry. No live LLM call. Explanations are pre-generated at course creation.  

**REQ-BLOCK-UC-01:** `understanding_check` blocks show the prompt and a textarea.  
**REQ-BLOCK-UC-02:** Submission sends the response to `/api/blocks/{id}/understanding-check`. The LLM evaluates against the rubric.  
**REQ-BLOCK-UC-03:** If `level ≥ threshold`, AI replies encouragingly and "Next Lesson" enables.  
**REQ-BLOCK-UC-04:** If `level < threshold`, AI streams Socratic feedback. Textarea re-enables for revision. Loop continues.  
**REQ-BLOCK-UC-05:** **No skip. No give-up.** Lesson is gated until the rubric threshold is met.  

### 6.8 Ask Anything

**REQ-ASK-01:** The footer input is always visible and accepts free-form questions.  
**REQ-ASK-02:** Submitted questions appear as styled bubbles in the block feed (visually distinct from lesson blocks).  
**REQ-ASK-03:** Answers stream via SSE and render incrementally below the question bubble.  
**REQ-ASK-04:** Answering does not interrupt lesson flow — the student can keep clicking Continue during streaming.  
**REQ-ASK-05:** Answers are grounded in course material (top-5 RAG chunks) + current-block context.  

### 6.9 TTS Narration

**REQ-TTS-01:** Each text-bearing block has a `tts_audio_url` (pre-generated at course creation via OpenAI TTS).  
**REQ-TTS-02:** Audio auto-plays when a block becomes active (after a prior user gesture).  
**REQ-TTS-03:** Header controls: play/pause, seek, speed (0.5×–1.5×), volume.  
**REQ-TTS-04:** If `tts_audio_url` is null or 404, the lesson continues text-only without error.  

### 6.10 Progress & Navigation

**REQ-PROG-01:** `block_progress` row is written on Continue (marks block `completed`).  
**REQ-PROG-02:** Enrollment bookmark (`current_lesson_id`, `current_block_id`) is updated on Continue.  
**REQ-PROG-03:** Course Progress slide-out shows curriculum tree: all lessons, each with a progress bar (% blocks completed). Current lesson highlighted.  
**REQ-PROG-04:** Click-to-jump: clicking any past block sets it as `active_block_id`; right pane re-derives; below-active blocks fade to 60% opacity.  
**REQ-PROG-05:** "Return to current" pill appears when the student has jumped to a past block.  
**REQ-PROG-06:** On lesson completion (final `understanding_check` passed), a "Lesson Complete" card renders with a "Next Lesson" button (or "Course Complete" for the final lesson).  

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target |
|---|---|
| Course generation time (30-page PDF, 5 lessons) | 3–10 minutes |
| Ask Anything first token latency | < 2 seconds |
| Code run verdict latency (Judge0) | < 3 seconds |
| Socratic hint first token | < 2 seconds |
| Understanding check verdict | < 3 seconds |
| Dashboard / course list page load | < 1 second |
| Tutor page initial load (blocks SSR) | < 2 seconds |

### 7.2 Reliability

| Metric | Target |
|---|---|
| Generation success rate | ≥ 95% |
| API uptime | ≥ 99% (single VPS; no SLA commitment in V1) |
| Error recovery | Per-lesson failures are isolated; other lessons unaffected |

### 7.3 Security

- All backend endpoints require a valid Clerk JWT (`Authorization: Bearer <token>`)
- Students can only access their own enrollments; any attempt to access another user's enrollment returns 403
- Supabase Row Level Security (RLS) is OFF in V1 (access controlled at API layer via JWT + `current_user` dependency); planned for V2
- Secrets (API keys, DB credentials) stored in environment variables; never in repository
- CORS is locked to the frontend domain only
- PDFs stored in Supabase Storage private bucket; access via signed URLs only

### 7.4 Scalability

- V1: single creator, ~20 concurrent students, single-process FastAPI + asyncio task queue
- Scaling trigger: when concurrent course generation exceeds 2 simultaneous jobs → migrate to RQ + Redis (no schema changes)
- Database: Supabase Postgres scales independently; pgvector HNSW index handles cosine search at V1 volume
- Frontend: Vercel auto-scales; no action needed

### 7.5 Cost Constraints

| Item | V1 Budget |
|---|---|
| Total monthly infrastructure | $25–50/month |
| Per-student per-course AI cost | ≤ $0.15 |
| Course generation (one-time, creator-paid) | ~$0.80 per course |

### 7.6 Accessibility (V1 Minimum)

- Keyboard-navigable Continue, Run, and Answer buttons
- Semantic HTML (headings, ARIA labels on icon buttons)
- Full audit deferred to V2

### 7.7 Browser Support

- V1: Chrome/Edge (latest 2 versions), Safari 17+, Firefox (latest 2 versions)
- Desktop only (1280px+ viewport)
- Mobile: deferred to V2

---

## 8. Pedagogical Principles

These principles are product-level constraints, not implementation suggestions. Violating them is a **bug**.

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
- Answer questions outside the course material (responses acknowledge scope limits)

### Principle 4 — Static-first, real-time only where unpredictable

The lesson script is generated once and is immutable from the student's perspective. AI re-engages live only in the four cases the script cannot predict: free-form questions, code failure, wrong concept-check answer, and understanding-check evaluation. This keeps the product fast, preview-accurate, and low-cost.

---

## 9. Success Metrics

### Primary (V1 Launch)

| Metric | Measurement | Target |
|---|---|---|
| First student enrolled | Within 24h of first publish | ✓ |
| Generation success rate | % courses completing pipeline | ≥ 95% |
| Lesson completion rate | Students who complete all blocks per lesson | ≥ 70% |
| Course completion rate | Students who pass all lessons | ≥ 60% |
| Understanding check pass rate | % submissions meeting rubric threshold | ≥ 70% |
| Code exercise success rate | % students who eventually pass each code block | ≥ 80% |

### Cost & Operational

| Metric | Measurement | Target |
|---|---|---|
| Per-student AI cost | LLM + TTS per enrolled student | ≤ $0.15 |
| Monthly infra cost | Total cloud spend | ≤ $50 |
| Generation time | Time from trigger to `ready` | ≤ 10 min |

### Deferred to V2

- NPS / qualitative feedback
- Time-on-task analytics
- Per-block difficulty scoring
- A/B testing framework

---

## 10. Constraints & Assumptions

### Constraints

- **Solo builder:** All V1 development done by one person. 8-week timeline.
- **Single creator:** Only the founder has creator role in V1. Multi-creator is V2.
- **Desktop only:** Mobile responsive layout is V2.
- **English only:** UI and generated content in English. i18n is V2.
- **Text PDFs only:** Scanned/image PDFs not supported. OCR is V2.
- **No block editing:** Creator can only regenerate entire lessons, not individual blocks.
- **Judge0 free tier:** 50 code executions/day free; must upgrade if volume exceeds this.
- **Supabase free tier:** 500 MB DB, 1 GB storage. Sufficient for V1 with ~20 students.

### Assumptions

- Students have basic familiarity with web apps and can sign up with email or Google
- PDFs contain primarily text (not images/figures); embedded code blocks are extracted as text
- Founder's classmates are the initial user cohort (~5–20 students)
- Claude Sonnet is the correct quality/cost balance for generation; Haiku considered for high-frequency Socratic hints (to be validated in Week 4–5)
- OpenAI TTS `alloy` voice is acceptable for all courses in V1
- Vercel hobby plan is sufficient for frontend traffic at V1 scale
- Single VPS (Hetzner CX22 or DigitalOcean Basic) is sufficient for FastAPI + generation workload at V1 scale

---

## 11. Open Questions

| # | Question | Impact | Resolution Target |
|---|---|---|---|
| OQ-01 | Sonnet for all AI tasks vs. Haiku for Socratic hints? | Cost reduction potential | Week 4–5 (quality measurement) |
| OQ-02 | Single TTS voice (`alloy`) or per-course override? | Creator experience | V1: single voice; V2 override |
| OQ-03 | Free-form custom prompt vs. structured fields (audience, difficulty)? | Creator UX | V1: free-form; V2: structured if patterns emerge |
| OQ-04 | Mermaid syntax validation — server-side at generation? | Student experience (no broken diagrams) | Week 3 |
| OQ-05 | TTS batch parallelism — semaphore limit? | Generation speed | Week 2 (asyncio.gather with semaphore=5) |
| OQ-06 | Embedding model: Anthropic voyage-3 vs. OpenAI text-embedding-3-small? | RAG quality | End of Week 2 (retrieval quality test) |
| OQ-07 | Questions log retention — keep forever vs. 90-day TTL? | Storage cost | V1: keep forever |
| OQ-08 | Concept check retry — allow or one-shot? | Pedagogy | Confirmed one-shot in V1 |

---

*This PRD is the authoritative product specification for V1. Implementation decisions not covered here should default to the architectural principles in `docs/architecture/` and the design spec in `docs/superpowers/specs/`.*
