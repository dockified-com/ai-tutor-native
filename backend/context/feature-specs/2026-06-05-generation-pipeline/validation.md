# Validation & Success Criteria: Generation Pipeline

To consider the Generation Pipeline feature complete and ready to be merged, the following criteria must be met:

## 1. Schema & Validation Tests
- Unit tests must be written to verify that the `LessonBlocks` Pydantic model successfully rejects a block sequence if the final block is not an `understanding_check`.
- Tests must verify all block content structures are strictly validated.

## 2. Integration Tests (Mocked External Calls)
- Integration tests using `pytest-asyncio` and `httpx.AsyncClient` + `ASGITransport` must verify the complete `run_generation_pipeline` flow.
- External AI dependencies (Anthropic, OpenAI, Judge0) MUST be mocked using `pytest-mock`. Under no circumstances should real API budget be consumed during CI tests.

## 3. Error Handling Resilience
- Tests or manual verification must ensure:
  - If the mocked embedding fails repeatedly, the course status transitions to `failed`.
  - If a specific lesson's block generation fails, only that `lesson.status` transitions to `failed`, while the course and other lessons continue.
  - If TTS fails, the blocks are saved with `tts_audio_url = null` and the pipeline succeeds.
  - Code collisions during `publish_course` are automatically retried and succeed or eventually fail properly.

## 4. Endpoint Responses
- Ensure all 4 authoring endpoints return standard HTTP responses or correct offline processing statuses without exposing internal technical traces or sensitive API keys.
