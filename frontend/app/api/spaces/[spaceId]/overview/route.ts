import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const user = await requireUser();
  const { spaceId } = await params;
  const course = await prisma.course.findUnique({ where: { id: spaceId } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lessons = await prisma.lesson.findMany({ where: { courseId: spaceId }, orderBy: { position: "asc" } });
  const blockCounts = await prisma.block.groupBy({ by: ["lessonId"], _count: { id: true }, where: { lessonId: { in: lessons.map(l => l.id) } } });
  const countMap = Object.fromEntries(blockCounts.map(b => [b.lessonId, b._count.id]));
  return NextResponse.json({
    id: course.id, title: course.title, description: course.description,
    is_owner: course.creatorId === user.id,
    categories: lessons.map(l => ({ id: l.id, position: l.position, title: l.title, description: l.summary ?? null, block_count: countMap[l.id] ?? 0 })),
  });
}
