import "server-only";
import { requireUser } from "@/shared/auth/current-user";
import { prisma } from "@/shared/db/client";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: enrollmentId } = await params;
  const { block_id } = await req.json() as { block_id: string };
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { currentBlockId: block_id } });
  return new NextResponse(null, { status: 204 });
}
