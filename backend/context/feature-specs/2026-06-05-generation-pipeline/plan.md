# Implementation Plan: Generation Pipeline

This plan breaks down the implementation of the `features/authoring` module into atomic task groups. Some tasks can be executed in parallel using subagents.

## Task Group 1: Schemas & Prompts (Sequential, prerequisite)
1. **Create `authoring/schemas.py`**
   - Define all block content models (MarkdownBlock, CodeBlock, etc.)
   - Define `LessonBlocks` model with a `@model_validator` ensuring the last block is an `understanding_check`.
2. **Create `authoring/prompts.py`**
   - Write the system prompts for the outline generation.
   - Write the system prompts for the per-lesson blocks generation.

## Task Group 2: Async Pipeline & Services (Parallelizable)
*Note: We can invoke subagents to handle tasks 2A and 2B concurrently once the schemas and prompts are defined.*

1. **Task 2A: Authoring Service (`authoring/service.py`)** (Can assign to Subagent)
   - Implement `create_course(pdf_url)`
   - Implement `publish_course(course_id)` (with code collision retry max 5x)
   - Implement `regenerate_lesson(lesson_id)`
2. **Task 2B: Pipeline Orchestration (`authoring/pipeline.py`)** (Can assign to Subagent)
   - Implement `run_generation_pipeline(course_id)` as the full async orchestrator.
   - Implement PDF extraction and embedding logic.
   - Implement outline generation.
   - Implement parallel lesson generation (using `asyncio.gather` with a semaphore) to generate blocks for multiple lessons concurrently.
   - Implement batch TTS generation.

## Task Group 3: Routes & Registration (Sequential)
1. **Create `authoring/routes.py`**
   - Implement the 4 authoring endpoints (`POST /courses`, `POST /courses/{id}/publish`, `POST /lessons/{id}/regenerate`, etc.)
   - Ensure proper Clerk JWT authorization is enforced.
2. **Register Router**
   - Add the authoring router to `app/main.py`.
