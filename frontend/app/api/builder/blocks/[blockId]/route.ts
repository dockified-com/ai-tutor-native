import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const user = await requireUser();
  const { blockId } = await params;
  const { content } = await req.json() as { content: Record<string, unknown> };
  const block = await prisma.block.findUnique({ where: { id: blockId } });
  if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lesson = await prisma.lesson.findUnique({ where: { id: block.lessonId } });
  const course = await prisma.course.findUnique({ where: { id: lesson!.courseId } });
  if (course?.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updated = await prisma.block.update({ where: { id: blockId }, data: { content: content as never } });
  return NextResponse.json({ id: updated.id, position: updated.position, type: updated.type, content: updated.content });
}
