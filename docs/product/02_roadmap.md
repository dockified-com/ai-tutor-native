# Product Roadmap
# Dockified — AI Native Programming Tutor

**Last Updated:** 2026-05-30  
**Horizon:** V1 (now) → V2 (Q3 2026) → V3 (Q4 2026 / Q1 2027)  

---

## Roadmap Philosophy

> **Additive, not disruptive.** Every version adds capabilities to a stable foundation. No V1 code is rewritten to land V2 features. Every V2 feature is isolated to a new module.

The seams that make this possible — feature-isolated modules, JSONB block schema, SDUI block types, single Supabase backbone — are baked into V1's architecture. Each version adds engines and features alongside V1; V1 continues to run unchanged.

---

## V1 — AI Native Tutor (Now · ~8 Weeks)

**Theme:** Prove the core loop. One creator, one cohort, end-to-end working product.

**Milestone:** First student completes a course generated from a PDF in under 10 minutes of creator effort.

### Week-by-Week Plan

| Week | Deliverable |
|---|---|
| **Week 1** | Auth (Clerk), dashboard, 3-step creation wizard, Supabase wiring, Docker + Caddy on VPS |
| **Week 2** | Generation pipeline: PDF extract → embed → outline → blocks → TTS |
| **Week 3** | Tutor UI shell — 2-pane layout, markdown + mermaid + concept_check block rendering |
| **Week 4** | Monaco editor + Judge0 code execution + `/run` + `/socratic-hint` (verify no answer leak) |
| **Week 5** | `/ask` (RAG + SSE) + `/understanding-check` + lesson gating logic |
| **Week 6** | TTS audio playback + Auto-Continue + Course Progress slide-out |
| **Week 7** | Preview mode + Publish + `/join/{code}` + UI polish |
| **Week 8** | Test suite pass + production deploy + onboard first classmate |

> Can compress to 5–6 weeks with focus. shadcn/ui eliminates days of form/dialog/dropdown UI work.

### V1 Feature Set

| Feature | Status |
|---|---|
| Clerk auth (email + Google) | Week 1 |
| PDF upload + course config wizard | Week 1 |
| Async generation pipeline | Week 2 |
| 5 SDUI block types | Weeks 2–5 |
| TTS narration (OpenAI, pre-generated) | Week 2 |
| 2-pane tutor UI | Week 3 |
| Monaco + Judge0 code runner | Week 4 |
| Socratic hints (SSE, never reveals answer) | Week 4 |
| RAG-powered Ask Anything (SSE) | Week 5 |
| Understanding Check + Socratic loop | Week 5 |
| Lesson gating by demonstrated understanding | Week 5 |
| Click-to-jump navigation | Week 3 |
| Course Progress slide-out | Week 6 |
| Auto-Continue (audio-end trigger) | Week 6 |
| Preview mode (no progress written) | Week 7 |
| Publish + 6-char code | Week 7 |
| `/join/{code}` public enroll URL | Week 7 |
| Lesson regeneration with refined prompt | Week 7 |

### V1 Infrastructure

