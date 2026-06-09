import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await requireUser();
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const course = await prisma.course.findUnique({ where: { id: lesson.courseId } });
  if (course?.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updated = await prisma.lesson.update({ where: { id: lessonId }, data: { status: "ready" } });
  return NextResponse.json({ id: updated.id, status: updated.status });
}
