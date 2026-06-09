import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await requireUser();
  const { courseId } = await params;
  const course = await prisma.course.findFirst({ where: { id: courseId, creatorId: user.id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ status: course.status, generation_phase: course.generationPhase, generation_error: course.generationError, total_lessons: course.totalLessons, total_blocks: course.totalBlocks });
}
