import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const user = await requireUser();
  const { spaceId } = await params;
  const { name, description } = await req.json() as { name: string; description?: string };
  const course = await prisma.course.findUnique({ where: { id: spaceId } });
  if (!course || course.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const maxPos = await prisma.lesson.aggregate({ where: { courseId: spaceId }, _max: { position: true } });
  const lesson = await prisma.lesson.create({ data: { courseId: spaceId, position: (maxPos._max.position ?? 0) + 1, title: name, summary: description ?? null, objectives: [] } });
  return NextResponse.json({ id: lesson.id, position: lesson.position, title: lesson.title, description: lesson.summary ?? null, block_count: 0 }, { status: 201 });
}
