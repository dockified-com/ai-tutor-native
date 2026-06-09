import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { name, description } = await req.json() as { name: string; description?: string };
  const course = await prisma.course.create({
    data: { creatorId: user.id, title: name, description: description ?? null, sourcePdfUrl: "", code: generateCode() },
  });
  return NextResponse.json({ space: { id: course.id, name: course.title, description: course.description, share_code: course.code ?? "", owner_name: user.displayName, progress_pct: null } }, { status: 201 });
}
