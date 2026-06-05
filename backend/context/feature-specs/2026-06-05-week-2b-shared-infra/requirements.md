# Week 2B - Shared Infrastructure: Requirements

## Scope
This phase implements the shared foundational infrastructure described in Phase 3 (Week 2B) of the backend roadmap. It serves as a prerequisite for the generation pipeline and future feature implementations.

The scope includes:
- Centralized API error hierarchy.
- Global application configuration and environment variables for external services.
- Asynchronous API clients for Anthropic, OpenAI, and Judge0.
- A shared RAG (Retrieval-Augmented Generation) retriever interacting with pgvector.
- Reusable asynchronous retry utilities.
- Standard CORS middleware implementation.

## Context & Decisions
- **Implementation Strategy**: We will strictly follow the provided Phase 3 roadmap. Complex implementations should be avoided in favor of standard, proven patterns.
- **CORS**: Standard CORS middleware will be used, locking requests to the `FRONTEND_URL` specified in the configuration.
- **Error Handling**: Implement a simple, standard `APIError` hierarchy rather than overly complex logging and error reporting mechanisms for now.
- **AI Clients**: All AI and external clients must be instantiated as singletons or provide standard asynchronous interfaces for reuse across the codebase.

## File Modifications
**Expected New Files:**
- `app/shared/errors.py`
- `app/shared/ai/anthropic_client.py`
- `app/shared/ai/openai_client.py`
- `app/shared/ai/judge0_client.py`
- `app/shared/rag/retriever.py`
- `app/shared/utils/retry.py`

**Expected Modifications:**
- `app/config.py` / `app/shared/config.py` (Add new environment variables)
- `app/main.py` (Register CORS and Exception Handler)

## Subagent Instructions

When delegating tasks to subagents for parallel execution, provide them with the following explicit instructions to ensure they stay within scope:

### 1. Anthropic Client
**Goal:** Create a simple singleton `AsyncAnthropic` client in `app/shared/ai/anthropic_client.py`.
**Instructions:** 
- Initialize the client using `ANTHROPIC_API_KEY` from `app/shared/config.py`.
- Do not implement complex token logic, wrapper functions, or default models.
- Just expose the instantiated async client for other services to import and use.

### 2. OpenAI Client
**Goal:** Create a simple singleton `AsyncOpenAI` client in `app/shared/ai/openai_client.py`.
**Instructions:**
- Initialize the client using `OPENAI_API_KEY` from `app/shared/config.py`.
- Do not implement complex wrappers or enforce default models.
- Just expose the instantiated async client for other services to import and use.

### 3. Judge0 Client
**Goal:** Implement a code execution client in `app/shared/ai/judge0_client.py`.
**Instructions:**
- Use the `httpx` library to create an async `execute_code(code: str, language: str)` function.
- The function should make a request to the Judge0 API, wait synchronously (poll) for the result, and return it.
- Implement a `LANGUAGE_IDS` dictionary mapping basic language strings (e.g., 'python', 'javascript') to their respective Judge0 IDs.
- Define and return a `Judge0Result` Pydantic model containing the stdout, stderr, and status.

### 4. RAG Retriever
**Goal:** Implement vector embedding and retrieval functions in `app/shared/rag/retriever.py`.
**Instructions:**
- Create an `embed(text: str)` function using OpenAI's `text-embedding-3-small` model.
- Create a `retrieve(query: str, db: AsyncSession, top_k: int = 5)` function that uses pgvector to query against the `CourseChunk` table. Callers must pass the database session explicitly rather than relying on FastAPI dependency injection.
- Ensure the retrieval function is properly typed and returns the matching chunk records.
