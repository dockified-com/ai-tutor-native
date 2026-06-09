import "server-only";
import { prisma } from "@/shared/db/client";

// Returns {id, content} for a block where type='code'
export async function getCodeBlock(blockId: string) {
  return prisma.block.findFirst({ where: { id: blockId, type: "code" }, select: { id: true, content: true } });
}

// Returns block content if block's lesson belongs to the course
export async function getBlockContentScoped(blockId: string, courseId: string) {
  const block = await prisma.block.findFirst({
    where: { id: blockId },
    select: { lessonId: true, content: true },
  });
  if (!block) return null;
  const lesson = await prisma.lesson.findFirst({
    where: { id: block.lessonId, courseId },
    select: { id: true },
  });
  return lesson ? block.content : null;
}

// Returns content.evaluation_rubric for an understanding_check block scoped to course
export async function getUnderstandingBlock(blockId: string, courseId: string) {
  const block = await prisma.block.findFirst({
    where: { id: blockId, type: "understanding_check" },
    select: { lessonId: true, content: true },
  });
  if (!block) return null;
  const lesson = await prisma.lesson.findFirst({
    where: { id: block.lessonId, courseId },
    select: { id: true },
  });
  if (!lesson) return null;
  return (block.content as Record<string, unknown>).evaluation_rubric as string | undefined ?? null;
}

export async function countCodeSubmissions(enrollmentId: string, blockId: string) {
  return prisma.codeSubmission.count({ where: { enrollmentId, blockId } });
}

export async function getLastCodeSubmission(enrollmentId: string, blockId: string) {
  return prisma.codeSubmission.findFirst({
    where: { enrollmentId, blockId },
    orderBy: { attemptNumber: "desc" },
  });
}

export async function insertCodeSubmission(data: {
  enrollmentId: string; blockId: string; code: string; language: string;
  stdout?: string | null; stderr?: string | null; verdict?: string | null; attemptNumber: number;
}) {
  return prisma.codeSubmission.create({ data });
}

export async function countUnderstandingAttempts(enrollmentId: string, blockId: string) {
  return prisma.understandingCheckAttempt.count({ where: { enrollmentId, blockId } });
}

export async function insertUnderstandingAttempt(data: {
  enrollmentId: string; blockId: string; response: string; level: string;
  feedback: string; passed: boolean; missingPoints?: string[]; attemptNumber: number;
}) {
  return prisma.understandingCheckAttempt.create({ data: { ...data, missingPoints: data.missingPoints ?? [] } });
}

export async function insertQuestion(data: {
  enrollmentId: string; blockId?: string | null; questionText: string;
  answerText?: string | null; sourceChunks?: unknown;
}) {
  return prisma.question.create({ data: { ...data, sourceChunks: data.sourceChunks ?? undefined } });
}

// Returns blocks for a lesson ordered by position
export async function getLessonBlocks(lessonId: string) {
  return prisma.block.findMany({ where: { lessonId }, orderBy: { position: "asc" } });
}

// Updates only the content field of a block (keeps id, position, type)
export async function updateBlockContent(blockId: string, content: Record<string, unknown>) {
  return prisma.block.update({ where: { id: blockId }, data: { content: content as never } });
}