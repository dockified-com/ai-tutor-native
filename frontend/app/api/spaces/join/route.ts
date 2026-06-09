import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await requireUser();
  const { code } = await req.json() as { code: string };
  const course = await prisma.course.findFirst({ where: { code } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    create: { userId: user.id, courseId: course.id },
    update: {},
  });
  return NextResponse.json({ space: { id: enrollment.id, course_id: course.id, name: course.title, description: course.description, share_code: course.code ?? "", owner_name: null, progress_pct: null } }, { status: 201 });
}
