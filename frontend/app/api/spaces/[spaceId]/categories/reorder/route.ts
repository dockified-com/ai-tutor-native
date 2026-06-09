import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const user = await requireUser();
  const { spaceId } = await params;
  const course = await prisma.course.findUnique({ where: { id: spaceId } });
  if (!course || course.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { ordered_ids } = await req.json() as { ordered_ids: string[] };
  await Promise.all(ordered_ids.map((id, i) => prisma.lesson.updateMany({ where: { id, courseId: spaceId }, data: { position: i + 1 } })));
  return new NextResponse(null, { status: 204 });
}
