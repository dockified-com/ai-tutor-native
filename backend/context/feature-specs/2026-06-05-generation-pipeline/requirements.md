# Requirements: Generation Pipeline (Week 2C)

## Context & Scope
The Generation Pipeline is the core feature of the AI Native Programming Tutor backend. It is responsible for taking an uploaded PDF (from a creator) and turning it into a complete, interactive course. The generation process must be robust, asynchronous, and complete within 10 minutes. 

## Architectural Decisions
1. **Async Pipeline:** We will execute an async generation pipeline: `PDF extract -> embed -> outline -> blocks -> TTS`.
2. **Direct AI SDKs:** We will use the direct `Anthropic SDK` (for outline/blocks generation) and `OpenAI SDK` (for TTS). LangChain/LlamaIndex are strictly prohibited in V1.
3. **Storage:** We will store vectorized course chunks using `pgvector`.
4. **Error Handling & Resilience:**
   - PDF extraction empty: Reject at upload (400 "OCR not supported in V1").
   - Embedding API timeout: Retry ×3 with exponential backoff; then `course.status = 'failed'`.
   - Outline LLM call fails: Retry ×2; on failure, course marked `failed`.
   - Per-lesson generation fails: Mark only that `lesson.status = 'failed'`, other lessons unaffected.
   - TTS API fails: `tts_audio_url = null`, course still publishable; audio degrades silently.
5. **Data Transfer Objects (Schemas):** Pydantic v2 `model_validate()` will be used at module boundaries. The `LessonBlocks` schema requires a `@model_validator` to assert the last block is an `understanding_check`.

## Context References
- `backend/context/5-roadmap.md` (Phase 4 — Week 2C: Generation Pipeline)
- `backend/context/3-ai-workflow.md` (AI Workflow Guardrails and Rules)
- `backend/context/1-mission.md` (Mission and V1 Goals)
