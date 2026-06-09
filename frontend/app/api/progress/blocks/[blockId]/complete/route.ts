import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const user = await requireUser();
  const { blockId } = await params;
  const { enrollment_id } = await req.json() as { enrollment_id: string };
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollment_id } });
  if (!enrollment || enrollment.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.enrollment.update({ where: { id: enrollment_id }, data: { currentBlockId: blockId } });
  return new NextResponse(null, { status: 204 });
}
