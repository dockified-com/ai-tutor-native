import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await requireUser();
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const course = await prisma.course.findUnique({ where: { id: lesson.courseId } });
  const blocks = await prisma.block.findMany({ where: { lessonId }, orderBy: { position: "asc" } });
  return NextResponse.json({
    id: lesson.id, title: lesson.title, status: lesson.status, course_id: lesson.courseId,
    is_owner: course?.creatorId === user.id,
    blocks: blocks.map(b => ({ id: b.id, position: b.position, type: b.type, content: b.content })),
  });
}
