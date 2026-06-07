# Dockified AI Native Programming Tutor — Documentation Index

> **The moat:** One creator uploads a PDF → AI generates a complete interactive course → students learn with a 1-on-1 tutor that gates progress on demonstrated understanding.

**Project Status:** V1 in active development  
**Timeline:** ~8 weeks solo, full-time  
**Stack:** Next.js 16 · FastAPI · Supabase · Anthropic Claude · Clerk · Judge0  

---

## Quick Navigation

| Doc | What it answers |
|---|---|
| [01 — PRD](product/01_prd.md) | *What* are we building and *why?* Full feature requirements. |
| [02 — Roadmap](product/02_roadmap.md) | *When* do features ship? V1 week plan + V2/V3 vision. |
| [03 — Frontend Plan](architecture/03_frontend_plan.md) | Next.js architecture, feature modules, state management, SSE. |
| [04 — Backend Plan](architecture/04_backend_plan.md) | FastAPI modules, generation pipeline, AI endpoints, Docker. |
| [05 — Database Schema](architecture/05_database_schema.md) | Full DDL, JSONB block shapes, indexes, relationships. |
| [06 — API Contracts](api/06_api_contracts.md) | Every endpoint: request, response, SSE events, types. |
| [08 — Backend Features](architecture/08_backend_features.md) | Feature-by-feature: endpoints, architecture diagrams, data models, service flows. |
| [07 — Local Setup](setup/07_local_setup.md) | Running the full stack locally in under 10 minutes. |
| [Design Spec](superpowers/specs/2026-05-30-ai-native-tutor-design.md) | Original source-of-truth design document. |

---

## The Core Loop (30-second summary)

```
Creator:  PDF upload → AI generates lesson → preview → publish → share 6-char code
                                ↓
Student:  Enter code → 2-pane tutor → reveal blocks → TTS narration
                                ↓
    [code block]  → Monaco editor → Run → Judge0 → fail? → Socratic hint → retry
    [ask footer]  → RAG + Claude → SSE streamed answer
    [concept chk] → pick answer → pre-generated explanation → Continue
    [underst. chk] → write response → Claude evaluates → pass? → Next Lesson
                                                         ↗ fail? → Socratic loop
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth | Clerk | Managed sign-in UI, social login, JWT issuance, webhooks out of the box |
| LLM | Anthropic Claude Sonnet | Best code + explanation quality at acceptable cost |
| Code execution | Judge0 (RapidAPI) | 60+ languages, sandboxed, no infra |
| DB | Supabase Postgres + pgvector | Managed, includes Storage for PDFs/audio, pgvector for RAG |
| Block schema | JSONB content column | Zero migrations to add new block types |
| State (frontend) | Zustand | Minimal boilerplate, no Provider hell |
| Streaming | Native SSE (EventSource) | No WebSocket overhead; unidirectional AI → client |
| Module boundaries | Feature-Sliced Design | Prevents cross-feature spaghetti; feature extraction-ready |
| Background jobs | asyncio.Queue (V1) | No Redis/Celery overhead for single-creator V1 |
| Deployment | Vercel (frontend) + Hetzner VPS (backend) | $25–50/mo total |

---

## Pedagogical Non-Negotiables

These are **product constraints**, not implementation details. Violating them is a bug.

1. **Gate on understanding:** Lesson N+1 is locked until the understanding check passes. No skip.
2. **Never reveal answers:** Socratic hints guide. They never show solution code. Tested automatically.
3. **AI is a tutor, not a bypass:** "Ask Anything" answers questions; it doesn't complete exercises.
4. **Static-first:** Lesson scripts are pre-generated and frozen. AI re-engages live only for 4 unpredictable student actions.

---

## Directory Layout

```
docs/
├── README.md                          ← You are here
├── product/
│   ├── 01_prd.md                      ← Product Requirements Document
│   └── 02_roadmap.md                  ← V1 → V2 → V3 roadmap
├── architecture/
│   ├── 03_frontend_plan.md            ← Next.js architecture
│   ├── 04_backend_plan.md             ← FastAPI architecture + generation pipeline
│   ├── 05_database_schema.md          ← Full DDL + relationships
│   └── 08_backend_features.md         ← Feature endpoints, diagrams, data models
├── api/
│   └── 06_api_contracts.md            ← All endpoint specs
├── setup/
│   └── 07_local_setup.md              ← Local dev setup guide
└── superpowers/
    └── specs/
        └── 2026-05-30-ai-native-tutor-design.md  ← Original design spec
```

---

## V1 In/Out Scope (Quick Reference)

### In V1

✅ Single creator authoring wizard (PDF → AI → course)  
✅ Async generation pipeline with real-time status  
✅ 5 SDUI block types: Markdown, Code, Mermaid, ConceptCheck, UnderstandingCheck  
✅ TTS narration (OpenAI, pre-generated)  
✅ 2-pane tutor: block feed (left) + dynamic workspace (right)  
✅ Monaco editor + Judge0 code execution  
✅ Socratic hints on code failure (never reveals answer)  
✅ RAG-powered Ask Anything (SSE)  
✅ Understanding check Socratic loop  
✅ Lesson gating by demonstrated understanding  
✅ Course Progress slide-out  
✅ Preview mode (creator, no progress saved)  
✅ Publish + 6-char course code  
✅ `/join/{code}` public enrollment URL  
✅ Clerk auth (email + Google)  
✅ Progress persistence + bookmark resume  

### Deferred to V2+

❌ Engine B — Code Auto-Grader (assignments)  
❌ Engine C — Voice Mock Interview  
❌ Multi-creator accounts + invite links  
❌ Block-level editing  
❌ Mobile responsive UI  
❌ Scanned PDF / OCR  
❌ Multi-language UI  
❌ LangGraph / LlamaIndex  
❌ Analytics dashboards  
❌ Notes panel  

---

## Cost Model

| Item | Cost |
|---|---|
| Course generation (creator, one-time) | ~$0.80/course |
| Per-student per-course (Ask + hints + eval) | ~$0.10–0.15 |
| Monthly infra (V1) | ~$25–50/mo |

---

## V1 Timeline (8 Weeks)

| Week | Milestone |
|---|---|
| 1 | Auth + dashboard + wizard + Supabase + Docker/Caddy on VPS |
| 2 | Generation pipeline: PDF → embed → outline → blocks → TTS |
| 3 | Tutor UI: 2-pane, markdown + mermaid + concept_check |
| 4 | Monaco + Judge0 + /run + /socratic-hint |
| 5 | /ask (RAG + SSE) + /understanding-check + lesson gating |
| 6 | TTS playback + Auto-Continue + Course Progress slide-out |
| 7 | Preview mode + Publish + /join + polish |
| 8 | Tests + production deploy + first student onboarded |

---

*For questions about any decision, start with the [Design Spec](superpowers/specs/2026-05-30-ai-native-tutor-design.md). It contains the full reasoning behind every architectural choice.*