| Component | Choice | Cost |
|---|---|---|
| Frontend | Next.js 16 on Vercel Hobby | $0 |
| Backend | FastAPI in Docker, Hetzner CX22 VPS | $5–10/mo |
| Reverse proxy + SSL | Caddy (auto Let's Encrypt) | $0 |
| Auth | Clerk Free (~10K MAU) | $0 |
| DB + Storage | Supabase Free | $0 |
| LLM | Anthropic Claude Sonnet | ~$10–20/mo |
| TTS | OpenAI TTS | ~$5/mo |
| Code execution | Judge0 RapidAPI Basic | $0 (50/day free) |
| Error tracking | Sentry Developer | $0 |
| CI/CD | GitHub Actions + GHCR | $0 |
| **Total** | | **~$25–50/mo** |

---

## V2 — Scale & Depth (Q3 2026 · ~12 Weeks)

**Theme:** Open to other creators. Richer interactions. Data-driven improvement.

**Trigger:** 3+ creators express intent to use the platform; or first cohort shows >60% completion rate (product-market signal).

### Creator Experience

| Feature | Module | Notes |
|---|---|---|
| Multi-creator accounts | `features/auth/` | Lift single-creator assertion; `users.role = 'creator'` becomes self-serve |
| Invite-link system | `features/enrollment/` | Per-course invite links (not just public codes) |
| Block-level editing | `features/authoring/` | Edit individual block content; drag-and-drop reorder |
| Scanned PDF (OCR) | `features/authoring/` | pdfplumber → fallback to Tesseract/Google Vision |
| Per-course TTS voice selection | `features/authoring/` | Creator picks from OpenAI voice options |
| Structured custom prompt fields | `features/authoring/` | Audience, difficulty level, preferred examples |

### Student Experience

| Feature | Module | Notes |
|---|---|---|
| Mobile responsive UI | Frontend-wide | Breakpoints for tablet + phone |
| Notes panel (My Notes + AI cheat sheet) | `features/notes/` | New module; `notes` table added |
| Concept check retry option | `features/tutor/` | V2 pedagogy refinement based on V1 data |
| Microphone input for Ask Anything | `features/tutor/` | Browser ASR or OpenAI Whisper STT |
| Multi-language UI (i18n) | `shared/i18n/` | React-intl; generation prompts augmented |

### Engine B — Code Auto-Grader

| Feature | Module | Notes |
|---|---|---|
| Assignment creation by creator | `features/grading/` | Creator defines problem + rubric + test cases |
| Student assignment submission | `features/grading/` | Judge0 + AI eval |
| Auto-grading pipeline | `features/grading/` | Reuses Judge0 + AI eval modules from V1 |
| Grade dashboard for creator | `features/grading/` | Per-student submission history and scores |

*Module is fully isolated from V1 tutor features. No V1 changes needed.*

### AI / RAG Improvements

| Feature | Notes |
|---|---|
| LlamaIndex hierarchical retrieval | Replaces naive top-k retrieval inside `/ask`; embeddings stay in pgvector |
| Query rewriting | LLM reformulates student questions before embedding for better retrieval |
| Hybrid BM25 + vector retrieval | Combines keyword and semantic search |
| LangGraph Socratic state machine | Multi-step Socratic dialogue with explicit state; replaces single-shot hint |

### Observability & Analytics

| Feature | Notes |
|---|---|
| PostHog analytics | Per-block engagement, time-on-task, drop-off rates |
| Grafana dashboards | Generation success rates, p50/p95 latency, Judge0 success rate |
| Adaptive difficulty signals | Which exercises cause the most failures? (data for V3 adaptive profiles) |
| Creator analytics dashboard | Per-course: enrollments, completion rate, per-lesson drop-off |

### Infrastructure Upgrades

| Component | V1 | V2 |
|---|---|---|
| Task queue | `asyncio.Queue` in-process | RQ + Redis (concurrent generation for multiple creators) |
| Auth | Clerk Free | Clerk Pro ($25/mo) as MAU grows |
| DB | Supabase Free | Supabase Pro ($25/mo) as storage grows |
| Frontend | Vercel Hobby | Vercel Pro ($20/mo) with team features |
| Supabase RLS | Off (API-layer access control) | RLS policies enabled for all tables |

---

## V3 — Personalization & Advanced Engines (Q4 2026 / Q1 2027)

**Theme:** Every student gets a lesson tailored to their knowledge level. Voice interview coaching arrives.

**Trigger:** V2 analytics show which students are struggling at which blocks. Enough data to build adaptive profiles.

### Engine C — Voice Mock Interview

| Feature | Module | Notes |
|---|---|---|
| Interview session creation | `features/interview/` | Creator defines topic + competencies |
| Voice turn-taking | `features/interview/` | Browser ASR → Whisper STT → Claude response → OpenAI TTS |
| AI interviewer persona | `features/interview/` | Configurable personality and difficulty |
| Feedback report | `features/interview/` | Competency scores, transcript, coaching notes |
| Practice session history | `features/interview/` | Student reviews past interviews |

*Uses TTS + Anthropic already wired in V1. STT (Whisper) is the only new provider.*

### Tier B — Adaptive (JIT) Lessons

| Feature | Notes |
|---|---|
| Student profiling | `student_profiles` table: language preferences, struggle topics, pace |
| JIT block generation | "Realize this block" endpoint generates blocks on-demand if profile says student is advanced (skip basic blocks) |
| Adaptive Socratic | LangGraph multi-step; hint strategy adapts to student's historical pattern |

### Tier C — Dynamic Course Generation

| Feature | Notes |
|---|---|
| Per-student lesson scripts | Full course generated fresh for each student based on their profile |
| Dynamic difficulty scaling | More/fewer code exercises based on competency signals |

*Tier C is high-cost per student; gated behind premium plan in V3.*

### Multi-tenant & Commercial

| Feature | Notes |
|---|---|
| Organization accounts | Teams of creators; shared content library |
| Student seat billing | Creator pays per enrolled student per course |
| White-label option | Custom domain, branding override for enterprise |
| API access | Third-party integrations (university LMS embed) |

---

## Feature Backlog (Unscheduled)

Features that are validated as valuable but not yet assigned to a version:

| Feature | Rationale | Blocking on |
|---|---|---|
| Scroll-sync time machine | Sync audio scrub to block position | V1 TTS infrastructure |
| Course fork / remix | Creator forks another creator's course | Multi-creator (V2) |
| Collaborative annotation | Students see each other's notes | Notes panel (V2) |
| Embedded video segments | Add video clips to lesson blocks | New block type |
| Certificate of completion | PDF/badge issued on course completion | Credentialing infrastructure |
| SCORM export | Export course for LMS embedding | Enterprise demand signal |
| Student peer review | Understanding check reviewed by another student | Scale requirement |
| Live classroom mode | Creator leads cohort through lesson in real-time | Real-time infrastructure |

---

## What We Will NOT Build

Deliberately excluded to maintain product focus:

- **General-purpose LMS** (assignments, gradebooks, attendance) — Engine B handles programming grading only
- **Video hosting** — link out to YouTube/Loom; no video upload/transcoding
- **Live video lectures** — Zoom/Meet for now; integrate only if deep demand emerges
- **Content marketplace** — V1/V2 is invite-only cohorts; public marketplace is a distinct product
- **AI content moderation** — out of scope for a closed-cohort product

---

## Dependency Map

```
V1 → V2 unlocks → V3 unlocks
─────────────────────────────
Clerk auth           Multi-creator accounts    Organization accounts
asyncio task queue   RQ + Redis                —
Judge0 + AI eval     Engine B (Auto-Grader)    —
TTS + Anthropic      Engine C prep             Engine C (Voice Interview)
RAG (naive top-k)    LlamaIndex richer RAG     Adaptive Socratic (LangGraph)
Block progress data  Analytics dashboards      Adaptive student profiles
```

---

*Roadmap is reviewed quarterly. Feature priority adjusted based on V1 cohort feedback and V2 creator demand signals.*
