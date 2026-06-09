import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  const courses = await prisma.course.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(courses.map(c => ({
    id: c.id, name: c.title ?? "Untitled", description: c.description ?? null,
    share_code: c.code ?? "", owner_name: user.displayName, progress_pct: null,
  })));
}
