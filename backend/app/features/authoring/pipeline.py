import asyncio
import io
import json
import logging
from uuid import UUID

import httpx
from pypdf import PdfReader
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.authoring.models import Block, CourseChunk, Lesson, LessonStatus
from app.features.authoring.prompts import (
    LESSON_BLOCKS_SYSTEM_PROMPT,
    OUTLINE_SYSTEM_PROMPT,
)
from app.features.authoring.schemas import LessonBlocks
from app.features.courses.models import Course, CourseStatus, GenerationPhase
from app.shared.ai.anthropic_client import anthropic_client
from app.shared.ai.openai_client import openai_client
from app.shared.db import SessionLocal
from app.shared.rag.retriever import embed
from app.shared.utils.retry import retry_async

logger = logging.getLogger(__name__)


async def run_generation_pipeline(course_id: UUID) -> None:
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(Course).where(Course.id == course_id))
            course = result.scalar_one_or_none()
            if not course:
                logger.error(f"Course {course_id} not found")
                return

            course.generation_phase = GenerationPhase.extracting
            await db.commit()

            async with httpx.AsyncClient() as client:
                response = await client.get(course.source_pdf_url)
                response.raise_for_status()
                pdf_bytes = response.content

            reader = PdfReader(io.BytesIO(pdf_bytes))
            pdf_text = "\n".join(page.extract_text() or "" for page in reader.pages)

            if not pdf_text.strip():
                course.status = CourseStatus.failed
                course.generation_error = "OCR not supported in V1"
                await db.commit()
                return

            course.generation_phase = GenerationPhase.embedding
            await db.commit()

            chunks = []
            chunk_size = 1000
            pos = 0
            while pos < len(pdf_text):
                chunk_text = pdf_text[pos:pos + chunk_size]
                if pos + chunk_size < len(pdf_text):
                    last_space = chunk_text.rfind(" ")
                    if last_space > 0:
                        chunk_text = chunk_text[:last_space]
                        advance = last_space
                    else:
                        advance = len(chunk_text)
                else:
                    advance = len(chunk_text)
                chunks.append(chunk_text)
                pos += advance

            for idx, chunk_text in enumerate(chunks):
                try:
                    embedding = await retry_async(embed, chunk_text, max_retries=3)
                except Exception as e:
                    course.status = CourseStatus.failed
                    course.generation_error = str(e)
                    await db.commit()
                    return

                course_chunk = CourseChunk(
                    course_id=course_id,
                    content=chunk_text,
                    embedding=embedding,
                    chunk_index=idx,
                )
                db.add(course_chunk)

            await db.commit()

            course.generation_phase = GenerationPhase.outline
            await db.commit()

            try:
                response = await retry_async(
                    anthropic_client.messages.create,
                    model="claude-opus-4-8",
                    max_tokens=4096,
                    system=OUTLINE_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": pdf_text[:100000]}],
                    max_retries=2,
                )
            except Exception as e:
                course.status = CourseStatus.failed
                course.generation_error = str(e)
                await db.commit()
                return

            data = json.loads(response.content[0].text)
            course.title = data["title"]
            course.description = data["description"]
            course.total_lessons = len(data["lessons"])

            for lesson_data in data["lessons"]:
                lesson = Lesson(
                    course_id=course_id,
                    position=lesson_data["position"],
                    title=lesson_data["title"],
                    summary=lesson_data.get("summary"),
                    objectives=lesson_data.get("objectives"),
                )
                db.add(lesson)

            await db.commit()

            course.generation_phase = GenerationPhase.blocks
            await db.commit()

            lessons_result = await db.execute(
                select(Lesson).where(Lesson.course_id == course_id)
            )
            lessons = list(lessons_result.scalars().all())

            semaphore = asyncio.Semaphore(5)

            async def generate_with_semaphore(lesson: Lesson):
                async with semaphore:
                    await _generate_lesson_blocks(lesson, course.title, course.description)

            results = await asyncio.gather(*[generate_with_semaphore(l) for l in lessons], return_exceptions=True)
            
            if any(isinstance(r, Exception) for r in results):
                course.status = CourseStatus.failed
                course.generation_error = "Failed to generate lesson blocks"
                course.generation_phase = None
                await db.commit()
                return

            course.generation_phase = GenerationPhase.tts
            total_blocks_result = await db.execute(
                select(Block).where(Block.lesson_id.in_([l.id for l in lessons]))
            )
            blocks = list(total_blocks_result.scalars().all())
            course.total_blocks = len(blocks)
            await db.commit()

            for block in blocks:
                if block.type == "markdown":
                    text = block.content.get("text", "")
                    if text:
                        block.tts_audio_url = await _generate_tts(text)

            await db.commit()

            course.status = CourseStatus.ready
            course.generation_phase = None
            await db.commit()
        except Exception as e:
            logger.exception(f"Error in generation pipeline for course {course_id}: {e}")
            result = await db.execute(select(Course).where(Course.id == course_id))
            course = result.scalar_one_or_none()
            if course:
                course.status = CourseStatus.failed
                course.generation_error = str(e)
                await db.commit()


async def _generate_lesson_blocks(
    lesson: Lesson, course_title: str, course_description: str | None
) -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(Lesson).where(Lesson.id == lesson.id))
        lesson = result.scalar_one()
        try:
            user_message = f"Course: {course_title}\nDescription: {course_description}\nLesson: {lesson.title}\nSummary: {lesson.summary}\nObjectives: {lesson.objectives}"

            response = await retry_async(
                anthropic_client.messages.create,
                model="claude-opus-4-8",
                max_tokens=4096,
                system=LESSON_BLOCKS_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
                max_retries=2,
            )

            data = json.loads(response.content[0].text)
            lesson_blocks = LessonBlocks.model_validate(data)

            for idx, block_data in enumerate(lesson_blocks.blocks):
                block = Block(
                    lesson_id=lesson.id,
                    position=idx,
                    type=block_data.type,
                    content=block_data.content.model_dump(),
                )
                db.add(block)

            lesson.status = LessonStatus.ready
            await db.commit()

        except Exception:
            lesson.status = LessonStatus.failed
            await db.commit()
            raise


async def regenerate_lesson_blocks(lesson_id: UUID) -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
        lesson = result.scalar_one_or_none()
        if not lesson:
            logger.error(f"Lesson {lesson_id} not found")
            return

        course_result = await db.execute(select(Course).where(Course.id == lesson.course_id))
        course = course_result.scalar_one()

        await db.execute(delete(Block).where(Block.lesson_id == lesson_id))
        await db.commit()

        await _generate_lesson_blocks(lesson, course.title, course.description)


async def _generate_tts(text: str) -> str | None:
    try:
        response = await openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text,
        )
        return response.url
    except Exception:
        return None