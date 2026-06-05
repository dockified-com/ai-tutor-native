# Week 2B - Shared Infrastructure: Execution Plan

## Group 1: Sequential Base Setup (Main Agent)
To avoid merge conflicts and ensure core utilities are available, the foundational components will be implemented sequentially.
1. **Config Update**: Update `app/shared/config.py` with required keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `JUDGE0_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`).
2. **Error Hierarchy**: Implement `app/shared/errors.py` (`APIError`, `NotFoundError`, `ForbiddenError`, `GenerationError`) and register the exception handler in `app/main.py`.
3. **CORS Middleware**: Add CORS middleware to `app/main.py` locked to `FRONTEND_URL`.
4. **Retry Utility**: Implement `app/shared/utils/retry.py` with an asynchronous exponential backoff utility.

## Group 2: Parallel Implementations (Subagents)
Once the base is set up, the following independent tasks will be executed concurrently using subagents.
1. **Anthropic Client**: Create `app/shared/ai/anthropic_client.py` with a singleton `AsyncAnthropic` client. *(Task for Subagent 1)*
2. **OpenAI Client**: Create `app/shared/ai/openai_client.py` with an `AsyncOpenAI` client. *(Task for Subagent 2)*
3. **Judge0 Client**: Create `app/shared/ai/judge0_client.py` implementing `execute_code()` via httpx, a `Judge0Result` Pydantic model, and a `LANGUAGE_IDS` map. *(Task for Subagent 3)*
4. **RAG Retriever**: Create `app/shared/rag/retriever.py` with `embed()` and `retrieve()` operations for pgvector top-k. *(Task for Subagent 4)*

## Group 3: Integration & Testing (Main Agent)
1. **Review Subagent Work**: Validate the work committed by the subagents.
2. **Unit Tests**: Implement unit tests for `retry_async()` and the initialization of the various AI clients.
3. **App Startup**: Verify that the application boots properly.
4. **Tracker Update**: Mark the Week 2B tasks as complete in `backend/context/4-progress-tracker.md`.
